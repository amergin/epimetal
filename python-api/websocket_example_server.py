from flask import Flask
from flask_sockets import Sockets
from config import Config

app = Flask(__name__)
sockets = Sockets(app)
config = Config('setup.config')

@sockets.route('/echo')
def echo_socket(ws):
	while True:
		message = ws.receive()
		ws.send(message)

@app.route('/echo', methods=['GET'])
def echo_test():
	return render_template('echo_test.html')

#if __name__ == '__main__':
	#app.run(host=config.getFlaskVar('host'), port=int(config.getFlaskVar('sockets_port')), debug=True)	