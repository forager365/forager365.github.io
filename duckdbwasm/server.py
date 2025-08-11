#!/usr/bin/env python3
import http.server
import socketserver
import os
from urllib.parse import unquote

class DuckDBWASMHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        # Remove restrictive headers for now to allow module loading
        
        # Set proper MIME types for WASM and JS files
        if self.path.endswith('.wasm'):
            self.send_header('Content-Type', 'application/wasm')
            # Add additional headers for WASM
            self.send_header('Cache-Control', 'no-cache')
        elif self.path.endswith('.js') or self.path.endswith('.mjs'):
            self.send_header('Content-Type', 'application/javascript')
        elif self.path.endswith('.worker.js'):
            self.send_header('Content-Type', 'application/javascript')
        
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

if __name__ == "__main__":
    PORT = 8080
    Handler = DuckDBWASMHandler

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        print("Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")