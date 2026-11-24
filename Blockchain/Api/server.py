"""
ChainForge HTTP API  (pure Python standard library - no Flask / FastAPI needed)

    python -m Blockchain.Api.server            -> http://127.0.0.1:8765
    python -m Blockchain.Api.server --port 9000
"""
import argparse
import json
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from Blockchain.Api import services as svc


class Handler(BaseHTTPRequestHandler):
    server_version = "ChainForgeAPI/1.0"

    # ----- helpers
    def _send(self, code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if not length:
            return {}
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except ValueError:
            raise svc.ApiError("Request body must be valid JSON")

    def log_message(self, fmt, *args):           # keep the console clean
        if not str(args[0]).startswith(("GET /api/status", "GET /api/health")):
            print(f"[api] {self.command} {self.path} -> {args[1]}")

    # ----- routing
    def _route(self, method):
        path = self.path.split("?")[0].rstrip("/")
        try:
            if method == "GET":
                if path in ("", "/"):
                    return {"app": "chainforge", "message": "The API is running. Open the website at http://localhost:3000",
                            "endpoints": ["/api/health", "/api/status", "/api/blocks", "/api/wallets", "/api/mempool", "/api/validate"]}
                if path == "/favicon.ico":
                    return {}
                if path == "/api/health":
                    return {"ok": True, "app": "chainforge"}
                if path == "/api/status":
                    return svc.status()
                if path == "/api/blocks":
                    return svc.blocks()
                m = re.fullmatch(r"/api/blocks/(\d+)", path)
                if m:
                    return svc.block_detail(int(m.group(1)))
                if path == "/api/validate":
                    return svc.validate()
                if path == "/api/wallets":
                    return svc.wallets()
                if path == "/api/mempool":
                    return svc.mempool()
            if method == "POST":
                body = self._body()
                if path == "/api/mine":
                    return svc.mine(body.get("miner"))
                if path == "/api/wallets":
                    return svc.new_wallet()
                if path == "/api/send":
                    return svc.send(body.get("from", ""), body.get("to", ""), body.get("amount"))
                if path == "/api/reset":
                    return svc.reset()
            raise svc.ApiError(f"No such endpoint: {method} {path}", 404)
        except svc.ApiError:
            raise
        except Exception as exc:                  # never crash the server
            raise svc.ApiError(f"Server error: {exc}", 500)

    def _handle(self, method):
        try:
            self._send(200, self._route(method))
        except svc.ApiError as err:
            self._send(err.status, {"error": err.message})

    def do_GET(self):
        self._handle("GET")

    def do_POST(self):
        self._handle("POST")

    def do_OPTIONS(self):
        self._send(204, {})


def main():
    parser = argparse.ArgumentParser(description="ChainForge API")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    svc.status()      # makes sure Data/ and the genesis block exist
    httpd = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"ChainForge API running on http://{args.host}:{args.port}   (Ctrl+C to stop)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
