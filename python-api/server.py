import os
import sys
from config import Config
import flask
from flask import Flask, Request, request, Response, abort

from mongoengine import register_connection
from flask.ext.mongoengine import MongoEngine

import json

from orm_models import Sample, HeaderSample, HeaderGroup, BrowsingState
from flask_sockets import Sockets

import io
from base64 import b64decode

import random
from hashids import Hashids
import hashlib

app = Flask(__name__)
config = Config('setup.config')
app.config['DEBUG'] = True
app.config['SECRET_KEY'] = os.urandom(24)
app.config['MONGODB_SETTINGS'] = {
	'DB': config.getMongoVar('db'),
	'alias': 'samples',
	'HOST': config.getMongoVar('host'),
	'PORT': int( config.getMongoVar('port') )
}

register_connection(
	'samples', 
	name=config.getMongoVar('db'),
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
sockets = Sockets(app)

def _getModifiedParameters(variables):
	ret = ['sampleid', 'dataset']
	prefix = 'variables.'
	for var in variables:
		ret.append( prefix + var )
	return ret

def _getUrlSalt():
	ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
	return ''.join(random.choice(ALPHABET) for i in range(24))

# run-based hash -> always unique
URL_SALT = _getUrlSalt()
hashids = Hashids(salt=URL_SALT)

@app.route( config.getFlaskVar('prefix') + 'headers/NMR_results', methods=['GET'])
def headers():
	def _getFormatted():
		def _getHeader(header, no):
			return {
				'unit': header.unit,
				'name': header.name,
				'name_order': no,
				'desc': header.desc,
				'group': { 'name': header.group.name, 'order': header.group.order },
				'unit': header['unit'],
				'unit': header['unit'],
			}

		formatted = []
		for group in HeaderGroup.objects.all():
			for no, header in enumerate(group.variables):
				formatted.append( _getHeader(header, no) )
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
		state = BrowsingState.objects.exclude('_id').exclude('stateHash').get(urlHash=hashId)
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

	def validDatasets(sets):
		uniqueDatasets = Sample.objects.distinct('dataset')
		atLeastOneSet = len(sets) > 0
		for s in sets:
			if not s in uniqueDatasets:
				return False
		return atLeastOneSet

	def validSOM(som, datasets):
		def validSize(size):
			val = isinstance(size, dict) and \
			size.get('x') and isinstance(size.get('x'), int) and \
			size.get('y') and isinstance(size.get('y'), int)
			return val

		def validSamples(bmus, datasets, size):
			try:
				for bmu in bmus:
					x = bmu.get('x')
					y = bmu.get('y')
					sample = bmu.get('sample')
					sampId = sample.get('sampleid')
					validSet = sample.get('dataset') in datasets
					if validSet and sample and sampId and (x <= size.get('x')) and (y <= size.get('y')):
						# valid
						pass
					else:
						return False
				return True
			except Exception, e:
				return False

		bmus = som.get('bmus')
		planeSize = som.get('size')
		return isinstance(som, dict) and \
		isinstance(bmus, list) and \
		validSize(planeSize) and \
		validSamples(bmus, datasets, planeSize)

	def validRegression(regression):
		selectedVariables = regression.get('selected')
		return isinstance(regression, dict) and \
		selectedVariables is not None and \
		isinstance(selectedVariables, dict)

	def validViews(views):
		return True

	def getViewSize(views):
		ret = []
		for view in views:
			ret.append(len(view.get('figures')))
		return ret

	def getHash(stateDict):
		stateString = json.dumps(stateDict, sort_keys=True, ensure_ascii=True, separators=(',',':'))
		return hashlib.md5(stateString).hexdigest()

	try:
		payload = request.get_json()
		activeState = payload.get('activeState')
		datasets = payload.get('datasets')
		sampleCount = payload.get('sampleCount')
		som = payload.get('som')
		regression = payload.get('regression')
		views = payload.get('views')

		# check input validity
		if validDatasets(datasets) and validSOM(som, datasets) and validViews(views) and validRegression(regression):
			# form the hash
			stateHash = getHash(payload)
			urlHash = None
			try:
				# try to fetch old one, if any
				state = BrowsingState.objects.get(stateHash__exact=stateHash)
				urlHash = state['urlHash']
			except Exception, e:
				# failed, does not exist
				#print "failed, does not exist"
				viewSize = getViewSize(views)
				urlHash = hashids.encode(sampleCount, len(som.get('bmus')), *viewSize)				
				state = BrowsingState(urlHash=urlHash, stateHash=stateHash, activeState=activeState, \
					datasets=datasets, som=som, sampleCount=sampleCount, views=views, regression=regression)
				state.save()
			finally:
				response = { 
				'success': 'true',
				'query': request.path,
				'result': urlHash
				}
				response = flask.jsonify(response)
				response.status_code = 200
				return response
		else:
			#print "no except, but not valid"
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

	try:
		payload = request.get_json()
		dataset = payload.get('dataset')
		variables = payload.get('variables')

		if not( dataset and variables) or not( ( isinstance( dataset, str ) or isinstance( dataset, unicode ) ) and isinstance( variables, list ) ):
			return getError()
		else:
			samples = Sample.objects.filter(dataset=dataset).only(*_getModifiedParameters(variables))
			response = flask.jsonify({
				'success': 'true',
				'query': { 'variables': variables, 'dataset': dataset },
				'result': { 'values': json.loads(samples.to_json()) } #getSamples(samples, variables) }
			})
			response.status_code = 200
			return response

	except:
		return getError()

@app.route( config.getFlaskVar('prefix') + 'list/<variable>/in/<dataset>', methods=['GET'] )
def variable(variable, dataset):
	if not Header.objects.first().variables.get(variable):
		response = flask.jsonify({
			'success': 'false',
			'query': request.path,
			'result': { 'error': 'No such sample.' }
		})
		response.status_code = 400
		return response

	results = Sample.objects.filter(dataset=dataset).only('sampleid', 'variables.'+variable)
	if not results.count():
		response = flask.jsonify({
			'success': 'false',
			'query': request.path,
			'result': { 'error': 'No such dataset.' }
		})
		response.status_code = 400
		return response

	d = dict()
	try:
		for res in results:
			d[res.sampleid] = res.variables[variable]
		response = flask.jsonify({
			'success': 'true',
			'query': request.path,
			'result': { 'values': d }
		})
		response.status_code = 200
		return response
	except:
		response = flask.jsonify({
			'success': 'false',
			'query': request.path,
			'result': { 'error': 'Unexpected error.' }
		})
		response.status_code = 400
		return response

if __name__ == '__main__':
	config = Config('setup.config')
	app.run(host=config.getFlaskVar('host'), port=int(config.getFlaskVar('port')), debug=True)
