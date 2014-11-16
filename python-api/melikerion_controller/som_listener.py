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

from time import time, sleep

# from other custom python class files
from run_config import Config
from zmq_controller import ZMQController

from mongoengine import connect
from som_db_methods import *

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

CONCURRENCY_WAIT_TIME = 240

# --------------------------------------------------------


class SOMProcessHandler( object ):
	def __init__(self, config, variables, samples):
		self.cfg = config
		self.variables = variables
		self.samples = samples

		# filled later on
		self.path = None
		self.id = None
		self.somDoc = None
		self.successExitStatus = None

	def resultIsSuccess(self):
		return self.successExitStatus

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
		try:
			self.task = createTask(self.variables, self.samples.get('id'))
			self.id = str(self.task.id)
			resultId = self._execMelikerion()
		except Exception, e:
			print "[Error] SOM Listener threw exception:"
			print e
		finally:
			self.task.delete()



	def _execMelikerion(self):
		def _createBMUs(fileName, samples):
			bmus = list()
			with open(fileName, 'r') as f:
				for no, line in enumerate(f, start=0):
					# skip header
					if no == 0:
						continue
					if not line.strip():
						continue
					d = dict()
					xy = line.strip().split("\t")
					d['y'] = int(xy[0])
					d['x'] = int(xy[1])
					d['sample'] = samples['id'][no-1]
					bmus.append(d)
			return bmus

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
		call = [ octavePath, '--norc', '--silent', '--no-line-editing', '--no-init-file', '--no-history',
		'--path', melikerionPath,
		'--path', jsonlabPath,
		'--eval', somParams ]
		process = subprocess.call(call)
		if process is not 0:
			# Melikerion execution failed
			print "[Info] Octave exited with error code."
			self.successExitStatus = False
			return EXIT_ERR_MELIKERION_ERROR

		#print "Octave exited."

		fileDict = dict()
		fileDict['som'] = self.path + "/" + MELIKERION_SM_FILENAME
		fileDict['xstats'] = self.path + "/" + MELIKERION_XSTATS_FILENAME
		fileDict['zi'] = self.path + "/" + MELIKERION_ZI_FILENAME

		bmuFilename = self.path + "/" + MELIKERION_BMUS_FILENAME
		bmus = _createBMUs( bmuFilename, self.samples )

		# Save som computations to db
		self.somDoc = createSOM(self.samples.get('id'), self.variables, fileDict, bmus)

		# Delete working directory
		self._delTaskDirectory()

		self.successExitStatus = True
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
		samples = message.get('samples')
		somId = message.get('somid')

		# straight-forward request where the client already knows the
		# preprocessed SOM id
		if somId:
			objIdDetails = getObjectId(somId)
			if not objIdDetails.get('result'):
				return False
			return True

		if not variables:
			print "[Error] Incorrect syntax for request"
			return False
		if len(variables) is 0:
			print "[Error] Variables empty."
			return False
		if not samples:
			print "[Error] Samples not defined."
			return False
		if len(samples) is 0 or len(samples.get('id')) is 0:
			print "[Error] Samples empty."
			return false
		for var in variables:
			if not samples.get(var):
				print "[Error] Samples for variable %s are not defined." %var
				return False
		return True

	def start(self):
		print "[Worker %i]: Listening for incoming requests" %self.no

		while True:
			message = self.socket.recv_json()
			#print "message=", message
			print "[Info] Received message..."

			if tooManyTasks(self.cfg):
				print "[Info] Too many tasks, reject"
				self.socket.send_json( getErrorResponse('Too many other computations on the server. Please wait a while.') )
				continue

			if not self._testSOMParams(message):
				self.socket.send_json( getErrorResponse(message) )
			else:
				# GET request containing the objectId
				objIdStr = message.get('somid')
				if objIdStr:
					doc = getSOM( objIdStr )
					if not doc:
						# the provided ObjectID is not in the DB
						self.socket.send_json( getErrorResponse( 'SOM ID not found' ) )
					else:
						self.socket.send_json( getSuccessResponse( { 
							'id': objIdStr, 
							'variables': doc.variables, 
							#'samples': doc.samples,
							'bmus': doc.plane_bmu
						} ) )
					continue

				variables = message.get('variables')
				samples = message.get('samples')
				if taskExists(variables, samples.get('id')):
					print "[Info] Task exists, wait."
					startTime = time()
					waitTime = 0
					while taskExists( variables, samples.get('id') ) and waitTime < CONCURRENCY_WAIT_TIME:
						sleep(3)
						waitTime = time() - startTime


				existing = getExistingSOM(variables, samples.get('id'))
				if existing:
					self.socket.send_json( 
						getSuccessResponse( 
							{ 'id': str(existing.id), 
							'variables': existing.variables,
							#'samples': existing.samples,
							'bmus': existing.plane_bmu } ) )

				else:
					# nothing ready, have to compute
					print "[Info] No pre-existing SOM computation, execute Melikerion."
					handler = SOMProcessHandler(self.cfg, variables, samples)

					thread = threading.Thread( target=handler.start )
					thread.start()
					# block the response until the computation is complete
					thread.join()
					if not handler.resultIsSuccess():
						self.socket.send_json( getErrorResponse('Internal error while executing Melikerion software.') )
					else:
						# all OK, send response
						somDoc = handler.getDocument()
						self.socket.send_json( getSuccessResponse({ 
							'variables': variables, 
							#'samples': samples, 
							'id': str(somDoc.id),
							'bmus': somDoc.plane_bmu
						}) )


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