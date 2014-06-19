#!/bin/bash
virtualenv python-api
source python-api/bin/activate
cd python-api
pip install -r requirements.txt