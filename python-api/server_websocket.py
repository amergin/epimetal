from flask import Flask
from flask_sockets import Sockets
from config import Config

from melikerion_controller.run_config import Config as MelikerionConfig
from melikerion_controller.melikerion_orm_models import SOM, Plane
from mongoengine.context_managers import switch_db

from mongoengine.errors import MultipleObjectsReturned
from mongoengine.queryset import DoesNotExist
from mongoengine import register_connection

from pymongo.errors import InvalidId
from bson.objectid import ObjectId

from flask.ext.mongoengine import MongoEngine
from orm_models import Sample, HeaderSample, HeaderGroup
import zmq
import os
import sys
import json
import hashlib

app = Flask(__name__)
sockets = Sockets(app)
config = Config('setup.config')
melikerionConfig = MelikerionConfig('melikerion_controller/run.config')
app.config['DEBUG'] = True
app.config['SECRET_KEY'] = os.urandom(24)
app.config['MONGODB_SETTINGS'] = {
	'DB': config.getMongoVar('db'),
	'alias': 'samples',
	'HOST': config.getMongoVar('host'),
	'PORT': int( config.getMongoVar('port') )
}
# }, {
# 	'DB': melikerionConfig.getMongoVar('db'),
# 	'alias': 'melikerion',
# 	'HOST': melikerionConfig.getMongoVar('host'),
# 	'PORT': int( melikerionConfig.getMongoVar('port') )
# }]
# app.config.update(
# 	DEBUG=True,
# 	SECRET_KEY=os.urandom(24)
# 	MONGODB_SETTINGS= {
# 	'DB': config.getMongoVar('db'),
# 	'HOST': config.getMongoVar('host'),
# 	'PORT': int( config.getMongoVar('port') )
# 	}
# )
db = MongoEngine()
db.init_app(app)
#db = MongoEngine(app)

register_connection(
	'samples', 
	name=config.getMongoVar('db'),
	host=config.getMongoVar('host'),
	port=int( config.getMongoVar('port') ) )

register_connection(
	'melikerion', 
	name=melikerionConfig.getMongoVar('db'),
	host=melikerionConfig.getMongoVar('host'),
	port=int( melikerionConfig.getMongoVar('port') ) )

# zmq stuff
zmqContext = zmq.Context()
zmqSocketSOM = zmqContext.socket(zmq.REQ)
zmqSocketPlane = zmqContext.socket(zmq.REQ)

# Utilities
"""def _checkDatasets(datasets):
	if not isinstance(datasets, list):
		return False
	for dset in datasets:
		if not Sample.objects.filter(dataset=dset).count > 0:
			return False
	return True"""

def _checkVariables(variables):
	if not isinstance(variables, list):
		return False
	for var in variables:
		if not HeaderSample.objects.filter(name=var):
			return False
	return True

def _getSOM(samples, variables):
	def getHash(samples,variables):
		idString = json.dumps(samples + variables, sort_keys=True, ensure_ascii=True, separators=(',',':'))
		return hashlib.md5( idString ).hexdigest()
	som = None
	try:
		som = SOM.objects.get(hash=getHash(samples,variables))
	except:
		pass
		#e = sys.exc_info()[0]
		#print "not found, error", e
	finally:
		return som

def _getPlane(somInstance, testVariable):
	plane = None
	plane = Plane.objects.get(som=somInstance, variable=testVariable)
	return plane
	# try:
	# 	plane = Plane.objects.get(som=somInstance, variable=testVariable)
	# except:
	# 	print "[Info] Plane not found"
	# finally:
	# 	return plane

def _checkSamples(samples):
	if not isinstance(samples, list):
		return False

def _sortArray(array):
	return sorted(array, key=lambda e: (e['sampleid'], e['dataset']) )


def _getSamples(sampleNames, variables):
	results = []
	for sample in sampleNames:
		try:
			found = Sample.objects.get(sampleid=sample.get('sampleid'), dataset=sample.get('dataset'))
			results.append(found)
		except( DoesNotExist, MultipleObjectsReturned ):
			pass
	# important! hash depends on sort order!
	return _sortArray(results)

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

	variables = message.get('variables')
	sampleNames = message.get('samples')

	if not(variables and sampleNames) or not( _checkVariables(variables) and _checkSamples(sampleNames) ):
		response = { "result": { 'code': 'error', 'message': 'Incorrect parameters' }, 'data': [] }

	sampleNames = _sortArray(sampleNames)

	somInstance = _getSOM(sampleNames, variables)
	if somInstance:
		response = { "result": { 'code': 'success' }, 'data': { 
		'variables': variables,
		'id': str(somInstance.id),
		#'samples': samples,
		'bmus': somInstance.plane_bmu
		} }
	else:
		samples = _getSamples(sampleNames, variables)
		zmqSocketSOM.connect( melikerionConfig.getZMQVar('bind_som') )
		zmqSocketSOM.send_json({ 'variables': variables, 'samples': _getFormattedSamples(samples, variables) })
		response = zmqSocketSOM.recv_json()

	ws.send(json.dumps(response))

@sockets.route( config.getFlaskVar('prefix') + 'ws/plane' )
def createPlane(ws):
	rawMessage = ws.receive()
	response = None
	#try:
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
	somId = message.get('somid')
	if not( somId and variables ) \
	or not isinstance( inputVariables, list) \
	or not _checkVariables(inputVariables + [testVariable]):
		# print "variables=", _checkVariables(inputVariables + [testVariable])
		response = json.dumps({ 'result': { 'code': 'error', 'message': 'Invalid parameters sent.' } })
	else:
		somInstance = SOM.objects.get(id=ObjectId(somId) )
		planeInstance = _getPlane(somInstance, testVariable)
		if planeInstance:
			response = json.dumps({
				'data': {
				'variable': testVariable,
				'plane': planeInstance.plane,
				'id': str(planeInstance.id),
				'som_id': str(somInstance.id)
				},
				'result': { 'code': 'success' }
				})
		else:
			uniqueVars = list(set( inputVariables + [testVariable] ) )
			samples = _getSamples( somInstance.samples, uniqueVars )

			zmqSocketPlane.connect( melikerionConfig.getZMQVar('bind_plane') )
			zmqSocketPlane.send_json({ 
				'variables': { 'test': testVariable, 'input': inputVariables },
				'som': somId,
				'samples': _getFormattedSamples( samples, uniqueVars )
			})
			response = json.dumps(zmqSocketPlane.recv_json())
	ws.send(response)
	# except Exception, e:
	# 	exc_type, exc_obj, exc_tb = sys.exc_info()
	# 	fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
	# 	print(exc_type, fname, exc_tb.tb_lineno)
	# 	response = { 'result': { 'code': 'error', 'message': 'Invalid parameters sent.' } }
	# 	ws.send(json.dumps(response))

#if __name__ == '__main__':
	#app.run(host=config.getFlaskVar('host'), port=int(config.getFlaskVar('sockets_port')), debug=True)	