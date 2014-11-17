import os
import sys
from config import Config
import flask
from flask import Flask, Request, request, Response, abort

from mongoengine import register_connection
from flask.ext.mongoengine import MongoEngine

import json

from orm_models import Sample, HeaderSample, HeaderGroup
from flask_sockets import Sockets

import io
from base64 import b64decode

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
