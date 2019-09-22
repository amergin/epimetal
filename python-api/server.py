import os
import sys
from config import JSONConfig
import flask
from flask import Flask, Request, request, Response, abort

from mongoengine import register_connection
from mongoengine.queryset import DoesNotExist
from mongoengine.errors import NotUniqueError
from flask_mongoengine import MongoEngine

import json

from orm_models import Sample, HeaderSample, HeaderGroup, BrowsingState, SOMTrain, SOMPlane, ExploreSettings, SOMSettings, ProfileHistogram

from server_utils import _getModifiedParameters, _getUrlSalt, _getHashids, \
_getSizeOfDict, withoutKeys, \
flatten, dictSubset, variablesExist, variablesExistObject, legalSOM, legalSOMHash, \
legalString, isArray, legalArray, legalBool

from pymongo import ReadPreference

import io
import StringIO
import zipfile
from base64 import b64decode

from hashids import Hashids
import hashlib
import time


def getInitializedMongoEngine(app):
	register_connection(
		'samples', 
		name=config.getVar("database", "samples").get("name"),
		host=config.getVar("database", "samples").get("host"),
		port=config.getVar("database", "samples").get("port")
		)

	register_connection(
		'som', 
		name=config.getVar("database", "som").get("name"),
		host=config.getVar("database", "som").get("host"),
		port=config.getVar("database", "som").get("port")
		)

	register_connection(
		'db_settings', 
		name=config.getVar("database", "settings").get("name"),
		host=config.getVar("database", "settings").get("host"),
		port=config.getVar("database", "settings").get("port")
		)

	db = MongoEngine(app)
	return db

def getInitializedFlask(config):
	API_PREFIX = config.getVar("http", "api").get("prefix")

	print "[Info] Prefix is %s" %API_PREFIX

	app = Flask(__name__)

	app.config['DEBUG'] = True
	app.config['SECRET_KEY'] = os.urandom(24)
	app.config['MONGODB_SETTINGS'] = [
		{
			'DB': config.getVar("database", "samples").get("name"),
			'ALIAS': 'samples',
			'HOST': config.getVar("database", "samples").get("host"),
			'PORT': config.getVar("database", "samples").get("port"),
			'READ_PREFERENCE': ReadPreference.PRIMARY_PREFERRED
		},
		{
			'db': config.getVar("database", "som").get("name"),
			'ALIAS': 'som',
			'HOST': config.getVar("database", "som").get("host"),
			'PORT': config.getVar("database", "som").get("port")
		},
		{
			'db': config.getVar("database", "settings").get("name"),
			'ALIAS': 'db_settings',
			'HOST': config.getVar("database", "settings").get("host"),
			'PORT': config.getVar("database", "settings").get("port")
		},

	]

	# -------------------------------------------------------#
	# -------------------------------------------------------#
	#                    ROUTES START                        #
	# -------------------------------------------------------#	
	# -------------------------------------------------------#

	@app.route( API_PREFIX + 'settings/explore/histograms', methods=['GET'])
	def exploreHistograms():
		try:
			doc = ExploreSettings.objects.first()
			resp = flask.jsonify({
				'success': 'true',
				'query': request.path,
				'result': { 
					'variables': doc.histograms
				}
			})
			resp.status_code = 200 # OK
			return resp

		except DoesNotExist, e:
			resp = flask.jsonify({
			'success': 'false',
			'query': request.path,
			'result': { 'message': 'Settings document not found.' }
			})
			resp.status_code = 500
			return resp	

	@app.route( API_PREFIX + 'settings/som/input', methods=['GET'])
	def somInput():
		try:
			doc = SOMSettings.objects.first()
			resp = flask.jsonify({
				'success': 'true',
				'query': request.path,
				'result': { 
					'variables': doc.inputVariables
				}
			})
			resp.status_code = 200 # OK
			return resp

		except DoesNotExist, e:
			resp = flask.jsonify({
			'success': 'false',
			'query': request.path,
			'result': { 'message': 'Settings document not found.' }
			})
			resp.status_code = 500
			return resp	

	@app.route( API_PREFIX + 'settings/som/planes', methods=['GET'])
	def somPlanes():
		try:
			doc = SOMSettings.objects.first()
			resp = flask.jsonify({
				'success': 'true',
				'query': request.path,
				'result': { 
					'variables': doc.planes
				}
			})
			resp.status_code = 200 # OK
			return resp

		except DoesNotExist, e:
			resp = flask.jsonify({
			'success': 'false',
			'query': request.path,
			'result': { 'message': 'Settings document not found.' }
			})
			resp.status_code = 500
			return resp

	@app.route( API_PREFIX + 'settings/som/pivot', methods=['GET'])
	def somPivot():
		try:
			doc = SOMSettings.objects.first()

			resp = flask.jsonify({
				'success': 'true',
				'query': request.path,
				'result': {
					'enabled': doc.pivotEnabled,
					'variable': doc.pivotVariable.name
				}
			})
			resp.status_code = 200 # OK
			return resp

		except DoesNotExist, e:
			resp = flask.jsonify({
			'success': 'false',
			'query': request.path,
			'result': { 'message': 'Settings document not found.' }
			})
			resp.status_code = 500
			return resp	

	@app.route( API_PREFIX + 'settings/som/profiles', methods=['GET'])
	def somProfiles():
		def getProfiles(profiles):
			def getProfile(pro):
				return {
					'variables': pro.variables,
					'name': pro.name
				}
			return [getProfile(pro) for pro in profiles]

		try:
			doc = SOMSettings.objects.first()

			resp = flask.jsonify({
				'success': 'true',
				'query': request.path,
				'result': {
					'profiles': getProfiles(doc.profiles)
				}
			})
			resp.status_code = 200 # OK
			return resp

		except DoesNotExist, e:
			resp = flask.jsonify({
			'success': 'false',
			'query': request.path,
			'result': { 'message': 'Settings document not found.' }
			})
			resp.status_code = 500
			return resp	

	@app.route( API_PREFIX + 'headers/NMR_results', methods=['GET'])
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

	@app.route( API_PREFIX + 'som/plane/<somId>/<variable>', methods=['GET'] )
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
			'success': 'false',
			'query': request.path,
			'result': { 'message': 'Hash not found.' }
			})
			resp.status_code = 204 # No content
			return resp

	@app.route( API_PREFIX + 'som/plane', methods=['POST'] )
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

			'''
			print "legalVariable=", legalVariable(variable), \
			"variablesExist([variable])=", variablesExist([variable]), \
			"legalPlane(plane)=", legalPlane(plane), \
			"legalSOM=", legalSOM(som)
			'''


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

	@app.route( API_PREFIX + 'som/<somHash>', methods=['GET'] )
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
			'success': 'false',
			'query': request.path,
			'result': { 'message': 'Hash not found.' }
			})
			resp.status_code = 204 # No content
			return resp



	# stores a new set of som training information to db
	@app.route( API_PREFIX + 'som', methods=['POST'] )
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

			pivotSettings = payload.get('pivot', {})
			pivotEnabled = pivotSettings.get('enabled', None)
			pivotVariable = pivotSettings.get('variable', '')

			somDocId = None

			'''print "legalDistance(neighdist)=", legalDistance(neighdist)
			print "legalString(somHash)=", legalString(somHash)
			print "legalNumber(epoch)=", legalNumber(epoch)
			print "legalNumber(rows)=", legalNumber(rows)
			print "legalNumber(cols)=", legalNumber(cols)
			print "legalArray(bmus)=", legalArray(bmus)
			print "legalArray(weights)=", legalArray(weights)
			print "legalArray(codebook)=", legalArray(codebook)
			print "legalArray(variables)=", legalArray(variables)
			print "variablesExist(variables)=", variablesExist(variables)
			print "legalArray(distances)=", legalArray(distances)
			print"legalArray(distances)=", legalDescription(description)'''


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
			legalBool(pivotEnabled) and \
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
						description=description,
						pivotEnabled=pivotEnabled)
					if(pivotEnabled):
						somDoc.pivotVariable = pivotVariable
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
			print "exception occurred", e
			exc_type, exc_obj, exc_tb = sys.exc_info()
			fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
			print(exc_type, fname, exc_tb.tb_lineno)
			return getError()

	@app.route( API_PREFIX + 'state/<hashId>', methods=['GET'] )
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


	@app.route( API_PREFIX + 'state', methods=['POST'] )
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
			#print "1 = ", isinstance(regression, dict)
			#print "2 = ", isinstance(regression.get('selected'), dict)
			#print "3 = ", variablesExistObject(regression.get('selected'))

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

			def validMenu(common):
				return isinstance(common.get('menu', None), dict)

			def validVariables(common):
				return variablesExistObject(common.get('variables', []))

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
				#print "common=", validCommon(common)
				#print "browsing=", validBrowsing(browsing)
				return getError()
		except Exception, e:
			print "exception occured", e
			exc_type, exc_obj, exc_tb = sys.exc_info()
			fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
			print(exc_type, fname, exc_tb.tb_lineno)
			return getError()


	@app.route( API_PREFIX + 'datasets', methods=['GET'] )
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

	@app.route( API_PREFIX + 'export/svg', methods=['POST'] )
	def exportSVG():
		suffix = '.svg'
		filename = request.form.get('filename', 'export') + suffix
		try:
			svgFile = io.BytesIO( b64decode( request.form.get('payload') ) )
		except:
			abort(400)
		return flask.send_file( svgFile,
			as_attachment=True, mimetype='image/svg+xml', attachment_filename=filename)


	@app.route( API_PREFIX + 'export/png', methods=['POST'] )
	def exportPNG():
		suffix = '.png'
		filename = request.form.get('filename', 'export') + suffix
		try:
			pngFile = io.BytesIO( b64decode( request.form.get('payload') ) )
		except:
			abort(400)
		return flask.send_file( pngFile,
			as_attachment=True, mimetype='image/png', attachment_filename=filename)

	@app.route( API_PREFIX + 'export/tsv', methods=['POST'] )
	def exportRegression():
		def varFile(vars):
			f = StringIO.StringIO()
			f.write("\n".join(vars))
			return f

		def datasetResultFiles(results, datasets):
			def addHeader(f):
				# write header
				headers = ['variable', 'computation_succeeded', 'data_source', 'beta0', 'beta1', 'CI1', 'CI2', 'p_value']
				f.write(COLUMN_SEPARATOR.join(headers)+"\n")

			def dsetResult(results, dsetInd, f):
				for res in results:
					dsetPayload = res.get('payload')[dsetInd]
					contents = [res.get('variable')]
					succeeded = dsetPayload.get('result').get('success')
					contents += [succeeded]
					contents += [dsetPayload.get('name')]
					if succeeded is False:
						contents += [float('nan')]
						contents += [float('nan')]
						contents += [float('nan')]
					else:
						contents += dsetPayload.get('betas')
						contents += dsetPayload.get('ci')
						contents += [dsetPayload.get('pvalue')]
					f.write(COLUMN_SEPARATOR.join(str(c) for c in contents))
					f.write("\n")

			dsetResults = list()
			FILE_NAME_SUFFIX = '.tsv'
			for no, dset in enumerate(datasets):
				f = StringIO.StringIO()
				addHeader(f)
				filename = "results_" + dset + FILE_NAME_SUFFIX
				dsetResult(results, no, f)
				dsetResults.append({ 'filename': filename, 'file': f })
			return dsetResults


		ARCHIVE_SUFFIX = '.zip'
		COLUMN_SEPARATOR = '\t'
		filename = request.form.get('filename', 'export') + ARCHIVE_SUFFIX
		try:
			# 1. files to indicate the used variables
			payload = json.loads(b64decode( request.form.get('payload') ))
			adjustFile = varFile(payload.get('input').get('adjust'))
			assocFile = varFile(payload.get('input').get('association'))
			targetFile = varFile(payload.get('input').get('target'))
			dsetResultFiles = datasetResultFiles(payload.get('results'), payload.get('datasets'))

			resultZip = io.BytesIO()
			with zipfile.ZipFile(resultZip, mode='w', compression=zipfile.ZIP_DEFLATED) as archiveFile:
				archiveFile.writestr('covariates.txt', adjustFile.getvalue())
				archiveFile.writestr('exposure_variables.txt', assocFile.getvalue())
				archiveFile.writestr('outcome_variable.txt', targetFile.getvalue())
				for dsetResultFile in dsetResultFiles:
					archiveFile.writestr(dsetResultFile.get('filename'), dsetResultFile.get('file').getvalue())
			resultZip.seek(0)
			return flask.send_file(resultZip,
				as_attachment=True, mimetype='application/zip', attachment_filename=filename)
		except:
			abort(400)

	@app.route( API_PREFIX + 'list/', methods=['POST'] )
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

			datasetCorrectType = ( isinstance( dataset, str ) or isinstance( dataset, unicode ) )
			variablesCorrectType = isinstance( variables, list )
			correctVariables = variablesExist(variables)

			#if not( dataset and variables) or not \
			#( ( isinstance( dataset, str ) or isinstance( dataset, unicode ) ) and isinstance( variables, list ) )
			#	return getError()

			#print "datasetCorrectType=", datasetCorrectType
			#print "variablesCorrectType=", variablesCorrectType
			#print "correctVariables", correctVariables

			if not ( dataset and variables) or not \
			(datasetCorrectType and variablesCorrectType) or not \
			correctVariables:
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


	# -------------------------------------------------------#
	# -------------------------------------------------------#
	#                    ROUTES END                          #
	# -------------------------------------------------------#	
	# -------------------------------------------------------#
	return app

if __name__ == '__main__':

	configFile = "setup.json"
	if(len(sys.argv) is 2):
		configFile = sys.argv[1]

	print "[Info] Starting HTTP API with config file %s" %configFile
	config = JSONConfig(configFile)

	app = getInitializedFlask(config)
	db = getInitializedMongoEngine(app)

	settings = config.getVar("http", "api")

	app.run(
		host=settings.get("host"),
		port=settings.get("port"),
		debug=True
	)

else:
	configFile = "setup.json"
	print "[Info] Starting HTTP API with config file %s" %configFile
	config = JSONConfig(configFile)

	app = getInitializedFlask(config)
	db = getInitializedMongoEngine(app)
