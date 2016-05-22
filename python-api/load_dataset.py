import os
from mongoengine import connect, Document, DynamicDocument
from mongoengine.fields import StringField, ListField
from mongoengine.queryset import DoesNotExist
import sys
from config import Config
from orm_models import Sample, HeaderSample, HeaderGroup, ExploreSettings, SOMSettings, ProfileHistogram
import json
import math
import re
import csv

LINE_SEPARATOR = "\t"
TOPGROUP_SEPARATOR = ":"

# Utilities, not part of the class
def _getEscapedVar(var):
	# escape '/'
	escapedVar = re.sub(r'\/', 'to', var)
	# escape '%'
	escapedVar = re.sub(r'%', 'prc', escapedVar)
	# probably others too, but except some sanity in the input!
	return escapedVar

def _getEscapedHeader(headerList):
	ret = []
	for header in headerList:
		ret.append( _getEscapedVar(header) )
	return ret




class DataLoader( object ):
	def __init__(self, config, fileName):
		self.cfg = Config(config)
		self.file = fileName
		connect( db=self.cfg.getMongoVar('db'), alias='samples', host=self.cfg.getMongoVar('host'), port=int(self.cfg.getMongoVar('port')), w=1 )
		connect( db=self.cfg.getMongoVar('settings_db'), alias='db_settings', host=self.cfg.getMongoVar('host'), port=int(self.cfg.getMongoVar('port')), w=1 )
		# has 'C|' in the beginning
		self.classVarRegex = re.compile('(C\|)(.+)', re.IGNORECASE)

	def load(self):
		print "[Info] Starting to load samples"
		#self._loadSamples()
		print "[Info] Loading complete"
		self._setViewSettings()
		print "[Info] Default settings have been set"

	def _setViewSettings(self):
		def exploreSettings():
			def getDocument():
				doc = ExploreSettings.objects.first()
				return doc or ExploreSettings(histograms=[])
			histogramVars = self.cfg.getDataLoaderVar("explore_default_histograms", True)
			settings = getDocument()
			saveList = list()

			for variable in histogramVars:
				escapedVar = _getEscapedVar(variable)
				try:
					varFromDb = HeaderSample.objects.get(name=escapedVar)
					saveList.append(varFromDb.name)
				except DoesNotExist, e:
					raise ValueError("Trying to set variable %s as one of the variables. Error: this variable has not been imported to the database." %variable)

			settings.histograms = saveList
			settings.save()

		def somSettings():
			def getSettingDoc():
				return SOMSettings.objects().first() or SOMSettings(profiles=[])

			def getCheckedVariables(variables):
				ret = list()
				for variable in variables:
					escapedVar = _getEscapedVar(variable)
					try:
						varFromDb = HeaderSample.objects.get(name=escapedVar)
						ret.append(varFromDb.name)
					except DoesNotExist, e:
						raise ValueError("Trying to set variable %s as one of the variables. Error: this variable has not been imported to the database." %variable)
				return ret

			def setProfiles(settings):
				def clearProfiles():
					ProfileHistogram.objects.all().delete()

				def getVariablesFromRegex(regex):
					variables = HeaderSample.objects(name=re.compile(regex, re.IGNORECASE))
					return [v.name for v in variables]

				clearProfiles()

				confProfiles = self.cfg.getDataLoaderVar("som_profiles", True)
				for profile in confProfiles:
					name = profile.get('name')
					regex = profile.get('regex', None)
					# regex = None
					variables = None
					if regex:
						profileDoc.regex = regex
						variables = getVariablesFromRegex(regex)
					else:
						variables = getCheckedVariables(profile.get('variables'))
					profileDoc = ProfileHistogram(name=name, variables=variables)
					profileDoc.save()

					settings.profiles.append(profileDoc)
				settings.save()

			def setInputVariables(settings):
				variables = self.cfg.getDataLoaderVar("som_input_variables", True)
				checkedVariables = getCheckedVariables(variables)

				settings.inputVariables = checkedVariables
				settings.save()


			settings = getSettingDoc()

			setProfiles(settings)
			setInputVariables(settings)


		exploreSettings()
		somSettings()


	def _modifyHeader(self, headerList):
		def _createHeaderObjects(headerList):
			def _getNewGroupOrder():
				sortedGroups = HeaderGroup.objects.order_by('-order')
				if not sortedGroups:
					return 1
				else:
					return sortedGroups.limit(1)[0].order + 1

			def _getGroup(name):
				topGroup = None
				groupName = name
				if TOPGROUP_SEPARATOR in name:
					split = name.split(TOPGROUP_SEPARATOR)
					topGroup = split[0].strip()
					groupName = split[1].strip()
				return HeaderGroup.objects.get_or_create(name=groupName, \
					defaults={ 'name': groupName, 'topgroup': topGroup, 'order': _getNewGroupOrder() })

			def _getSample(name):
				return HeaderSample.objects(name=name)

			def _isClassVariable(payload):
				unit = payload.get('unit')
				return self.classVarRegex.search(unit) is not None

			def getSplitClassVariable(payload):
				unit = payload.get('unit')
				content = self.classVarRegex.search(unit).group(2)
				return dict( keypair.split("=") for keypair in content.split("|") )


			fileName = self.cfg.getDataLoaderVar('header_file')
			headerDict = dict()

			# 1. read all metadata from file and form a dictionary from those details
			# assume header contains: [name, desc, unit, group]
			with open( fileName, 'r' ) as tsv:
				header = []
				for no, line in enumerate(csv.reader(tsv, delimiter="\t")):
					if( no is 0 ):
						header = line
						continue
					rowDict = dict(zip(header, line))
					headerDict[rowDict.get('name')] = rowDict
					# rewrite variable name: might contain escaped chars
					rowDict['name'] = _getEscapedVar( rowDict.get('name') )

			#2. Add only variables that are actually loaded into the database from the TSV file
			for variable in headerList:
				rowDict = headerDict.get(variable)
				group, created = _getGroup( rowDict.get('group') )
				samp = _getSample(rowDict.get('name'))
				if not samp:
					payload = rowDict
					if _isClassVariable(payload):
						payload['classed'] = True
						payload['unit'] = getSplitClassVariable(payload)

					payload['group'] = group
					samp = HeaderSample(**payload)
					samp.save()
					group.variables.append(samp)
					group.save()
				else:
					# header already exists, do nothing
					pass

		# omit sampleid & dataset
		datasetKey = self.cfg.getDataLoaderVar('dataset_identifier')
		sampleidKey = self.cfg.getDataLoaderVar('sampleid_identifier')
		header = filter(lambda a: (a != sampleidKey and a != datasetKey), headerList)

		# create new header info if necessary
		_createHeaderObjects(header)

	def _loadSamples(self):
		def ffloat(f):
			if not isinstance(f,float):
				return f
			if math.isnan(f):
				return 'nan'
			if math.isinf(f):
				return 'inf'
			return f

		def checkHeaderAndSampleDimensions(headerList, valuesDict, lineNo):
			if len(headerList) != len(valuesDict):
				print '[Error] Header and line lengths must agree, error at line %i' %lineNo
				sys.exit(-1)

		with open( self.file ) as fi:
			header = None
			datasetKey = self.cfg.getDataLoaderVar('dataset_identifier')
			defaultDatasetName = self.cfg.getDataLoaderVar('dataset_default')
			sampleidKey = self.cfg.getDataLoaderVar('sampleid_identifier')
			for lineNo, line in enumerate(fi):
				if( lineNo == 0):
					# header
					header = line.strip().split(LINE_SEPARATOR)
					self._modifyHeader(header)
					header = _getEscapedHeader(header)
					continue

				line = line.strip()

				if len(line) is 0:
					# empty line, silently continue
					continue

				# normal line
				values = line.strip().split(LINE_SEPARATOR)

				valuesDict = dict( zip( header, values ) )

				dataset = valuesDict.get(datasetKey, defaultDatasetName)
				checkHeaderAndSampleDimensions(header, valuesDict, lineNo)

				variables = {}
				for key, value in valuesDict.iteritems():
					if key == datasetKey or key == sampleidKey:
						continue
					try:
						variables[key.encode('ascii')] = ffloat( float(valuesDict[key]) )
					except ValueError:
						variables[key.encode('ascii')] = ffloat( float('NaN') )
				sample = Sample(dataset=dataset, sampleid=valuesDict[sampleidKey], variables=variables)
				sample.save()


def main():
	# Assume config file name if not provided
	configFile = 'setup.config'
	tsvFile = None

	if( len(sys.argv) < 2 or len(sys.argv) > 3):
		print "[Error] Invalid parameters provided."
		print "Valid parameters: script.py samples.tsv [setup.config]"
		sys.exit(-1)

	elif( len( sys.argv ) is 2 ):
		print "[Info] Assume config file is located at setup.config"
		tsvFile = sys.argv[1]

	elif( len( sys.argv) is 3):
		tsvFile = sys.argv[1]
		configFile = sys.argv[2]

	if not tsvFile or not os.access( tsvFile, os.R_OK ):
		print "[Error] could not read TSV file. EXIT"
		sys.exit(-1)

	if not os.access( configFile, os.R_OK ):
		print "[Error] could not read configuration file. EXIT"
		sys.exit(-1)

	loader = DataLoader(configFile, tsvFile)
	loader.load()

if __name__ == "__main__":
	main()