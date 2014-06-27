import os
#from mongoengine import connect, Document, DynamicDocument
#from mongoengine.fields import StringField, ListField
import sys
from config import Config
import flask
from flask import Flask, Request, request, Response, abort

from flask.ext.mongoengine import MongoEngine
import json

from orm_models import Sample, Header 
from flask_sockets import Sockets

import io
from base64 import b64decode

app = Flask(__name__)
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
sockets = Sockets(app)

@app.route( config.getFlaskVar('prefix') + 'headers/NMR_results', methods=['GET'])
def headers():
	headerObj = Header.objects.first()
	retDict = { 'query': request.path }
	if not headerObj:
		retDict['success'] = False
		retDict['result'] = []
		response = flask.jsonify( retDict )
		response.status_code = 400
		return response
	else:
		retDict['success'] = True
		retDict['result'] = headerObj.variables.values()

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

	if not Sample.objects.filter(dataset=dataset).count():
		response = flask.jsonify({
			'success': 'false',
			'query': request.path,
			'result': { 'error': 'No such dataset.' }
		})
		response.status_code = 400
		return response

	results = Sample.objects.filter(dataset=dataset).only('sampleid', 'variables.'+variable)
	
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
