#!/bin/bash
source bin/activate && pip freeze > requirements.txt
deactivate
