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

import threading

# from other custom python class files
from run_config import Config
from mongoengine import connect
from zmq_controller import ZMQController

from plane_db_methods import *

# Constants
#INPUT_VARS_FILENAME = 'variables.in'
#INPUT_SAMPLES_FILENAME = 'samples.in'
#INPUT_HEADER_FILENAME = 'samples_header.in'
OCTAVE_ERR_EXIT_CODE = 1

# Melikerion file naming conventions. Note that these are used
# in the Octave scripts as well.
MELIKERION_SM_FILENAME = 'input_sm.json'
MELIKERION_XSTATS_FILENAME = 'input_xstats.json'
MELIKERION_BMUS_FILENAME = 'input_bmus.txt'
MELIKERION_ZI_FILENAME = 'input_zi.txt'
MELIKERION_SAMPLES_FILENAME = 'input_samples.json'
MELIKERION_TSAMPLES_FILENAME = 'input_tsamples.txt'

# exit statuses
EXIT_SUCCESS = 0
EXIT_ERR_UNDETERMINED = -1
EXIT_ERR_PARAMS = -10
EXIT_ERR_CONFIG = -20

EXIT_ERR_MONGO_CONNECTION = -100
EXIT_ERR_MONGO_DETAILS = -110

EXIT_ERR_MELIKERION_ERROR = -300


#-------------------------------------------------------------

# Melikerion operations
class PlaneProcessHandler( object ):
	def __init__(self, config, somDoc, testVariable, inputVariables, samples): 
		self.cfg = config
		self.somDoc = somDoc
		self.testVar = testVariable
		self.inputVars = inputVariables
		self.samples = samples

		# filled later on
		self.path = None
		self.id = None
		self.planeDoc = None

	def _createTaskDirectory(self):
		if not os.path.exists(self.path):
			#print "Creating path %s" %self.path
			os.makedirs(self.path)

	# Creates the files containing which variables will be used & input samples
	def _prepTaskDirectory(self):

		# Read SOM files and put to task directory
		bmuFile = open( self.path + "/" + MELIKERION_BMUS_FILENAME, 'w' )
		bmuFile.write( self.somDoc.bmu.read() )
		bmuFile.close()

		smFile = open( self.path + "/" + MELIKERION_SM_FILENAME, 'w' )
		smFile.write( self.somDoc.som.read() )
		smFile.close()

		xstatsFile = open( self.path + "/" + MELIKERION_XSTATS_FILENAME, 'w' )
		xstatsFile.write( self.somDoc.xstats.read() )
		xstatsFile.close()

		ziFile = open( self.path + "/" + MELIKERION_ZI_FILENAME, 'w' )
		ziFile.write( self.somDoc.zi.read() )
		ziFile.close()

		with open( self.path + '/' + MELIKERION_SAMPLES_FILENAME, 'w') as sampleFile:
			json.dump(
				{ 'inputvars': dict(zip( self.inputVars, [True for i in range(1, len(self.inputVars)+1)])), #self.inputVars, \
				'testvar': { self.testVar: True }, #self.testVar, \
				'samples': self.samples }, \
				sampleFile )

	def _delTaskDirectory(self):
		#print "Deleting path %s" %self.path
		shutil.rmtree(self.path)

	def start(self):
		try:
			self.task = createTask(self.somDoc, self.testVar)
			self.id = str(self.task.id)
			self._execMelikerion()
		except:
			print "[Error] Melikerion execution threw exception."
		finally:
			# Delete working directory
			self._delTaskDirectory()
			# Delete the task document since it is completed
			self.task.delete()

	def getPlaneDoc(self):
		return self.planeDoc

	def _execMelikerion(self):
		config = self.cfg
		self.path = config.getCtrlVar('task_file_path') + "/" + str(self.id)

		octavePath = config.getCtrlVar('octave_path')
		melikerionPath = config.getCtrlVar('melikerion_path')
		jsonlabPath = config.getCtrlVar('jsonlab_path')

		self._createTaskDirectory()
		self._prepTaskDirectory()

		params = "create_visplane(%s, %s)" %( \
			"'" + self.path + "'", \
			"'" + MELIKERION_SAMPLES_FILENAME + "'" \
			)
		call = [ octavePath, '--norc', '--silent', '--no-line-editing', '--no-init-file', \
		'--path', melikerionPath, \
		'--path', jsonlabPath,
		'--eval', params ]
		process = subprocess.call(call)
		if process is not 0:
			# Melikerion execution failed
			print "[Info] Melikerion execution failed"
			return EXIT_ERR_MELIKERION_ERROR

		# read the resulting plane json file
		fileName = self.path + "/" + 'results_plane.json' #%self.testVar
		handle = open(fileName, 'r')
		plane = json.loads(handle.read())
		handle.close()

		print "[Info] Melikerion execution complete."

		# Save output files to database
		self.planeDoc = createPlane(self.somDoc, self.testVar, plane)
		return process

#------------------------------------------------------------------


class PlaneWorker( object ):
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
	def _testPlaneParams(self, message):
		if not message.get('samples') \
		or not message.get('variables'):
			print "[Error] Samples or variables not defined"
			return { 'result': False }

		testVar = message.get('variables').get('test')
		somId = message.get('som')

		if not testVar or not somId:
			print "[Error] Incorrect syntax for request"
			return { 'result': False }

		objIdDetails = getObjectId(somId)
		if not objIdDetails.get('result'):
			return objIdDetails

		if len( message.get('variables').get('input') ) is 0:
			print "[Error] No defined input variables"
			return { 'result': False }

		testSamples = message.get('samples').get(testVar)
		if not testSamples:
			print "[Error] Test samples not defined"
			return { 'result': False }

		return { 'result': True }

	def start(self):
		print "[Worker %i]: Listening for incoming requests" %self.no

		while True:
			message = self.socket.recv_json()
			print "[Info] Received message..."

			if tooManyTasks(self.cfg):
				print "[Info] Too many tasks, reject"
				#message here
				continue

			planeDocId = message.get('planeid')
			if planeDocId:
				planeDoc = getPlane( planeDocId )
				if not planeDoc:
					continue
				self.socket.send_json( getSuccessResponse({ 
					'plane': planeDoc.plane, 
					'variable': planeDoc.variable, 
					'id': str(planeDoc.id),
					'som_id': str(planeDoc.som) }) )
				continue

			else:

				somDocId = message.get('som')
				if not somDocId:
					self.socket.send_json( getErrorResponse('No SOM Id provided.') )
					continue
				somDoc = getSOM( somDocId )

				variable = message.get('variables').get('test')

				if taskExists( somDocId, variable ):
					# wait here
					print "[Info] Task exists."
					continue

				planeDoc = findPlane( somDocId, variable )
				if planeDoc:
					# already in the database
					self.socket.send_json( getSuccessResponse({ 
						'plane': planeDoc.plane,
						'variable': variable,
						'id': str(planeDoc.id),
						'som_id': somDocId }) )
					continue

				inputVariables = message.get('variables').get('input')
				samples = message.get('samples')

				# Does not exist, needs to be computed

				handler = PlaneProcessHandler( self.cfg, somDoc, variable, inputVariables, samples )
				print "[Info] No pre-existing Plane computation, execute Melikerion."
				thread = threading.Thread( target=handler.start )
				thread.start()
				# wait thread to complete
				thread.join()

				planeDoc = handler.getPlaneDoc()
				self.socket.send_json( getSuccessResponse({ 
					'plane': planeDoc.plane,
					'variable': planeDoc.variable,
					'id': str(planeDoc.id),
					'som_id': somDocId }) )


#---------------------------------------------------------------

# Main function
if __name__ == "__main__":

	configFile = "run.config"
	variable = ''
	somObjectId = None

	# Assume config file name if not provided
	if( len( sys.argv ) is 2 ):
		configFile = sys.argv[1]
	else:
		print "[Info] Assume config file is located at run.config"

	config = Config(configFile)

	# connect to mongodb
	connect( config.getMongoVar('db'), host=config.getMongoVar('host'), port=int(config.getMongoVar('port')) )

	zmq = ZMQController('plane', config, PlaneWorker)
	zmq.start()

	sys.exit(EXIT_SUCCESS)