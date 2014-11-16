from flask import Flask
from flask_sockets import Sockets
from config import Config

from melikerion_controller.run_config import Config as MelikerionConfig

from mongoengine.errors import MultipleObjectsReturned
from mongoengine.queryset import DoesNotExist

from flask.ext.mongoengine import MongoEngine
from orm_models import Sample, HeaderSample, HeaderGroup
import zmq
import os
import json

app = Flask(__name__)
sockets = Sockets(app)
config = Config('setup.config')
melikerionConfig = MelikerionConfig('melikerion_controller/run.config')
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
		if not HeaderSample.objects.filter(name=var):
			return False
	return True

def _checkSamples(samples):
	if not isinstance(variables, list):
		return False

def _getSamples(sampleNames, variables):
	results = []
	for sample in sampleNames:
		try:
			found = Sample.objects.get(sampleid=sample['sampleid'], dataset=sample['dataset']) #.only(*(_getModifiedParameters(variables)))
			results.append(found)
		except( DoesNotExist, MultipleObjectsReturned ):
			pass
	return sorted(results, key=lambda e: (e['sampleid'], e['dataset']) )
	#Sample.objects.filter(dataset__in=datasets, sampleid__in=sampleNames).only(*(_getModifiedParameters(variables))).order_by('sampleid', 'dataset')

def _getModifiedParameters(variables):
	ret = ['sampleid', 'dataset']
	prefix = 'variables.'
	for var in variables:
		ret.append( prefix + var )
	return ret

def _getFormattedSamples(samples, variables):
	retSamples = { 'id': [] }
	for samp in samples:
		retSamples['id'].append( { 'dataset': samp.dataset, 'sampleid': samp.sampleid } )
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

	somid = message.get('somid')
	if somid:
		zmqSocketSOM.connect( melikerionConfig.getZMQVar('bind_som') )
		zmqSocketSOM.send_json({ 'somid': somid })
		response = json.dumps( zmqSocketSOM.recv_json() )
		ws.send(response)
		return

	#datasets = message.get('datasets')
	variables = message.get('variables')
	sampleNames = message.get('samples')
	if not(variables and sampleNames) or not( _checkVariables(variables) ):
		response = { "result": { 'code': 'error', 'message': 'Incorrect parameters' }, 'data': [] }
	else:
		samples = _getSamples(sampleNames, variables)
		zmqSocketSOM.connect( melikerionConfig.getZMQVar('bind_som') )
		#print "SENDING = ", { 'variables': variables, 'samples': _getFormattedSamples(samples, variables) }
		zmqSocketSOM.send_json({ 'variables': variables, 'samples': _getFormattedSamples(samples, variables) })
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
			zmqSocketPlane.connect(  melikerionConfig.getZMQVar('bind_plane') )
			zmqSocketPlane.send_json({ 'planeid': planeid })
			response = json.dumps(zmqSocketPlane.recv_json())
			ws.send(response)
			return

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
			zmqSocketPlane.connect( melikerionConfig.getZMQVar('bind_plane') )
			zmqSocketPlane.send_json({ 
				'variables': { 'test': testVariable, 'input': inputVariables },
				'som': somId,
				'samples': _getFormattedSamples( samples, uniqueVars )
			})
			response = json.dumps(zmqSocketPlane.recv_json())
		ws.send(response)
	except: #ValueError, AttributeError:
		response = { 'result': { 'code': 'error', 'message': 'Invalid parameters sent.' } }
		ws.send(json.dumps(response))

#if __name__ == '__main__':
	#app.run(host=config.getFlaskVar('host'), port=int(config.getFlaskVar('sockets_port')), debug=True)	