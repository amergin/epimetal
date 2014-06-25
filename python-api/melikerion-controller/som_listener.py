import os
import sys
import random
import string
import datetime
import timeit
import shutil
import simplejson as json

import subprocess
import shlex

import zmq
import threading

# from other custom python class files
from run_config import Config
from zmq_controller import ZMQController

from mongoengine import connect
from melikerion_orm_models import SOM, Plane, SOMTask, PlaneTask

# Constants
ARG_SEPARATOR = ':'
INPUT_VARS_FILENAME = 'variables.in'
INPUT_SAMPLES_FILENAME = 'samples.in'
INPUT_HEADER_FILENAME = 'samples_header.in'
OCTAVE_ERR_EXIT_CODE = 1

# Melikerion file naming conventions. Note that these are used
# in the Octave scripts as well.
MELIKERION_SM_FILENAME = 'results_sm.json'
MELIKERION_XSTATS_FILENAME = 'results_xstats.json'
MELIKERION_BMUS_FILENAME = 'results_bmus.txt'
MELIKERION_ZI_FILENAME = 'results_zi.txt'

# exit statuses
EXIT_SUCCESS = 0
EXIT_ERR_UNDETERMINED = -1
EXIT_ERR_PARAMS = -10
EXIT_ERR_CONFIG = -20

EXIT_ERR_MELIKERION_ERROR = -300


# Utility functions

def getObjectId(idStr):
	obj = None
	try:
		obj = ObjectId(idStr)
	except InvalidId:
		print "[Error] Not a valid ObjectId"
		return { 'result': False }
	return { 'result': True, 'doc': obj }

def tooManyTasks(cfg):
	if len(SOMTask.objects) > cfg.getCtrlVar('max_concurrent_tasks'):
		return True
	return False

def getSOM(idStr):
	return SOM.objects.filter(id=idStr)

def getExistingSOM(variables, datasets):
	return SOM.objects.filter( \
		variables__size=len(variables), variables__all=variables, \
		datasets__size=len(datasets), datasets__all=datasets).first()

def createTask(datasets, variables):
	task = SOMTask(datasets=datasets, variables=variables)
	task.save()
	return task

def deleteTask(id):
	SOMTask(id=id).delete()

def createSOM(datasets, variables, fileDict):

	doc = SOM(datasets=datasets, variables=variables)
	for fileKey, filePath in fileDict.iteritems():
		handle = open( filePath, 'r' )
		doc[fileKey].put( handle )
		handle.close()

	doc.save()
	print "Inserted SOM document, ID = %s" %str(doc.id)
	return doc

def getErrorResponse(message):
	return { 'result': { 'code': 'error', 'message': message }, 'data': {} }

def getSuccessResponse(data):
	return { 'result': { 'code': 'success'}, 'data': data }

def taskExists(datasets, variables):
	return len(SOMTask.objects.filter( \
		variables__size=len(variables), variables__all=variables, \
		datasets__size=len(datasets), datasets__all=datasets)) > 0


# --------------------------------------------------------


class SOMProcessHandler( object ):
	def __init__(self, config, variables, datasets, samples):
		self.cfg = config
		self.samples = samples
		self.variables = variables
		self.datasets = datasets

		# filled later on
		self.path = None
		self.id = None
		self.somDoc = None

	def getDocument(self):
		return self.somDoc

	def _createTaskDirectory(self):
		if not os.path.exists(self.path):
			#print "Creating path %s" %self.path
			os.makedirs(self.path)

	# Creates the files containing which variables will be used & input samples
	def _prepTaskDirectory(self):
		#Create sample data file
		with open( self.path + '/' + INPUT_SAMPLES_FILENAME, 'w') as sampleFile:
			json.dump({ 'variables': self.variables, 'samples': self.samples}, sampleFile)

	def _delTaskDirectory(self):
		#print "Deleting path %s" %self.path
		shutil.rmtree(self.path)

	def start(self):
		resultId = ''

		self.id = str(createTask(self.variables, self.datasets).id)

		try:
			resultId = self._execMelikerion()
		except:
			pass
		finally:
			deleteTask(self.id)

		# Delete the task document since it is completed
		deleteTask(self.id)

		return resultId

	def _execMelikerion(self):
		config = self.cfg

		self.path = config.getCtrlVar('task_file_path') + "/" + str(self.id)

		octavePath = config.getCtrlVar('octave_path')
		melikerionPath = config.getCtrlVar('melikerion_path')
		jsonlabPath = config.getCtrlVar('jsonlab_path')

		self._createTaskDirectory()
		self._prepTaskDirectory()

		somParams = "createsom(%s, %s)" %( \
			"'" + self.path + "'", \
			"'" + INPUT_SAMPLES_FILENAME + "'" \
			)
		call = [ octavePath, '--norc', '--silent', '--no-line-editing', '--no-init-file',
		'--path', melikerionPath,
		'--path', jsonlabPath,
		'--eval', somParams ]
		process = subprocess.call(call)
		if process is not 0:
			# Melikerion execution failed
			print "[Info] Octave exited with error code."
			return EXIT_ERR_MELIKERION_ERROR

		#print "Octave exited."

		fileDict = dict()
		fileDict['som'] = self.path + "/" + MELIKERION_SM_FILENAME
		fileDict['bmu'] = self.path + "/" + MELIKERION_BMUS_FILENAME
		fileDict['xstats'] = self.path + "/" + MELIKERION_XSTATS_FILENAME
		fileDict['zi'] = self.path + "/" + MELIKERION_ZI_FILENAME

		# Save som computations to db
		self.somDoc = createSOM(self.datasets, self.variables, fileDict)

		# Delete working directory
		#self._delTaskDirectory()

		return process


class SOMWorker( object ):
	def __init__(self, config, workerNumber, workerUrl, zmq, context=None):
		self.cfg = config
		self.no = workerNumber
		self.url = workerUrl

		# start socket
		self.context  = context or zmq.Context.instance()
		self.socket = self.context.socket(zmq.REP)
		self.socket.connect(workerUrl)

		# start listening
		self.start()

	# tests the validity of received parameters
	def _testSOMParams(self, message):
		variables = message.get('variables')
		datasets = message.get('datasets')
		samples = message.get('samples')
		somId = message.get('id')

		# straight-forward request where the client already knows the
		# preprocessed SOM id
		if somId:
			objIdDetails = getObjectId(somId)
			if not objIdDetails.get('result'):
				return False
			return True

		if not variables or not datasets:
			print "[Error] Incorrect syntax for request"
			return False
		if len(variables) is 0 or len(datasets) is 0:
			print "[Error] Variables or datasets is empty."
			return False

		if not samples:
			print "[Error] Samples not defined."
			return False
		for var in variables:
			if not samples.get(var):
				print "[Error] Samples for variable %s are not defined." %var
				return False
		return True

	def start(self):
		print "[Worker %i]: Listening for incoming requests" %self.no

		while True:
			message = self.socket.recv_json()
			print "[Info] Received message..."

			if tooManyTasks(self.cfg):
				print "[Info] Too many tasks, reject"
				# message here
				#self.socket.send_json(response)
				continue

			if not self._testSOMParams(message):
				self.socket.send_json( getErrorResponse(message) )
			else:
				# GET request containing the objectId
				objIdStr = message.get('id')
				if objIdStr:
					doc = getSOM( objIdStr )
					if not doc:
						# the provided ObjectID is not in the DB
						self.socket.send_json( getErrorResponse( 'SOM ID not found' ) )
					else:
						self.socket.send_json( getSuccessResponse( { 'id': objIdStr, 'variables': doc.variables, 'datasets': doc.datasets } ) )
					continue

				datasets = message.get('datasets')
				variables = message.get('variables')
				samples = message.get('samples')
				if taskExists(datasets, variables):
					# wait here
					pass

				existing = getExistingSOM(variables, datasets)
				if existing:
					self.socket.send_json( 
						getSuccessResponse( 
							{ 'id': str(existing.id), 
							'variables': existing.variables, 
							'datasets': existing.datasets } ) )

				else:
					# nothing ready, have to compute
					print "[Info] No pre-existing SOM computation, execute Melikerion."
					handler = SOMProcessHandler(self.cfg, variables, datasets, samples)

					thread = threading.Thread( target=handler.start )
					thread.start()
					# block the response until the computation is complete
					thread.join()
					# all OK, send response
					somDoc = handler.getDocument()
					self.socket.send_json( getSuccessResponse({ 'variables': variables, 'datasets': datasets, 'id': str(somDoc.id) }) )


# Main function
if __name__ == "__main__":

	configFile = ''

	if( len( sys.argv ) is 1 ):
		print "[Info] Assume config file is run.config"
		configFile = "run.config"

	elif( len( sys.argv ) is 2 ):
		configFile = sys.argv[1]

	# Assume config file name if not provided
	if( len( sys.argv ) > 2 ):
		print "Extra parameters provided, omitted."
		print "Example: py26 som_listener.py [run.config]"

	if not os.access( configFile, os.R_OK ):
		print "[Error] Could not open config file. EXIT"
		sys.exit(EXIT_ERR_CONFIG)

	config = Config(configFile)

	# connect to mongodb
	connect( config.getMongoVar('db'), host=config.getMongoVar('host'), port=int(config.getMongoVar('port')) )

	zmq = ZMQController('som', config, SOMWorker)

	# Start listening to the socket
	zmq.start()

	sys.exit(EXIT_SUCCESS)