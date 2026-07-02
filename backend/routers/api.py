from __future__ import annotations
import json
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import User, ModelConfig, RequestLog
from auth import get_current_user
from database import get_db
from services.relay import (
    find_channel_mapped, find_model_config_mapped, normalize_model_name,
    relay_chat_completion, relay_chat_completion_stream,
    relay_anthropic_passthrough, relay_anthropic_passthrough_stream,
    relay_anthropic_via_openai, relay_anthropic_via_openai_stream,
)

router = APIRouter(prefix="/v1", tags=["api"])


@router.get("/models")
async def list_models(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ModelConfig).where(ModelConfig.is_active == True)
        .order_by(ModelConfig.model_name)
    )
    models = result.scalars().all()
    return {
        "object": "list",
        "data": [
            {
                "id": m.model_name,
                "object": "model",
                "owned_by": m.provider or m.model_name.split("/")[0],
            }
            for m in models
        ],
    }


@router.post("/chat/completions")
async def chat_completions(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    body = await request.json()
    model_name = normalize_model_name(body.get("model", ""))
    body["model"] = model_name  # Normalize for downstream relay
    stream = body.get("stream", False)

    if not model_name:
        raise HTTPException(400, "model is required")

    model_config = await find_model_config_mapped(db, model_name)
    if not model_config:
        raise HTTPException(400, f"Model {model_name} is not available")

    channel = await find_channel_mapped(db, model_name)
    if not channel:
        raise HTTPException(500, f"No active channel for model {model_name}")

    if user.quota <= 0:
        raise HTTPException(402, "Insufficient quota, please top up")

    def deduct(cost: float):
        deduction = max(0.01, cost)
        if deduction > 0:
            user.quota = max(0, user.quota - deduction)
            user.used_quota += deduction

    try:
        if stream:
            async def stream_response():
                async for chunk in relay_chat_completion_stream(
                    db, channel, body, model_config, user.id
                ):
                    yield chunk
                result = await db.execute(
                    select(RequestLog).where(
                        RequestLog.user_id == user.id,
                        RequestLog.model == model_name,
                    ).order_by(RequestLog.id.desc()).limit(1)
                )
                log_entry = result.scalar_one_or_none()
                if log_entry:
                    deduct(log_entry.cost)
                    await db.commit()

            return StreamingResponse(
                stream_response(), media_type="text/event-stream"
            )
        else:
            data, cost = await relay_chat_completion(
                db, channel, body, model_config, user.id
            )
            deduct(cost)
            await db.commit()
            return data
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/messages")
async def anthropic_messages(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Anthropic-native Messages API endpoint (for Claude Code etc.)"""
    body = await request.json()
    import logging
    logging.getLogger("uvicorn").info(f"Messages body: {json.dumps(body, ensure_ascii=False)[:500]}")
    model_name = normalize_model_name(body.get("model", ""))
    body["model"] = model_name  # Normalize for downstream relay
    stream = body.get("stream", False)

    if not model_name:
        raise HTTPException(400, "model is required")

    model_config = await find_model_config_mapped(db, model_name)
    if not model_config:
        raise HTTPException(400, f"Model {model_name} is not available")

    channel = await find_channel_mapped(db, model_name)
    if not channel:
        raise HTTPException(500, f"No active channel for model {model_name}")

    if user.quota <= 0:
        raise HTTPException(402, "Insufficient quota, please top up")

    def deduct(cost: float):
        deduction = max(0.01, cost)
        if deduction > 0:
            user.quota = max(0, user.quota - deduction)
            user.used_quota += deduction

    try:
        if channel.provider == "anthropic":
            # Direct Anthropic passthrough
            if stream:
                async def stream_response():
                    async for chunk in relay_anthropic_passthrough_stream(
                        db, channel, body, model_config, user.id
                    ):
                        yield chunk
                    result = await db.execute(
                        select(RequestLog).where(
                            RequestLog.user_id == user.id,
                            RequestLog.model == model_name,
                        ).order_by(RequestLog.id.desc()).limit(1)
                    )
                    log_entry = result.scalar_one_or_none()
                    if log_entry:
                        deduct(log_entry.cost)
                        await db.commit()
                return StreamingResponse(stream_response(), media_type="text/event-stream")
            else:
                data, cost = await relay_anthropic_passthrough(
                    db, channel, body, model_config, user.id
                )
                deduct(cost)
                await db.commit()
                return data
        else:
            # OpenAI-compatible channel (e.g. OpenRouter): translate Anthropic -> OpenAI -> Anthropic
            if stream:
                async def stream_response():
                    async for chunk in relay_anthropic_via_openai_stream(
                        db, channel, body, model_config, user.id
                    ):
                        yield chunk
                    result = await db.execute(
                        select(RequestLog).where(
                            RequestLog.user_id == user.id,
                            RequestLog.model == model_name,
                        ).order_by(RequestLog.id.desc()).limit(1)
                    )
                    log_entry = result.scalar_one_or_none()
                    if log_entry:
                        deduct(log_entry.cost)
                        await db.commit()
                return StreamingResponse(stream_response(), media_type="text/event-stream")
            else:
                data, cost = await relay_anthropic_via_openai(
                    db, channel, body, model_config, user.id
                )
                deduct(cost)
                await db.commit()
                return data
    except Exception as e:
        import traceback, logging
        logger = logging.getLogger("uvicorn")
        logger.error(f"Messages endpoint error: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(500, str(e))


@router.get("/models/anthropic")
async def list_models_anthropic(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return model list in Anthropic-compatible format for Claude Code."""
    result = await db.execute(
        select(ModelConfig).where(ModelConfig.is_active == True)
        .order_by(ModelConfig.model_name)
    )
    models = result.scalars().all()
    # Return anthropic + openrouter models (all Claude-compatible)
    return {
        "data": [
            {"id": m.model_name, "display_name": m.display_name or m.model_name}
            for m in models if m.provider in ("anthropic", "openrouter")
        ]
    }


@router.post("/messages/count_tokens")
async def anthropic_count_tokens(
    request: Request,
    user: User = Depends(get_current_user),
):
    """Minimal token count endpoint for Claude Code compatibility."""
    body = await request.json()
    model_name = body.get("model", "")
    messages = body.get("messages", [])
    total_chars = sum(len(str(m.get("content", ""))) for m in messages)
    system_chars = len(str(body.get("system", "")))
    # Rough estimate: ~4 chars per token for English, ~2 for Chinese
    estimated = max(1, int((total_chars + system_chars) / 4))
    return {"input_tokens": estimated}

