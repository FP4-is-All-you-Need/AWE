"""Serve a build under /AWE/ locally, without SPA fallback."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        path = urlsplit(path).path
        if not path.startswith('/AWE/'):
            return str(Path(self.directory)/'__not_served__')
        return super().translate_path(path[4:])

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    p=argparse.ArgumentParser();p.add_argument('--directory',default='site/dist');p.add_argument('--port',type=int,default=4176)
    a=p.parse_args()
    ThreadingHTTPServer(('127.0.0.1',a.port),partial(Handler,directory=a.directory)).serve_forever()
