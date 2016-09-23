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
import time
import copy

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
		self.dataFile = fileName
		self.columnSeparator = self.cfg.getDataLoaderVar("column_separator")
		self.topgroupSeparator = self.cfg.getDataLoaderVar("topgroup_separator")
		
		time.sleep(10)
				
		connect( db=self.cfg.getMongoVar('db'), alias='samples', host=self.cfg.getMongoVar('host'), port=int(self.cfg.getMongoVar('port')), w=1 )
		connect( db=self.cfg.getMongoVar('settings_db'), alias='db_settings', host=self.cfg.getMongoVar('host'), port=int(self.cfg.getMongoVar('port')), w=1 )
		# has 'C|' in the beginning
		self.classVarRegex = re.compile('(\|C\|)(.+)', re.IGNORECASE)
		self.regVarPattern = "|regex|"
		self.regVarRegex = re.compile(re.escape(self.regVarPattern), re.IGNORECASE)
		self.selfRegex = re.compile('\|self\|', re.IGNORECASE)

	def load(self):
		print "[Info] Starting to load samples"
		self._loadSamples()
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
					settingsDoc = SOMSettings.objects.first()
					if settingsDoc:
						settingsDoc.profiles = []

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

			def _checkDimensions(headerList, lineList, lineNo):
				if len(headerList) != len(lineList):
					print "[Error] Metadata file: header and line length must agree. Error at line %i." %(lineNo+1)
					sys.exit(-1)

			def _getGroup(name):
				topGroup = None
				groupName = name
				if self.topgroupSeparator in name:
					split = name.split(self.topgroupSeparator)
					topGroup = split[0].strip()
					groupName = split[1].strip()
				#print "getGroup=", groupName, "topgroup=", topGroup, "name=", name
				#print "input=", groupName, "topgroup=", topGroup, "name=", name
				res = HeaderGroup.objects.get_or_create(name=groupName, \
					defaults={ 'name': groupName, 'topgroup': topGroup, 'order': _getNewGroupOrder() })
				#print "getgroup result = ", res
				return res


			def _getSample(name):
				return HeaderSample.objects(name=name)

			def _isClassVariable(payload):
				unit = payload.get('unit')
				return self.classVarRegex.search(unit) is not None

			def getSplitClassVariable(payload):
				unit = payload.get('unit')
				content = self.classVarRegex.search(unit).group(2)
				return dict( keypair.split("=") for keypair in content.split("|") )

			def varIsRegex(string):
				return self.regVarRegex.search(string) is not None

			def hasSelfRegex(string):
				return self.selfRegex.search(string) is not None

			# find the cached compiled regex by looping the recorded ones,
			# if something is found then return the rowDict, otherwise
			# return None
			def getVarRegex(regexDict, string):
				#print "searching =", string, "from dict=", regexDict
				for matchString, payload in regexDict.iteritems():
					result = payload.get('regex').search(string)
					if result is not None:
						return payload.get('row')
				return None

			metadataFileName = self.cfg.getDataLoaderVar('metadata_file')
			separator = self.cfg.getDataLoaderVar('column_separator')
			metaHeaderDict = dict()
			metaHeaderRegexDict = dict()

			# 1. read all metadata from file and form a dictionary from those details
			# assume header contains: [name, desc, unit, group]
			with open(metadataFileName, 'r') as tsv:
				header = []

				#print "delim=", separator, type(separator), len(separator)
				for no, line in enumerate(csv.reader(tsv, delimiter="\t")):
					if( no is 0 ):
						header = line
						continue

					_checkDimensions(header, line, no)

					rowDict = dict(zip(header, line))
					name = rowDict.get('name')
					if varIsRegex(name):
						raw = name.replace(self.regVarPattern, "")
						metaHeaderRegexDict[raw] = { 
							'regex': re.compile(raw, re.IGNORECASE),
							'row': rowDict
						}
					else:
						metaHeaderDict[name] = rowDict
						# rewrite variable name: might contain escaped chars
						rowDict['name'] = _getEscapedVar(name)
					#print "metadata rowdict=", rowDict

			#2. Add only variables that are actually loaded into the database from the TSV file
			# headerList comes from the data source file
			#print "headerList=", headerList
			#print "metaHeaderDict=", metaHeaderDict
			#print "metaHeaderRegexDict", metaHeaderRegexDict
			for variable in headerList:
				rowDict = metaHeaderDict.get(variable)
				#print "var=", variable, "dict=", rowDict
				# if variable is not found, it might be matched
				# with one of the regex's
				if not rowDict:
					#print "could not for var=", variable
					rowDict = getVarRegex(metaHeaderRegexDict, variable)
					# no metadata for the variable, error
					if not rowDict:
						print "[Error] No metadata found for variable %s, exit." %variable
						sys.exit(-1)
					else:
						# don't modify the original
						rowDict = copy.deepcopy(rowDict)
						rowDict['name'] = variable

				# check if desc contains self match pattern
				if hasSelfRegex(rowDict.get('desc')):
					#print "var=", variable, "desc has regex"
					rowDict['desc'] = variable

				#print "rowDict=", rowDict
				#print "after fetch=", rowDict
				group, created = _getGroup( rowDict.get('group') )
				samp = _getSample(rowDict.get('name'))
				if not samp:
					# account for the case the group is matched more than
					# once due to regex. Make no modifications to the original
					# metadata payload so it can be reused in further iterations.
					# That is, make a copy of the original.
					payload = copy.deepcopy(rowDict)
					if _isClassVariable(payload):
						payload['classed'] = True
						#print "payload=", payload
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

		with open(self.dataFile) as fi:
			header = None
			datasetKey = self.cfg.getDataLoaderVar('dataset_identifier')
			sampleidKey = self.cfg.getDataLoaderVar('sampleid_identifier')
			defaultDatasetName = self.cfg.getDataLoaderVar('dataset_default')
			for lineNo, line in enumerate(fi):
				if( lineNo == 0):
					# header
					header = line.strip().split("\t")#self.columnSeparator)
					self._modifyHeader(header)
					header = _getEscapedHeader(header)
					continue

				line = line.strip()

				if len(line) is 0:
					print "[Info] Line number %i is empty." %lineNo
					# empty line, silently continue
					continue

				# normal line
				values = line.strip().split("\t")#self.columnSeparator)

				valuesDict = dict( zip( header, values ) )

				dataset = valuesDict.get(datasetKey, defaultDatasetName)

				# check every column is provided on this line
				checkHeaderAndSampleDimensions(header, valuesDict, lineNo)

				variables = {}
				for key, value in valuesDict.iteritems():
					# dataset and samplename or not numeric; skip
					if key == datasetKey or key == sampleidKey:
						continue
					try:
						variables[key.encode('ascii')] = ffloat( float(valuesDict[key]) )
					except ValueError:
						variables[key.encode('ascii')] = ffloat( float('NaN') )
				#print "values=", valuesDict, sampleidKey
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