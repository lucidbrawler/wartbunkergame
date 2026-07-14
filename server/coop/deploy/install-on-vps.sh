#!/usr/bin/env bash
# Install co-op sidecar on the defitestnet VPS (217.216.94.146).
# Runs beside the existing node/nginx stack — does NOT touch inventory or node binaries.
set -euo pipefail

INSTALL_DIR="/opt/wartbunker-coop"
SERVICE_NAME="wartbunker-coop"
BINARY_SRC="${1:-/tmp/coop-server-linux-amd64}"
NGINX_SNIPPET_SRC="${2:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/nginx-coop-snippet.conf}"

if [[ ! -f "$BINARY_SRC" ]]; then
  echo "Usage: sudo bash install-on-vps.sh [/path/to/coop-server-linux-amd64] [nginx-coop-snippet.conf]"
  exit 1
fi

sudo mkdir -p "$INSTALL_DIR"
sudo cp "$BINARY_SRC" "$INSTALL_DIR/coop-server"
sudo chmod 755 "$INSTALL_DIR/coop-server"

if ! id warthog &>/dev/null; then
  sudo useradd --system --no-create-home --shell /usr/sbin/nologin warthog || true
fi
sudo chown -R warthog:warthog "$INSTALL_DIR"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
sudo cp "$SCRIPT_DIR/wartbunker-coop.service" "/etc/systemd/system/${SERVICE_NAME}.service"
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"

echo ""
echo "=== Co-op service ==="
sudo systemctl --no-pager status "$SERVICE_NAME" || true
curl -fsS "http://127.0.0.1:8765/health" && echo ""

echo ""
echo "=== Nginx (manual step) ==="
echo "Add the following to your warthog-defitestnet.duckdns.org server block:"
echo "  (snippet file: $NGINX_SNIPPET_SRC)"
echo ""
cat "$NGINX_SNIPPET_SRC"
echo ""
echo "Then: sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "Production WebSocket URL for the game:"
echo "  wss://warthog-defitestnet.duckdns.org/coop/ws"