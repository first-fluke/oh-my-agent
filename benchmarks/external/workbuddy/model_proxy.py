#!/usr/bin/env python3
"""Allow only OpenAI model CONNECT traffic from isolated Security containers."""
import select
import socket
import socketserver


class ModelProxy(socketserver.StreamRequestHandler):
    def handle(self):
        request = self.rfile.readline(8192).decode("ascii", errors="replace").strip().split()
        if len(request) != 3:
            return
        method, target, _ = request
        for _ in range(100):
            if self.rfile.readline(8192) in (b"\r\n", b"\n", b""):
                break
        else:
            return
        host, _, port = target.rpartition(":")
        allowed = host in {"chatgpt.com", "api.openai.com", "auth.openai.com"} or host.endswith(".chatgpt.com")
        if method != "CONNECT" or port != "443" or not allowed:
            self.wfile.write(b"HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n")
            return
        try:
            remote = socket.create_connection((host, 443), timeout=30)
        except OSError:
            self.wfile.write(b"HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\n\r\n")
            return
        self.wfile.write(b"HTTP/1.1 200 Connection Established\r\n\r\n")
        self.wfile.flush()
        with remote:
            while True:
                ready, _, _ = select.select([self.connection, remote], [], [], 180)
                if not ready:
                    return
                for source in ready:
                    data = source.recv(65536)
                    if not data:
                        return
                    (remote if source is self.connection else self.connection).sendall(data)


class ProxyServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    with ProxyServer(("0.0.0.0", 8888), ModelProxy) as server:
        server.serve_forever()
