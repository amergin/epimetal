#!/bin/bash
gunicorn -w 10 -k flask_sockets.worker --timeout 600 --log-level debug --error-logfile err-ws.log --access-logfile access-ws.log -b 127.0.0.1:6565 server_websocket:app