#!/usr/bin/env python3
"""Serve this folder on http://localhost:8000.

Opening index.html straight from disk works for most of the toolbox, but a
handful of tools (anything using WebCrypto, such as SHA-384/512 and HMAC) need
a real http:// origin. Run this and use the printed URL to get everything.

    python3 serve.py            # port 8000
    python3 serve.py 3000       # a different port
"""

import functools
import http.server
import os
import socketserver
import sys
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".json": "application/json",
        ".wasm": "application/wasm",
        ".webmanifest": "application/manifest+json",
    }

    def end_headers(self):
        # Always serve the freshest copy while developing.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("  %s\n" % (fmt % args))


def main():
    args = [a for a in sys.argv[1:] if a != "--no-browser"]
    port = int(args[0]) if args else 8000
    handler = functools.partial(Handler, directory=ROOT)

    class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
        daemon_threads = True
        allow_reuse_address = True
        request_queue_size = 128

    with Server(("0.0.0.0", port), handler) as httpd:
        url = "http://localhost:%d/" % port
        print("All The Tools is running on port %d (all interfaces)." % port)
        print("Local: %s" % url)
        print("Serving %s — press Ctrl+C to stop." % ROOT)
        if "--no-browser" not in sys.argv:
            try:
                webbrowser.open(url)
            except Exception:
                pass
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
