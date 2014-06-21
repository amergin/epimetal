from geventwebsocket.handler import WebSocketHandler
from gevent.pywsgi import WSGIServer
from flask import Flask, request, render_template

app = Flask(__name__)


sockets = Sockets(app)

@sockets.route('/echo')
def echo_socket(ws):
	while True:
		message = ws.receive()
		ws.send(message)

@app.route('/echo', methods=['GET'])
def echo_test():
	return render_template('echo_test.html')