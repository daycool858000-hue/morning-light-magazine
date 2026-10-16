#!/usr/bin/env bash
# Codespace 每次啟動時執行：建置第二批測試預覽（dist-qa）並在背景提供於 4173 連接埠。
# 預覽網址寫入 qa-preview-url.txt（不提交到 Git），方便在 Codespace 內複製。
set -e
cd "$(dirname "$0")/.."
node scripts/build.mjs --mode=qa --out=dist-qa > /tmp/qa-build.log 2>&1
# 停掉上一次啟動的預覽（以 PID 檔辨識，避免誤殺其他程序）
if [ -f /tmp/qa-preview.pid ]; then kill "$(cat /tmp/qa-preview.pid)" 2>/dev/null || true; fi
setsid nohup node scripts/serve.mjs dist-qa > /tmp/qa-preview.log 2>&1 < /dev/null &
echo $! > /tmp/qa-preview.pid
if [ -n "$CODESPACE_NAME" ] && [ -n "$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN" ]; then
  echo "https://${CODESPACE_NAME}-4173.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/index.html" > qa-preview-url.txt
fi
echo "第二批測試預覽已啟動（連接埠 4173，私人）。"
