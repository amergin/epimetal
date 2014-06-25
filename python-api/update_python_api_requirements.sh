#!/bin/bash
virtualenv --no-site-packages --distribute python-api && source bin/activate && pip freeze > requirements.txt
deactivate
