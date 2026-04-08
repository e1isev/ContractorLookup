import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class AppHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/healthz':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain; charset=utf-8')
            self.end_headers()
            self.wfile.write(b'ok')
            return

        if self.path in ('', '/'):
            self.path = '/index.html'

        # Serve known static files normally; SPA-style fallback to index.html otherwise.
        requested = self.path.lstrip('/')
        if requested and not os.path.exists(requested):
            self.path = '/index.html'

        return super().do_GET()


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '8080'))
    server = ThreadingHTTPServer(('', port), AppHandler)
    print(f'ContractorLookup listening on port {port}')
    server.serve_forever()
