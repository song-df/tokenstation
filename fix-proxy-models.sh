#!/bin/bash
# 修复生产 models.py — 增加 hy2_port 和 banned_until 列
# 用法: 复制到生产执行或通过 SSH 管道
set -e
BACKUP="/www/wwwroot/ai.aiotedu.cc/api/models.py.bak-$(date +%Y%m%d-%H%M%S)"
cp /www/wwwroot/ai.aiotedu.cc/api/models.py "$BACKUP"
echo "备份: $BACKUP"

sed -i '/canceled_at = Column(DateTime, nullable=True)/a\    hy2_port = Column(Integer, nullable=True)\n    banned_until = Column(DateTime, nullable=True)' /www/wwwroot/ai.aiotedu.cc/api/models.py

echo "=== 修改验证 ==="
grep -A4 'canceled_at' /www/wwwroot/ai.aiotedu.cc/api/models.py

systemctl restart llm-gateway && echo "重启 OK"

sleep 2
echo "=== 测试代理接口 ==="
curl -s http://localhost:8001/api/proxy/status -H "New-Api-User: 60" | python3 -m json.tool 2>/dev/null | head -20
