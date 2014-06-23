#!/bin/bash
gunicorn -w 5 --log-level debug --error-logfile err.log --access-logfile access.log -b 127.0.0.1:8080 server:app