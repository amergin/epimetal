# Python API for Plotter

## Installation

```bash
cd plotter
virtualenv python-api
source python-api/bin/activate
cd python-api
pip install -r requirements.txt

```

The API utilizes MongoDB as its database. It must be installed and its port and hostname added to configuration files.

------------------------------------------

## Running services

The services consist of three types of listener services: Ajax HTTP request API, WebSocket API and ZMQ services. 

ZMQ services implement and return SOM computations, and they are called from the WebSocket API. They are to be run in a trusted environment, e.g. localhost only.

In production use, run the gunicorn services behind a proper proxy server, such as [Nginx](http://gunicorn-docs.readthedocs.org/en/latest/deploy.html).

### HTTP API & Web Socket service

* An example on how to deploy HTTP API on gunicorn is at `start_server.sh`
* WebSocket server example: `start_websocket_server.sh`

### Melikerion ZMQ Service

Consists of two listeners: `som_listener.py` and `plane_listener.py`