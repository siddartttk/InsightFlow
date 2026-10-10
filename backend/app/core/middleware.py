"""Bound upload bodies before multipart parsing, including chunked requests."""
from starlette.responses import JSONResponse


class RequestLimits:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            return await self.app(scope, receive, send)
        async def private_send(message):
            if message['type'] == 'http.response.start':
                message['headers'] = list(message.get('headers', [])) + [(b'cache-control', b'no-store'), (b'x-content-type-options', b'nosniff')]
            await send(message)
        if scope['path'] == '/api/upload' and scope['method'] == 'POST':
            limit = 5 * 1024 * 1024 + 64 * 1024
            headers = dict(scope['headers'])
            try:
                declared = int(headers.get(b'content-length', b'0'))
            except ValueError:
                return await JSONResponse({'detail': 'Invalid request length.'}, status_code=400)(scope, receive, private_send)
            if declared > limit:
                return await JSONResponse({'detail': 'CSV files must be 5 MB or smaller.'}, status_code=413)(scope, receive, private_send)
            messages = []
            length = 0
            while True:
                message = await receive()
                if message['type'] == 'http.disconnect':
                    return
                length += len(message.get('body', b''))
                if length > limit:
                    return await JSONResponse({'detail': 'CSV files must be 5 MB or smaller.'}, status_code=413)(scope, receive, private_send)
                messages.append(message)
                if not message.get('more_body', False):
                    break
            async def buffered_receive():
                if messages:
                    return messages.pop(0)
                return await receive()
            return await self.app(scope, buffered_receive, private_send)
        await self.app(scope, receive, private_send)
