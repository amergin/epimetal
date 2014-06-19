#!/bin/bash
virtualenv --no-site-packages --distribute python-api && source python-api/bin/activate && pip freeze > python-api/requirements.txt
deactivate
