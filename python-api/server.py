import os
from mongoengine import connect, Document, DynamicDocument
from mongoengine.fields import StringField, ListField
import sys
from config import Config
import flask
from flask import Flask, Request, request

from mongoengine import connect, Document, DynamicDocument
from mongoengine.fields import StringField, ListField
from orm_models import Sample, Header
import json

from flask_sockets import Sockets


PREFIX = '/API/'

app = Flask('plotter-api')
sockets = Sockets(app)

@app.route( PREFIX + 'headers/NMR_results', methods=['GET'])
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

@app.route( PREFIX + 'datasets', methods=['GET'] )
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


@app.route( PREFIX + 'list/<variable>/in/<dataset>' )
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
	connect( db=config.getMongoVar('db'), host=config.getMongoVar('host'), port=int(config.getMongoVar('port')) )
	app.run(host=config.getFlaskVar('host'), port=int(config.getFlaskVar('port')), debug=True)
