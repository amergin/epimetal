import os
import sys
from config import Config
import flask
from flask import Flask, Request, request, Response, abort

from mongoengine import register_connection
from mongoengine.queryset import DoesNotExist
from mongoengine.errors import NotUniqueError
from flask.ext.mongoengine import MongoEngine

import json

from orm_models import Sample, HeaderSample, HeaderGroup, BrowsingState, SOMTrain, SOMPlane

from pymongo import ReadPreference

import io
from base64 import b64decode

import random
from hashids import Hashids
import hashlib
import time

app = Flask(__name__)
config = Config('setup.config')
app.config['DEBUG'] = True
app.config['SECRET_KEY'] = os.urandom(24)
app.config['MONGODB_SETTINGS'] = {
	'db': config.getMongoVar('db'),
	'alias': 'samples',
	'HOST': config.getMongoVar('host'),
	'PORT': int( config.getMongoVar('port') ),
	'read_preference': ReadPreference.PRIMARY_PREFERRED
}

register_connection(
	'samples', 
	name=config.getMongoVar('db'),
	host=config.getMongoVar('host'),
	port=int( config.getMongoVar('port') ) )

register_connection(
	'som', 
	name=config.getMongoVar('somdb'),
	host=config.getMongoVar('host'),
	port=int( config.getMongoVar('port') ) )

# app.config.update(
# 	DEBUG=True,
# 	SECRET_KEY=os.urandom(24),
# 	MONGODB_SETTINGS= {
# 	'DB': config.getMongoVar('db'),
# 	'HOST': config.getMongoVar('host'),
# 	'PORT': int( config.getMongoVar('port') )
# 	}
# )
db = MongoEngine(app)

def _getModifiedParameters(variables):
	ret = ['sampleid', 'dataset']
	prefix = 'variables.'
	for var in variables:
		ret.append( prefix + var )
	return ret

def _getUrlSalt():
	ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
	return ''.join(random.choice(ALPHABET) for i in range(24))

def _getHashids():
	# returns always with a new salt
	return Hashids(salt=_getUrlSalt(), min_length=8)

def _getSizeOfDict(d):
	size = sys.getsizeof(d)
	size += sum(map(sys.getsizeof, d.itervalues())) + sum(map(sys.getsizeof, d.iterkeys()))	
	return size

def withoutKeys(dictionary, keys):
	for excludeKey in keys:
		dictionary.pop(excludeKey, None)

def flatten(l): 
	return [item for sublist in l for item in sublist]

def dictSubset(dictionary, keys):
	return dict([(i, dictionary[i]) for i in keys if i in dictionary])	

def variablesExist(array):
	variables = Sample.objects.first().variables
	for variable in array:
		if not variables.get(variable):
			return False
	return True

def variablesExistObject(obj):
	variables = Sample.objects.first().variables
	array = None
	if isinstance(obj, list):
		array = obj
	elif obj.get('type', '') == 'db':
		array = [obj]
	elif isinstance(obj, dict):
		array = flatten(obj.values())

	print "variablesExistObject, obj = ", obj
	print "variablesExistObject array=", array
	for variable in array:
		if variable.get('type') == 'db':
			if not variable.get('name') in variables:
				print "falsy var = ", variable
				return False
		else:
			# custom is not processed, TODO
			pass
	#print "returns true"
	return True

def legalSOM(var):
	if (isinstance(var, str) or isinstance(var, unicode)) and len(var) > 0:
		try: 
			return SOMTrain.objects.get(id=var.encode('utf8')) is not None
		except DoesNotExist, e:
			return False
	else:
		return False

def legalSOMHash(var):
	if (isinstance(var, str) or isinstance(var, unicode)) and len(var) > 0:
		try: 
			return SOMTrain.objects.get(somHash=var.encode('utf8')) is not None
		except DoesNotExist, e:
			return False
	else:
		return False


@app.route( config.getFlaskVar('prefix') + 'headers/NMR_results', methods=['GET'])
def headers():
	def _getFormatted():
		def _getHeader(header, no):
			return {
				'unit': header.unit,
				'name': header.name,
				'name_order': no,
				'desc': header.desc,
				'group': { 'name': header.group.name, 'topgroup': header.group.topgroup or None, 'order': header.group.order },
				'classed': header.classed or False
			}

		formatted = []
		for group in HeaderGroup.objects.all():
			for no, sample in enumerate(group.variables):
				formatted.append( _getHeader(sample, no) )
		return formatted


	headers = _getFormatted()
	retDict = { 'query': request.path }
	if not headers:
		retDict['success'] = False
		retDict['result'] = []
		response = flask.jsonify( retDict )
		response.status_code = 400
		return response
	else:
		retDict['success'] = True
		retDict['result'] = headers
		response = flask.jsonify( retDict )
		response.status_code = 200
		return response

@app.route( config.getFlaskVar('prefix') + 'som/plane/<somId>/<variable>', methods=['GET'] )
def getPlane(somId, variable):
	try:
		doc = SOMPlane.objects.get(som=somId, variable=variable)
		# found it
		resp = flask.jsonify({
			'success': 'true',
			'query': request.path,
			'result': { 
				'data': json.loads(doc.to_json())
			}
		})
		resp.status_code = 200 # OK
		return resp

	except DoesNotExist, e:
		resp = flask.jsonify({
		'success': 'true',
		'query': request.path,
		'result': { 'message': 'Hash not found.' }
		})
		resp.status_code = 204 # No content
		return resp

@app.route( config.getFlaskVar('prefix') + 'som/plane', methods=['POST'] )
def createPlane():

	def getError():
		resp = flask.jsonify({
		'success': 'false',
		'query': request.path,
		'result': { 'error': 'Incorrect payload posted.' }
		})
		resp.status_code = 400
		return resp

	def doesNotExist():
		resp = flask.jsonify({
		'success': 'true',
		'query': request.path,
		'result': { 'message': 'SOM not found.' }
		})
		resp.status_code = 204 # No content
		return resp

	def legalVariable(var):
		return (isinstance(var, str) or isinstance(var, unicode)) and len(var) > 0

	def legalPlane(var):
		def legalPvalue(var):
			p = var.get('pvalue')
			return p is not None and \
			0 <= p <= 1

		def legalLabels(var):
			labels = var.get('labels')
			return labels is not None and \
			isinstance(labels, list) and \
			len(labels) > 0

		def legalSize(var):
			size = var.get('size')
			return size is not None and \
			isinstance(size, dict) and \
			len(size) is 2

		def legalCells(var):
			cells = var.get('cells')
			size = var.get('size').get('m') * var.get('size').get('n')
			return cells is not None and \
			isinstance(cells, list) and \
			len(cells) is size and \
			all([isinstance(i, dict) for i in cells])

		return isinstance(var, dict) and bool(var) and \
		legalPvalue(var) and \
		legalLabels(var) and \
		legalSize(var) and \
		legalCells(var)

	try:
		payload = request.get_json()
		variable = payload.get('variable', '')
		plane = payload.get('plane', None)
		som = payload.get('som', '')

		if legalVariable(variable) and \
		variablesExist([variable]) and \
		legalPlane(plane) and \
		legalSOM(som):
			somDoc = SOMTrain.objects.get(id=som.encode('utf8'))
			try:
				existingDoc = SOMPlane.objects.get(som=somDoc, variable=variable.encode('utf8'))
				# already created, do nothing
				resp = flask.jsonify({
					'success': 'true',
					'query': request.path,
					'result': { 
						'id': str(existingDoc.id)
					}
				})
				resp.status_code = 200 # OK
				return resp
			except DoesNotExist, e:
				# not created, so create now
				doc = SOMPlane(som=somDoc, variable=variable.encode('utf8'), plane=plane)
				doc.save()
				resp = flask.jsonify({
					'success': 'true',
					'query': request.path,
					'result': { 
						'id': str(doc.id)
					}
				})
				resp.status_code = 201 # Created
				return resp
		else:
			return getError()

	except Exception, e:
		print "exception occured", e
		exc_type, exc_obj, exc_tb = sys.exc_info()
		fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
		print(exc_type, fname, exc_tb.tb_lineno)
		return getError()

@app.route( config.getFlaskVar('prefix') + 'som/<somHash>', methods=['GET'] )
def getSOMTrain(somHash):
	try:
		# print type(somHash), "=", somHash
		doc = SOMTrain.objects.get(somHash=somHash)
		resp = flask.jsonify({
			'success': 'true',
			'query': request.path,
			'result': { 
				'id': str(doc.id),
				'data': json.loads(doc.to_json())
			}
		})
		resp.status_code = 200 # OK
		return resp

	except DoesNotExist, e:
		resp = flask.jsonify({
		'success': 'true',
		'query': request.path,
		'result': { 'message': 'Hash not found.' }
		})
		resp.status_code = 204 # No content
		return resp


def legalString(var):
	return (isinstance(var, unicode) or isinstance(var, str)) and len(var) > 0

def isArray(variable):
	return isinstance(variable, list)

def legalArray(var):
	def isNotEmpty(array):
		return len(array) > 0

	return isArray(var) and isNotEmpty(var)

def legalBool(var):
	return isinstance(var, bool)

# stores a new set of som training information to db
@app.route( config.getFlaskVar('prefix') + 'som', methods=['POST'] )
def createSOMTrain():
	def getError():
		resp = flask.jsonify({
		'success': 'false',
		'query': request.path,
		'result': { 'error': 'Incorrect payload posted.' }
		})
		resp.status_code = 400
		return resp

	def legalDistance(var):
		return isinstance(var, float) and (0 < var < 10)

	def legalDescription(desc):
		return desc.get('N') is not None and \
		len(desc.get('variables', [])) > 0 and \
		len(desc.get('datasets', [])) > 0

	def legalNumber(var):
		return isinstance(var, int) and (var > 0)

	def getFloatArray(array):
		return [float(i) for i in array]


	try:
		payload = request.get_json()

		bmus = payload.get('bmus', [])
		weights = payload.get('weights', [])
		codebook = payload.get('codebook', [])
		variables = payload.get('variables', [])
		neighdist = payload.get('neighdist', -1)
		distances = payload.get('distances', [])
		somHash = payload.get('hash', '')
		rows = payload.get('rows', -1)
		cols = payload.get('cols', -1)
		epoch = payload.get('epoch', -1)
		description = payload.get('description', {})

		somDocId = None

		if legalDistance(neighdist) and \
		legalString(somHash) and \
		legalNumber(epoch) and \
		legalNumber(rows) and \
		legalNumber(cols) and \
		legalArray(bmus) and \
		legalArray(weights) and \
		legalArray(codebook) and \
		legalArray(variables) and \
		variablesExist(variables) and \
		legalArray(distances) and \
		legalDescription(description):
			somHash = somHash.encode('utf8')
			# see if it already exists
			try:
				somDoc = SOMTrain.objects.get(somHash=somHash)
				# exists:
				somDocId = str(somDoc.id)
				response = flask.jsonify({
					'success': 'true',
					'query': request.path,
					'result': {
						'id': somDocId
					}
				})
				response.status_code = 200
			except:
				# not found, create from scratch
				somDoc = SOMTrain(somHash=somHash, bmus=bmus, weights=getFloatArray(weights), codebook=getFloatArray(codebook), variables=variables, \
					distances=getFloatArray(distances), 
					neighdist=neighdist, epoch=epoch, rows=rows, cols=cols,
					description=description)
				somDoc.save()
				somDocId = str(somDoc.id)
				response = flask.jsonify({
					'success': 'true',
					'query': request.path,
					'result': {
						'id': somDocId
					}
				})
				response.status_code = 201
			return response

		else:
			return getError()

	except Exception, e:
		print "exception occured", e
		exc_type, exc_obj, exc_tb = sys.exc_info()
		fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
		print(exc_type, fname, exc_tb.tb_lineno)
		return getError()

@app.route( config.getFlaskVar('prefix') + 'state/<hashId>', methods=['GET'] )
def state(hashId):
	def getError():
		resp = flask.jsonify({
		'success': 'false',
		'query': request.path,
		'result': { 'error': 'Hash not found' }
		})
		resp.status_code = 400
		return resp

	try:
		if len(hashId) > 50:
			return getError()
		state = BrowsingState.objects.exclude('_id').get(urlHash=hashId)
		response = { 
		'success': 'true',
		'query': request.path,
		'result': json.loads(state.to_json())
		}
		response = flask.jsonify(response)
		response.status_code = 200
		return response
	except Exception, e:
		print "exception", e
		return getError()


@app.route( config.getFlaskVar('prefix') + 'state', methods=['POST'] )
def postState():
	def getError():
		resp = flask.jsonify({
		'success': 'false',
		'query': request.path,
		'result': { 'error': 'Invalid query syntax.' }
		})
		resp.status_code = 400
		return resp

	def validRegression(regression):
		print "1 = ", isinstance(regression, dict)
		print "2 = ", isinstance(regression.get('selected'), dict)
		print "3 = ", variablesExistObject(regression.get('selected'))

		return isinstance(regression, dict) and \
		isinstance(regression.get('selected'), dict) and \
		variablesExistObject(regression.get('selected'))

	def getHash(stateDict):
		stateString = json.dumps(stateDict, sort_keys=True, ensure_ascii=True, separators=(',',':'))
		return hashlib.md5(stateString).hexdigest()

	def validBrowsing(browsing):
		def validHandlers(handlers):
			def validHandler(handler):
				windows = handler.get('windows', [])
				baseOK = legalString(handler.get('name')) and isArray(windows)
				# print "baseok = ", baseOK
				# print "windows=", windows
				# print "array=", isArray(windows)
				if baseOK:
					for win in windows:
						ok = legalString(win.get('figure')) and \
						legalString(win.get('id')) and \
						isinstance(win.get('position'), dict) and \
						isinstance(win.get('size'), dict) and \
						variablesExistObject(win.get('variables', []))
						if not ok:
							print "not ok"
							return False
					return True
				else:
					return False

			for handler in handlers:
				if not validHandler(handler):
					return False
			return True

		def validExplore(state):
			return isArray(state.get('filters')) and \
			legalArray(state.get('handlers'))

		def validSOM(state):
			def legalNumber(var):
				return isinstance(var, int) and (var >= 0)

			def validSize(state):
				size = state.get('size')
				return isinstance(size, dict) and \
				legalNumber(size.get('columns')) and \
				legalNumber(size.get('rows'))

			def validDoc(state):
				def hasWindows(state):
					# not having a somID is totally okay if there are no windows
					for handler in state.get('handlers', []):
						if(len(handler.get('windows')) > 0):
							return True
					return False
					
				som = state.get('som', dict())
				somId = som.get('id')
				if not somId:
					if hasWindows(state):
						return False
					return True
				else:
					return legalSOM(somId)

			#print "filters=", isArray(state.get('filters'))
			#print "handlers=", validHandlers(state.get('handlers', []))
			#print "selection=", legalArray(state.get('selection'))
			#print "size=", validSize(state)

			return isArray(state.get('filters')) and \
			validHandlers(state.get('handlers', [])) and \
			legalArray(state.get('selection')) and \
			validSize(state) and \
			validDoc(state)

		def validRegression(state):
			return isArray(state.get('filters')) and \
			validHandlers(state.get('handlers')) and \
			isinstance(state.get('selection'), dict)

		for state in browsing:
			typ = state.get('type', '')
			if typ == 'explore':
				if not validExplore(state):
					print "explore = false"
					return False
			elif typ == 'som':
				if not validSOM(state):
					print "som = false"
					return False
				else:
					if len(state.get('som')) is 0:
						# empty SOM details is valid
						return True
					try:
						# add som hash to the object
						state['som']['hashId'] = SOMTrain.objects.get(id=state.get('som').get('id')).somHash
					except DoesNotExist:
						return False
			elif typ == 'regression':
				if not validRegression(state):
					print "regression = false"
					return False
			else:
				print "type=", typ
				return False
		return True

	def validCommon(common):
		def validActive(common):
			return legalString(common.get('active', ''))


		def validDatasets(common):
			def validDbDataset(set):
				name = set.get('name', '')
				nameInDb = name in uniqueDatasets
				hasColor = set.get('color', None) is not None
				sizeCorrect = Sample.objects.filter(dataset=name).count() == set.get('size', 0)

				return nameInDb and hasColor and sizeCorrect

			def validDerivedDataset(set):
				nameNotInDb = set.get('name', '') not in uniqueDatasets
				hasColor = set.get('color', None) is not None
				sampleSize = len( set.get('samples', []) )
				hasSamples = sampleSize > 0
				sizeCorrect = sampleSize == set.get('size', 0)

				return hasColor and hasSamples and sizeCorrect

			sets = common.get('datasets', [])
			uniqueDatasets = Sample.objects.distinct('dataset')
			atLeastOneSet = len(sets) > 0
			for s in sets:
				if s.get('type') == 'database':
					return validDbDataset(s)
				elif s.get('type') == 'derived':
					return validDerivedDataset(s)
				else:
					return False
			return atLeastOneSet

		# def validDatasets(common):
		# 	def validDataset(ds):
		# 		name = ds.get('name', '')
		# 		if not legalString(name):
		# 			return False
		# 		else:
		# 			return Sample.objects.filter(dataset=name).count() > 0

		# 	dsets = common.get('datasets', [])
		# 	for dset in dsets:
		# 		if not validDataset(dset):
		# 			return False
		# 	return True

		def validMenu(common):
			return isinstance(common.get('menu', None), dict)

		def validVariables(common):
			return variablesExistObject(common.get('variables', []))

		#print "active = ", validActive(common)
		#print "validDatasets = ", validDatasets(common)
		#print "menu = ", validMenu(common)
		#print "vars = ", validVariables(common)

		return validActive(common) and \
		validDatasets(common) and \
		validMenu(common) and \
		validVariables(common)

	try:
		payload = request.get_json()
		browsing = payload.get('browsing')
		common = payload.get('common')

		# check input validity
		if validBrowsing(browsing) and validCommon(common):
			hashids = _getHashids()
			urlHash = hashids.encode(_getSizeOfDict(payload))
			state = BrowsingState(urlHash=urlHash, browsing=browsing, common=common)
			state.save()

			response = { 
			'success': 'true',
			'query': request.path,
			'result': urlHash
			}

			response = flask.jsonify(response)
			response.status_code = 200
			return response
		else:
			print "common=", validCommon(common)
			print "browsing=", validBrowsing(browsing)
			return getError()
	except Exception, e:
		print "exception occured", e
		exc_type, exc_obj, exc_tb = sys.exc_info()
		fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
		print(exc_type, fname, exc_tb.tb_lineno)
		return getError()


@app.route( config.getFlaskVar('prefix') + 'datasets', methods=['GET'] )
def datasets():
	def _getDatasetDetails(name):
		return { 'size': Sample.objects.filter(dataset=name).count(), 'name': name }
	#print [method for method in dir(Sample.objects) if callable(getattr(Sample.objects, method))]
	uniqueDatasets = Sample.objects.distinct('dataset')
	response = { 'success': 'true', 'query': request.path, 'result': []}
	for dset in uniqueDatasets:
		response['result'].append( _getDatasetDetails(dset) )
	response = flask.jsonify(response)
	response.status_code = 200
	return response

@app.route( config.getFlaskVar('prefix') + 'export/svg', methods=['POST'] )
def exportSVG():
	suffix = '.svg'
	filename = request.form.get('filename', 'export') + suffix
	try:
		svgFile = io.BytesIO( b64decode( request.form.get('payload') ) )
	except:
		abort(400)
	return flask.send_file( svgFile,
		as_attachment=True, mimetype='image/svg+xml', attachment_filename=filename)


@app.route( config.getFlaskVar('prefix') + 'export/png', methods=['POST'] )
def exportPNG():
	suffix = '.png'
	filename = request.form.get('filename', 'export') + suffix
	try:
		pngFile = io.BytesIO( b64decode( request.form.get('payload') ) )
	except:
		abort(400)
	return flask.send_file( pngFile,
		as_attachment=True, mimetype='image/png', attachment_filename=filename)

@app.route( config.getFlaskVar('prefix') + 'list/', methods=['POST'] )
def getBulk():
	def getError():
		resp = flask.jsonify({
		'success': 'false',
		'query': '',
		'result': { 'error': 'Incorrect payload POSTed.' }
		})
		resp.status_code = 400
		return resp

	# def getSamples(samples):
	# 	dicts = []
	# 	for sample in [ob.to_mongo() for ob in samples]:
	# 		# this is SON instance
	# 		dictionary = sample.to_dict()
	# 		# remove id so it's serializable
	# 		dictionary.pop('_id', None)
	# 		dicts.append(dictionary)
	# 	return dicts

	try:
		payload = request.get_json()
		dataset = payload.get('dataset')
		variables = payload.get('variables')

		if not( dataset and variables) or not( ( isinstance( dataset, str ) or isinstance( dataset, unicode ) ) and isinstance( variables, list ) ):
			return getError()
		else:
			samples = Sample.objects.filter(dataset=dataset).only(*_getModifiedParameters(variables))
			response = Response(json.dumps({
				'success': 'true', 'query': { 'variables': variables, 'dataset': dataset },
				'result': { 'values': list(samples.as_pymongo()) }
				}), mimetype='application/json')
			response.status_code = 200
			return response

	except 	Exception, e:
		print e
		return getError()

# @app.route( config.getFlaskVar('prefix') + 'list/<variable>/in/<dataset>', methods=['GET'] )
# def variable(variable, dataset):
# 	if not Header.objects.first().variables.get(variable):
# 		response = flask.jsonify({
# 			'success': 'false',
# 			'query': request.path,
# 			'result': { 'error': 'No such sample.' }
# 		})
# 		response.status_code = 400
# 		return response

# 	results = Sample.objects.filter(dataset=dataset).only('sampleid', 'variables.'+variable)
# 	if not results.count():
# 		response = flask.jsonify({
# 			'success': 'false',
# 			'query': request.path,
# 			'result': { 'error': 'No such dataset.' }
# 		})
# 		response.status_code = 400
# 		return response

# 	d = dict()
# 	try:
# 		for res in results:
# 			d[res.sampleid] = res.variables[variable]
# 		response = flask.jsonify({
# 			'success': 'true',
# 			'query': request.path,
# 			'result': { 'values': d }
# 		})
# 		response.status_code = 200
# 		return response
# 	except:
# 		response = flask.jsonify({
# 			'success': 'false',
# 			'query': request.path,
# 			'result': { 'error': 'Unexpected error.' }
# 		})
# 		response.status_code = 400
# 		return response

if __name__ == '__main__':
	config = Config('setup.config')
	app.run(host=config.getFlaskVar('host'), port=int(config.getFlaskVar('port')), debug=True)
