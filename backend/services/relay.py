from __future__ import annotations
import json
import re
import httpx
import uuid
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import Channel, ModelConfig, RequestLog


# ── Shared HTTP client ──
# One keep-alive connection pool (+ HTTP/2) reused across all requests, so we
# don't redo a TCP+TLS handshake to the upstream on every call. connect=5s lets
# a stuck upstream fail fast; read=180s covers long generations.

_limits = httpx.Limits(
    max_connections=100,
    max_keepalive_connections=20,
    keepalive_expiry=30.0,
)
_timeout = httpx.Timeout(connect=5.0, read=180.0, write=10.0, pool=5.0)
_client = httpx.AsyncClient(limits=_limits, timeout=_timeout, http2=True)


async def aclose_client() -> None:
    """Close the shared client; call on app shutdown."""
    await _client.aclose()


def _apply_openrouter_routing(channel: Channel, body: dict) -> None:
    """Ask OpenRouter to prefer the lowest-latency backend provider."""
    if "openrouter" in (channel.base_url or "").lower():
        body.setdefault("provider", {"sort": "latency"})


# ── Model name mapping (native Anthropic -> OpenRouter) ──

_MODEL_MAP = {
    "claude-sonnet-4-20250514": "anthropic/claude-sonnet-4.6",
    "claude-sonnet-4-6": "anthropic/claude-sonnet-4.6",
    "claude-opus-4-20250514": "anthropic/claude-opus-4.7",
    "claude-opus-4-8": "anthropic/claude-opus-4.8",
    "claude-haiku-4-20250514": "anthropic/claude-haiku-4.5",
    "claude-haiku-4-5": "anthropic/claude-haiku-4.5",
}

def _map_model(name: str) -> str:
    return _MODEL_MAP.get(name, name)


# ── Model name normalization ──
# Agent tools often append context-window size (e.g. claude-opus-4-8[1M]).
# Strip it so lookups and mappings work correctly.

_CTX_SUFFIX_RE = re.compile(r'\[(\d+[kKmM])\]$')


def normalize_model_name(name: str) -> str:
    """Strip trailing context-window annotation like [1M] or [200k] from model name."""
    return _CTX_SUFFIX_RE.sub('', name)



def _check_response_error(data: dict, response_status: int) -> str:
    """Check for error in response body (some APIs return 200 with error)."""
    err = data.get("error") or data.get("errors")
    if err:
        if isinstance(err, dict):
            return err.get("message", str(err))
        if isinstance(err, list) and len(err) > 0:
            return str(err[0].get("message", err[0]) if isinstance(err[0], dict) else err[0])
        return str(err)
    if response_status >= 400:
        return data.get("detail", f"HTTP {response_status}")
    return ""

async def find_channel(db: AsyncSession, model_name: str) -> Channel | None:
    result = await db.execute(
        select(Channel)
        .where(Channel.is_active == True, Channel.models.contains(model_name))
        .order_by(Channel.priority.desc())
    )
    return result.scalar_one_or_none()


# ── Mapped lookups (try _MODEL_MAP fallback when direct match fails) ──

async def find_model_config_mapped(db: AsyncSession, model_name: str) -> ModelConfig | None:
    """find_model_config with _MODEL_MAP fallback."""
    mc = await find_model_config(db, model_name)
    if mc:
        return mc
    mapped = _map_model(model_name)
    if mapped != model_name:
        return await find_model_config(db, mapped)
    return None


async def find_channel_mapped(db: AsyncSession, model_name: str) -> Channel | None:
    """find_channel with _MODEL_MAP fallback."""
    ch = await find_channel(db, model_name)
    if ch:
        return ch
    mapped = _map_model(model_name)
    if mapped != model_name:
        return await find_channel(db, mapped)
    return None


async def find_model_config(db: AsyncSession, model_name: str) -> ModelConfig | None:
    result = await db.execute(
        select(ModelConfig)
        .where(ModelConfig.model_name == model_name, ModelConfig.is_active == True)
    )
    return result.scalar_one_or_none()


def calculate_cost(mc: ModelConfig, prompt: int, completion: int) -> float:
    return (prompt / 1000) * mc.input_price + (completion / 1000) * mc.output_price


def _make_error_log(db, user_id, model, prompt, completion, cost, message):
    log = RequestLog(
        user_id=user_id, model=model,
        prompt_tokens=prompt, completion_tokens=completion,
        cost=cost, success=False, error_message=message,
    )
    db.add(log)


# ── OpenAI-compatible relay ──

async def relay_openai(
    db: AsyncSession, channel: Channel, body: dict,
    model_config: ModelConfig, user_id: int,
) -> tuple[dict, float]:
    body["model"] = _map_model(body.get("model", ""))
    _apply_openrouter_routing(channel, body)
    url = f"{channel.base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {channel.api_key}",
        "Content-Type": "application/json",
    }
    response = await _client.post(url, json=body, headers=headers)
    try:
        data = response.json()
    except Exception:
        data = {"error": {"message": "Upstream returned invalid response"}}
    usage = data.get("usage", {})
    pt = usage.get("prompt_tokens", 0)
    ct = usage.get("completion_tokens", 0)
    cost = calculate_cost(model_config, pt, ct)
    err_msg = _check_response_error(data, response.status_code)
    success = response.status_code == 200 and not err_msg
    log = RequestLog(
        user_id=user_id, model=body.get("model", ""),
        prompt_tokens=pt, completion_tokens=ct,
        cost=cost, success=success,
        error_message=err_msg,
    )
    db.add(log)
    await db.flush()
    if not success:
        raise Exception(err_msg or "Upstream error")
    return data, cost


async def relay_openai_stream(
    db: AsyncSession, channel: Channel, body: dict,
    model_config: ModelConfig, user_id: int,
) -> AsyncGenerator[str, None]:
    body["model"] = _map_model(body.get("model", ""))
    _apply_openrouter_routing(channel, body)
    url = f"{channel.base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {channel.api_key}",
        "Content-Type": "application/json",
    }
    body["stream"] = True
    pt = 0
    ct = 0
    final_model = body.get("model", "")
    async with _client.stream("POST", url, json=body, headers=headers) as resp:
        async for line in resp.aiter_lines():
            if not line:
                continue
            if line.startswith("data: "):
                ds = line[6:]
                if ds == "[DONE]":
                    yield "data: [DONE]\n\n"
                    break
                try:
                    chunk = json.loads(ds)
                    u = chunk.get("usage")
                    if u:
                        pt = u.get("prompt_tokens", 0)
                        ct = u.get("completion_tokens", 0)
                    yield f"data: {ds}\n\n"
                except json.JSONDecodeError:
                    yield f"data: {ds}\n\n"
    cost = calculate_cost(model_config, pt, ct)
    log = RequestLog(
        user_id=user_id, model=final_model,
        prompt_tokens=pt, completion_tokens=ct,
        cost=cost, success=True,
    )
    db.add(log)
    await db.flush()


# ── Anthropic relay ──

def _openai_to_anthropic(body: dict) -> dict:
    """Convert OpenAI chat completion request to Anthropic Messages request."""
    messages = body.get("messages", [])
    system = None
    anthropic_messages = []
    for msg in messages:
        role = msg.get("role")
        content = msg.get("content", "")
        if role == "system":
            if system is None:
                system = ""
            system += content + "\n"
        elif role in ("user", "assistant"):
            anthropic_messages.append({"role": role, "content": content})

    req = {
        "model": body.get("model", ""),
        "max_tokens": body.get("max_tokens", 4096),
        "messages": anthropic_messages,
    }
    if system:
        req["system"] = system.strip()
    if "temperature" in body:
        req["temperature"] = body["temperature"]
    if "top_p" in body:
        req["top_p"] = body["top_p"]
    return req


def _anthropic_to_openai_response(anthropic_data: dict, model_name: str) -> dict:
    """Convert Anthropic response to OpenAI-compatible format."""
    text = ""
    for block in anthropic_data.get("content", []):
        if block.get("type") == "text":
            text += block.get("text", "")
    usage = anthropic_data.get("usage", {})
    return {
        "id": anthropic_data.get("id", f"msg_{uuid.uuid4().hex[:12]}"),
        "object": "chat.completion",
        "model": model_name,
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": text},
            "finish_reason": anthropic_data.get("stop_reason", "stop"),
        }],
        "usage": {
            "prompt_tokens": usage.get("input_tokens", 0),
            "completion_tokens": usage.get("output_tokens", 0),
            "total_tokens": usage.get("input_tokens", 0) + usage.get("output_tokens", 0),
        },
    }


async def relay_anthropic(
    db: AsyncSession, channel: Channel, body: dict,
    model_config: ModelConfig, user_id: int,
) -> tuple[dict, float]:
    body["model"] = _map_model(body.get("model", ""))
    url = f"{channel.base_url.rstrip('/')}/messages"
    anthropic_body = _openai_to_anthropic(body)
    headers = {
        "x-api-key": channel.api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    response = await _client.post(url, json=anthropic_body, headers=headers)
    try:
        ant_data = response.json()
    except Exception:
        ant_data = {"error": {"message": "Upstream returned invalid response"}}
    success = response.status_code == 200
    usage = ant_data.get("usage", {}) if success else {}
    pt = usage.get("input_tokens", 0)
    ct = usage.get("output_tokens", 0)
    cost = calculate_cost(model_config, pt, ct)
    log = RequestLog(
        user_id=user_id, model=body.get("model", ""),
        prompt_tokens=pt, completion_tokens=ct,
        cost=cost, success=success,
        error_message="" if success else ant_data.get("error", {}).get("message", str(ant_data)),
    )
    db.add(log)
    await db.flush()
    if not success:
        raise Exception(ant_data.get("error", {}).get("message", "Upstream error"))
    return _anthropic_to_openai_response(ant_data, body.get("model", "")), cost


async def relay_anthropic_stream(
    db: AsyncSession, channel: Channel, body: dict,
    model_config: ModelConfig, user_id: int,
) -> AsyncGenerator[str, None]:
    body["model"] = _map_model(body.get("model", ""))
    url = f"{channel.base_url.rstrip('/')}/messages"
    anthropic_body = _openai_to_anthropic(body)
    anthropic_body["stream"] = True
    headers = {
        "x-api-key": channel.api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    rid = f"chatcmpl-{uuid.uuid4().hex[:12]}"
    model_name = body.get("model", "")
    pt = 0
    ct = 0
    accumulated_text = ""
    async with _client.stream("POST", url, json=anthropic_body, headers=headers) as resp:
        async for line in resp.aiter_lines():
            if not line:
                continue
            if line.startswith("data: "):
                ds = line[6:]
                try:
                    event = json.loads(ds)
                    etype = event.get("type", "")
                except json.JSONDecodeError:
                    continue
                if etype == "content_block_delta":
                    delta = event.get("delta", {})
                    text = delta.get("text", "")
                    accumulated_text += text
                    chunk = {
                        "id": rid, "object": "chat.completion.chunk",
                        "model": model_name,
                        "choices": [{"index": 0, "delta": {"content": text}, "finish_reason": None}],
                    }
                    yield f"data: {json.dumps(chunk)}\n\n"
                elif etype == "message_delta":
                    usage = event.get("usage", {})
                    pt = usage.get("input_tokens", 0)
                    ct = usage.get("output_tokens", 0)
                elif etype == "message_stop":
                    # Send final chunk with finish_reason
                    chunk = {
                        "id": rid, "object": "chat.completion.chunk",
                        "model": model_name,
                        "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
                    }
                    yield f"data: {json.dumps(chunk)}\n\n"
                    yield "data: [DONE]\n\n"
    cost = calculate_cost(model_config, pt, ct)
    log = RequestLog(
        user_id=user_id, model=model_name,
        prompt_tokens=pt, completion_tokens=ct,
        cost=cost, success=True,
    )
    db.add(log)
    await db.flush()



# ── Anthropic native passthrough ──

async def relay_anthropic_passthrough(
    db: AsyncSession, channel: Channel, body: dict,
    model_config: ModelConfig, user_id: int,
) -> tuple[dict, float]:
    """Forward an already-Anthropic-format request directly."""
    body["model"] = _map_model(body.get("model", ""))
    url = f"{channel.base_url.rstrip('/')}/messages"
    headers = {
        "x-api-key": channel.api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    response = await _client.post(url, json=body, headers=headers)
    try:
        data = response.json()
    except Exception:
        data = {"error": {"message": "Upstream returned invalid response"}}
    success = response.status_code == 200
    usage = data.get("usage", {}) if success else {}
    pt = usage.get("input_tokens", 0)
    ct = usage.get("output_tokens", 0)
    cost = calculate_cost(model_config, pt, ct)
    err_msg = "" if success else data.get("error", {}).get("message", str(data))
    log = RequestLog(
        user_id=user_id, model=body.get("model", ""),
        prompt_tokens=pt, completion_tokens=ct,
        cost=cost, success=success,
        error_message=err_msg,
    )
    db.add(log)
    await db.flush()
    if not success:
        raise Exception(err_msg or "Upstream error")
    return data, cost


async def relay_anthropic_passthrough_stream(
    db: AsyncSession, channel: Channel, body: dict,
    model_config: ModelConfig, user_id: int,
) -> AsyncGenerator[str, None]:
    """Forward an already-Anthropic-format streaming request, passing SSE events through."""
    body["model"] = _map_model(body.get("model", ""))
    url = f"{channel.base_url.rstrip('/')}/messages"
    headers = {
        "x-api-key": channel.api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    body["stream"] = True
    model_name = body.get("model", "")
    pt = 0
    ct = 0

    # Buffer: we need to intercept usage from message_start/message_delta events
    # but still pass them through to the client
    async with _client.stream("POST", url, json=body, headers=headers) as resp:
        current_event = None
        async for line in resp.aiter_lines():
            if line == "":
                if current_event is not None:
                    yield f"event: {current_event}\n"
                    current_event = None
                yield "\n"
                continue
            if line.startswith("event: "):
                current_event = line[7:]
                yield line + "\n"
                continue
            if line.startswith("data: "):
                ds = line[6:]
                try:
                    event_data = json.loads(ds)
                    etype = event_data.get("type", "")
                    if etype == "message_start":
                        u = event_data.get("message", {}).get("usage", {})
                        pt = u.get("input_tokens", 0)
                    elif etype == "message_delta":
                        u = event_data.get("usage", {})
                        ct_out = u.get("output_tokens", 0)
                        if ct_out > ct:
                            ct = ct_out
                except json.JSONDecodeError:
                    pass
                yield line + "\n"
                continue
            yield line + "\n"

    cost = calculate_cost(model_config, pt, ct)
    log = RequestLog(
        user_id=user_id, model=model_name,
        prompt_tokens=pt, completion_tokens=ct,
        cost=cost, success=True,
    )
    db.add(log)
    await db.flush()


def _anthropic_to_openai_body(ant_body: dict) -> dict:
    """Convert Anthropic Messages request to OpenAI Chat Completions request."""
    messages = []
    system = ant_body.get("system", "")
    if system:
        if isinstance(system, list):
            # system as content blocks: [{"type": "text", "text": "..."}]
            parts = []
            for block in system:
                if isinstance(block, dict) and block.get("type") == "text":
                    parts.append(block.get("text", ""))
            system = "\n".join(parts)
        if isinstance(system, str) and system.strip():
            messages.append({"role": "system", "content": system.strip()})
    for msg in ant_body.get("messages", []):
        role = msg.get("role")
        content = msg.get("content", "")
        if isinstance(content, list):
            # Handle multi-part content blocks
            text_parts = []
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    text_parts.append(block.get("text", ""))
            content = "\n".join(text_parts)
        messages.append({"role": role, "content": content})

    req = {
        "model": ant_body.get("model", ""),
        "messages": messages,
        "max_tokens": ant_body.get("max_tokens", 4096),
    }
    if "temperature" in ant_body:
        req["temperature"] = ant_body["temperature"]
    if "top_p" in ant_body:
        req["top_p"] = ant_body["top_p"]
    if "stop_sequences" in ant_body:
        req["stop"] = ant_body["stop_sequences"]
    return req


def _openai_response_to_anthropic(oa_data: dict, model_name: str) -> dict:
    """Convert OpenAI Chat Completions response to Anthropic Messages response."""
    choice = oa_data.get("choices", [{}])[0]
    msg = choice.get("message", {})
    content_text = msg.get("content", "")
    usage = oa_data.get("usage", {})
    return {
        "id": oa_data.get("id", "msg_unknown"),
        "model": model_name,
        "type": "message",
        "role": "assistant",
        "content": [{"type": "text", "text": content_text}],
        "stop_reason": "end_turn",
        "usage": {
            "input_tokens": usage.get("prompt_tokens", 0),
            "output_tokens": usage.get("completion_tokens", 0),
        },
    }


async def relay_anthropic_via_openai(
    db: AsyncSession, channel: Channel, body: dict,
    model_config: ModelConfig, user_id: int,
) -> tuple[dict, float]:
    """Bridge: receive Anthropic request, translate to OpenAI, forward, translate back."""
    body["model"] = _map_model(body.get("model", ""))
    oa_body = _anthropic_to_openai_body(body)
    _apply_openrouter_routing(channel, oa_body)
    url = f"{channel.base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {channel.api_key}",
        "Content-Type": "application/json",
    }
    response = await _client.post(url, json=oa_body, headers=headers)
    try:
        oa_data = response.json()
    except Exception:
        oa_data = {"error": {"message": "Upstream returned invalid response"}}
    success = response.status_code == 200
    usage = oa_data.get("usage", {}) if success else {}
    pt = usage.get("prompt_tokens", 0)
    ct = usage.get("completion_tokens", 0)
    cost = calculate_cost(model_config, pt, ct)
    log = RequestLog(
        user_id=user_id, model=body.get("model", ""),
        prompt_tokens=pt, completion_tokens=ct,
        cost=cost, success=success,
        error_message="" if success else oa_data.get("error", {}).get("message", str(oa_data)),
    )
    db.add(log)
    await db.flush()
    if not success:
        raise Exception(oa_data.get("error", {}).get("message", "Upstream error"))
    return _openai_response_to_anthropic(oa_data, body.get("model", "")), cost


async def relay_anthropic_via_openai_stream(
    db: AsyncSession, channel: Channel, body: dict,
    model_config: ModelConfig, user_id: int,
) -> AsyncGenerator[str, None]:
    """Bridge: receive Anthropic streaming request, translate to OpenAI SSE, proxy SSE, convert to Anthropic SSE."""
    body["model"] = _map_model(body.get("model", ""))
    oa_body = _anthropic_to_openai_body(body)
    _apply_openrouter_routing(channel, oa_body)
    oa_body["stream"] = True
    url = f"{channel.base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {channel.api_key}",
        "Content-Type": "application/json",
    }
    model_name = body.get("model", "")
    rid = oa_body.get("model", "") + "-" + uuid.uuid4().hex[:8]
    pt = 0
    ct = 0
    accumulated_text = ""

    # Send Anthropic message_start
    yield f"event: message_start\ndata: {json.dumps({'type': 'message_start', 'message': {'id': rid, 'type': 'message', 'role': 'assistant', 'model': model_name, 'content': [], 'usage': {'input_tokens': 0}}})}\n\n"
    yield f"event: content_block_start\ndata: {json.dumps({'type': 'content_block_start', 'index': 0, 'content_block': {'type': 'text', 'text': ''}})}\n\n"

    async with _client.stream("POST", url, json=oa_body, headers=headers) as resp:
        async for line in resp.aiter_lines():
            if not line:
                continue
            if line.startswith("data: "):
                ds = line[6:]
                if ds == "[DONE]":
                    break
                try:
                    chunk = json.loads(ds)
                    u = chunk.get("usage")
                    if u:
                        pt = u.get("prompt_tokens", 0)
                        ct = u.get("completion_tokens", 0)
                    delta = chunk.get("choices", [{}])[0].get("delta", {})
                    text = delta.get("content", "")
                    if text:
                        accumulated_text += text
                        delta_event = json.dumps({
                            "type": "content_block_delta",
                            "index": 0,
                            "delta": {"type": "text_delta", "text": text},
                        })
                        yield f"event: content_block_delta\ndata: {delta_event}\n\n"
                except json.JSONDecodeError:
                    pass

    yield f"event: content_block_stop\ndata: {json.dumps({'type': 'content_block_stop', 'index': 0})}\n\n"
    yield f"event: message_delta\ndata: {json.dumps({'type': 'message_delta', 'delta': {'stop_reason': 'end_turn'}, 'usage': {'input_tokens': pt, 'output_tokens': ct}})}\n\n"
    yield f"event: message_stop\ndata: {json.dumps({'type': 'message_stop'})}\n\n"

    cost = calculate_cost(model_config, pt, ct)
    log = RequestLog(
        user_id=user_id, model=model_name,
        prompt_tokens=pt, completion_tokens=ct,
        cost=cost, success=True,
    )
    db.add(log)
    await db.flush()

# ── Dispatcher ──

async def relay_chat_completion(
    db: AsyncSession, channel: Channel, body: dict,
    model_config: ModelConfig, user_id: int,
) -> tuple[dict, float]:
    if channel.provider == "anthropic":
        return await relay_anthropic(db, channel, body, model_config, user_id)
    return await relay_openai(db, channel, body, model_config, user_id)


async def relay_chat_completion_stream(
    db: AsyncSession, channel: Channel, body: dict,
    model_config: ModelConfig, user_id: int,
) -> AsyncGenerator[str, None]:
    if channel.provider == "anthropic":
        async for chunk in relay_anthropic_stream(db, channel, body, model_config, user_id):
            yield chunk
        return
    async for chunk in relay_openai_stream(db, channel, body, model_config, user_id):
        yield chunk
