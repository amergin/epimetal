from flask import Flask
from flask_sockets import Sockets
from config import Config

from flask.ext.mongoengine import MongoEngine
from orm_models import Sample, Header
import zmq
import os
import json

app = Flask(__name__)
sockets = Sockets(app)
config = Config('setup.config')
app.config.update(
	DEBUG=True,
	SECRET_KEY=os.urandom(24),
	MONGODB_SETTINGS= {
	'DB': config.getMongoVar('db'),
	'HOST': config.getMongoVar('host'),
	'PORT': int( config.getMongoVar('port') )
	}
)
db = MongoEngine(app)
HEADERS = Header.objects.first()

# zmq stuff
zmqContext = zmq.Context()
zmqSocketSOM = zmqContext.socket(zmq.REQ)
zmqSocketPlane = zmqContext.socket(zmq.REQ)

# Utilities
def _checkDatasets(datasets):
	if not isinstance(datasets, list):
		return False
	for dset in datasets:
		if not Sample.objects.filter(dataset=dset).count > 0:
			return False
	return True

def _checkVariables(variables):
	if not isinstance(variables, list):
		return False
	for var in variables:
		if not HEADERS.variables.get(var):
			return False
	return True

def _getModifiedParameters(variables):
	ret = ['sampleid', 'dataset']
	prefix = 'variables.'
	for var in variables:
		ret.append( prefix + var )
	return ret

def _getFormattedSamples(samples, variables):
	retSamples = { 'id': [] }
	for samp in samples:
		retSamples['id'].append( samp.sampleid )
		for var in variables:
			if not retSamples.get(var):
				retSamples[var] = []
			# note: sample to float conversion IS important: 
			# without it, NaN's are kept in string format -> problems ahead
			retSamples[var].append( float(samp.variables[var]) )
	return retSamples

@sockets.route( config.getFlaskVar('prefix') + 'ws/som' )
def createSOM(ws):
	rawMessage = ws.receive()
	response = None
	message = { 'datasets': [], 'variables': [] }
	try:
		message = json.loads(rawMessage)
	except ValueError, TypeError:
		response = { "result": { 'code': 'error', 'message': 'Incorrect parameters' }, 'data': [] }
		ws.send(json.dumps(response))

	datasets = message.get('datasets')
	variables = message.get('variables')
	if not(datasets and variables) or not( _checkDatasets(datasets) and _checkVariables(variables) ):
		response = { "result": { 'code': 'error', 'message': 'Incorrect parameters' }, 'data': [] }
	else:
		samples = Sample.objects.filter(dataset__in=datasets).only(*(_getModifiedParameters(variables))).order_by('sampleid', 'dataset')
		zmqSocketSOM.connect('tcp://127.0.0.1:5678')
		zmqSocketSOM.send_json({ 'datasets': datasets, 'variables': variables, 'samples': _getFormattedSamples(samples, variables) })
		response = zmqSocketSOM.recv_json()

	ws.send(json.dumps(response))

@sockets.route( config.getFlaskVar('prefix') + 'ws/plane' )
def createPlane(ws):
	rawMessage = ws.receive()
	response = None
	try:
		message = json.loads(rawMessage)
		planeid = message.get('planeid')
		if planeid:
			zmqSocketPlane.connect('tcp://127.0.0.1:5679')
			zmqSocketPlane.send_json({ 'planeid': planeid })
			response = json.dumps(zmqSocketPlane.recv_json())
			ws.send(response)

		variables = message.get('variables')
		testVariable = variables.get('test')
		inputVariables = variables.get('input')
		inputDatasets = message.get('datasets')
		somId = message.get('somid')
		if not( somId and variables and inputDatasets ) \
		or not isinstance( inputVariables, list) \
		or not _checkVariables(inputVariables + [testVariable]) \
		or not _checkDatasets( inputDatasets ):
			response = json.dumps({ 'result': { 'code': 'error', 'message': 'Invalid parameters sent.' } })
		else:
			uniqueVars = list(set( inputVariables + [testVariable] ) )
			samples = Sample.objects.filter( dataset__in=inputDatasets ).only( *_getModifiedParameters(uniqueVars) ).order_by('sampleid', 'dataset')
			zmqSocketPlane.connect('tcp://127.0.0.1:5679')
			zmqSocketPlane.send_json({ 
				'variables': { 'test': testVariable, 'input': inputVariables },
				'som': somId,
				'samples': _getFormattedSamples( samples, uniqueVars )
			})
			response = json.dumps(zmqSocketPlane.recv_json())
		ws.send(response)
	except ValueError, AttributeError:
		response = { 'result': { 'code': 'error', 'message': 'Invalid parameters sent.' } }
		ws.send(json.dumps(response))

#if __name__ == '__main__':
	#app.run(host=config.getFlaskVar('host'), port=int(config.getFlaskVar('sockets_port')), debug=True)	