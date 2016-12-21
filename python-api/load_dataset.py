import os
from mongoengine import connect, Document, DynamicDocument
from mongoengine.fields import StringField, ListField
from mongoengine.queryset import DoesNotExist
import sys
from config import JSONConfig
from orm_models import Sample, HeaderSample, HeaderGroup, ExploreSettings, SOMSettings, ProfileHistogram
import json
import math
import re
import csv
import time
import copy

DATASET_VARIABLE_GROUP_NAME = 'Dataset variables'
DATASET_VARIABLE_SAMPLE_DESC = 'Variable indicating whether the sample is a member of the named dataset'
DATASET_VARIABLE_PREFIX = 'dataset_'

# Utilities, not part of the class
def _getEscapedVar(cfg, var):
	escapedVariables = cfg.getVar('dataLoader', "variables").get("escape", [])
	escapedVar = var
	for entry in escapedVariables:
		regex = entry.get('regex')
		replaceWith = entry.get('replaceWith')
		escapedVar = re.sub(regex, replaceWith, escapedVar)

	return escapedVar

def _getEscapedHeader(cfg, headerList):
	ret = []
	for header in headerList:
		ret.append( _getEscapedVar(cfg, header) )
	return ret




class DataLoader( object ):
	def __init__(self, configFile, fileName):
		self.cfg = JSONConfig(configFile)
		self.dataFile = fileName

		dataloaderSettings = self.cfg.getVar("dataLoader")
		self.topgroupSeparator = dataloaderSettings.get("metadata").get("topGroupSeparator", ":").encode("ascii", "ignore")
		
		time.sleep(10)

		dbSettings = self.cfg.getVar("database")
		connect( db=dbSettings.get("samples").get("name"), alias='samples', host=dbSettings.get("samples").get("host"), port=dbSettings.get("samples").get("port"), w=1 )
		connect( db=dbSettings.get("settings").get("name"), alias='db_settings', host=dbSettings.get("settings").get("host"), port=dbSettings.get("settings").get("port"), w=1 )
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
		print "[Info] View settings have been set"

	def _setViewSettings(self):
		def exploreSettings():
			def getDocument():
				doc = ExploreSettings.objects.first()
				return doc or ExploreSettings(histograms=[])
			histogramVars = self.cfg.getVar("dataLoader", "views").get("explore").get("defaultHistograms")
			settings = getDocument()
			saveList = list()

			for variable in histogramVars:
				escapedVar = _getEscapedVar(self.cfg, variable)
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

			def getCheckedVariables(variablesList, getReferences=False):
				ret = list()
				for variable in variablesList:
					escapedVar = _getEscapedVar(self.cfg, variable)
					appendVariable = None
					try:
						varFromDb = HeaderSample.objects.get(name=escapedVar)
						if getReferences == True:
							appendVariable = varFromDb
						else:
							appendVariable = varFromDb.name
						ret.append(appendVariable)
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

				confProfiles = self.cfg.getVar("dataLoader", "views").get("som").get("defaultProfiles")
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

			def setInputVariables(settings):
				variables = self.cfg.getVar("dataLoader", "views").get("som").get("defaultInputVariables")
				checkedVariables = getCheckedVariables(variables)

				settings.inputVariables = checkedVariables

			def setDefaultPlanes(settings):
				variables = self.cfg.getVar("dataLoader", "views").get("som").get("defaultPlanes")
				checkedVariables = getCheckedVariables(variables)

				settings.planes = checkedVariables


			def setPivot(settings):
				pivotSettings = self.cfg.getVar("dataLoader", "views").get("som").get("pivot")
				enabled = pivotSettings.get("enabled", False)
				settings.pivotEnabled = enabled

				if enabled == True:
					variable = pivotSettings.get("defaultVariable")
					variableReference = getCheckedVariables([variable], True)
					settings.pivotVariable = variableReference[0]

			settings = getSettingDoc()

			setProfiles(settings)
			setInputVariables(settings)
			setDefaultPlanes(settings)
			setPivot(settings)

			settings.save()


		exploreSettings()
		somSettings()

	def _datasetVariablesEnabled(self):
		return self.cfg.getVar("dataLoader", "createDatasetVariables") == True

	def _getDatasetVariableGroup(self):
		return HeaderGroup.objects.get(name=DATASET_VARIABLE_GROUP_NAME)

	def _modifyHeader(self, headerList):
		def _getNewGroupOrder():
			sortedGroups = HeaderGroup.objects.order_by('-order')
			if not sortedGroups:
				return 1
			else:
				return sortedGroups.limit(1)[0].order + 1


		# creates base definitions for dataset variables if the setting has been
		# enabled in the config
		def _createDatasetVariableGroup():
			# create the new group for dataset variables
			print "[Info] Creating dataset variable group"
			try:
				HeaderGroup.objects.get(name=DATASET_VARIABLE_GROUP_NAME)
			except DoesNotExist, e:
				group = HeaderGroup(name=DATASET_VARIABLE_GROUP_NAME, \
					order = _getNewGroupOrder() \
				)
				group.save()

		def _createHeaderObjects(headerList):

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
				#res = HeaderGroup.objects.get_or_create(name=groupName, \
				#	defaults={ 'name': groupName, 'topgroup': topGroup, 'order': _getNewGroupOrder() })
				#print "getgroup result = ", res
				#return res
				try:
					return HeaderGroup.objects.get(name=groupName)
				except DoesNotExist, e:
					group = HeaderGroup(name=groupName, \
						topgroup=topGroup, \
						order=_getNewGroupOrder() \
					)
					group.save()
					return group


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

			metadataFileName = self.cfg.getVar("dataLoader", "metadata").get("file")
			metadataSeparator = self.cfg.getVar("dataLoader", "metadata").get("columnSeparator").encode("ascii", "ignore")
			metaHeaderDict = dict()
			metaHeaderRegexDict = dict()

			# 1. read all metadata from file and form a dictionary from those details.
			# assume header contains: [name, desc, unit, group]
			with open(metadataFileName, 'r') as source:
				header = []

				#print "delim=", separator, type(separator), len(separator)
				for no, line in enumerate(csv.reader(source, delimiter=metadataSeparator)):
					if(no is 0):
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
						#print "escape = ", name, _getEscapedVar(self.cfg, name)
						# rewrite variable name: might contain escaped chars
						#rowDict['name'] = _getEscapedVar(self.cfg, name)
						escapedName = _getEscapedVar(self.cfg, name)
						rowDict['name'] = escapedName
						#print "row=", metaHeaderDict[name]

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
					rowDict = getVarRegex(metaHeaderRegexDict, variable)
					# no metadata for the variable, error
					if not rowDict:
						print "[Error] No metadata found for variable %s, exit." %variable
						sys.exit(-1)
					else:
						# don't modify the original
						rowDict = copy.deepcopy(rowDict)
						rowDict['name'] = _getEscapedVar(self.cfg, variable)

				#test
				#rowDict = copy.deepcopy(rowDict)

				# check if desc contains self match pattern
				if hasSelfRegex(rowDict.get('desc')):
					#print "var=", variable, "desc has regex"
					rowDict['desc'] = variable

				group = _getGroup( rowDict.get('group') )
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
		datasetKey = self.cfg.getVar("dataLoader", "dataset").get("identifierColumn")
		sampleidKey = self.cfg.getVar("dataLoader", "dataSource").get("sampleIdColumn")

		filteredHeaderList = filter(lambda a: (a != sampleidKey and a != datasetKey), headerList)

		# create new header info if necessary
		_createHeaderObjects(filteredHeaderList)
		if self._datasetVariablesEnabled():
			_createDatasetVariableGroup()

	def _loadSamples(self):
		# removes "-characters from header if they are present
		def _removeExtraCharactersFromHeader(checkList):
			resultList = []
			for var in checkList:
				resultList.append(var.replace('"', ""))
			return resultList

		def checkDatasetVariable(name):
			prependedName = DATASET_VARIABLE_PREFIX + name
			try:
				result = HeaderSample.objects.get(name=prependedName)
			except DoesNotExist, e:
				# does not exist, so create it
				group = self._getDatasetVariableGroup()
				sample = HeaderSample(name=prependedName, \
					group=group, \
					classed=False, \
					unit='NA', \
					desc=DATASET_VARIABLE_SAMPLE_DESC \
					)
				sample.save()

				# create a reference of it to the group as well
				group.update(push__variables=sample)


		def ffloat(f):
			if not isinstance(f,float):
				return f
			if math.isnan(f):
				return 'nan'
			if math.isinf(f):
				return 'inf'
			return f

		def setDatasetVariables(currentDataset, variables):
			# 1. fetch all the dataset variables loaded
			datasetGroup = self._getDatasetVariableGroup()
			prependedCurrentDataset = DATASET_VARIABLE_PREFIX + currentDataset
			for variable in datasetGroup.variables:
				# variable.name is already prepended in creation
				if variable.name == prependedCurrentDataset:
					variables[variable.name] = 1
				else:
					variables[variable.name] = 0
			return variables

		def checkHeaderAndSampleDimensions(headerList, valuesDict, lineNo):
			if len(headerList) != len(valuesDict):
				print '[Error] Header and line lengths must agree, error at line %i' %lineNo
				sys.exit(-1)

		dataSourceSeparator = self.cfg.getVar("dataLoader", "dataSource").get("columnSeparator").encode("ascii", "ignore")

		with open(self.dataFile) as dataSource:
			header = None
			datasetKey = self.cfg.getVar("dataLoader", "dataset").get("identifierColumn")
			sampleidKey = self.cfg.getVar("dataLoader", "dataSource").get("sampleIdColumn")
			defaultDatasetName = self.cfg.getVar("dataLoader", "dataset").get("defaultName", "default")
			for lineNo, line in enumerate(dataSource):
				if( lineNo == 0):
					# header
					header = line.strip().split(dataSourceSeparator)
					header = _removeExtraCharactersFromHeader(header)
					self._modifyHeader(header)
					header = _getEscapedHeader(self.cfg, header)
					continue

				line = line.strip()

				if len(line) is 0:
					print "[Info] Line number %i is empty." %lineNo
					# empty line, silently continue
					continue

				# normal line
				values = line.strip().split(dataSourceSeparator)

				valuesDict = dict( zip( header, values ) )

				dataset = valuesDict.get(datasetKey, defaultDatasetName)

				# check every column is provided on this line
				checkHeaderAndSampleDimensions(header, valuesDict, lineNo)

				checkDatasetVariable(dataset)

				variables = {}
				for key, value in valuesDict.iteritems():
					# dataset and samplename or not numeric; skip
					if key == datasetKey or key == sampleidKey:
						continue
					try:
						filteredCharacters = valuesDict[key].replace('"', "").replace("'", "")
						variables[key.encode('ascii')] = ffloat( float( filteredCharacters ) )
					except ValueError:
						variables[key.encode('ascii')] = ffloat( float('NaN') )
				#print "values=", valuesDict, sampleidKey

				# add the dataset variable, if enabled, to the bunch:
				if self._datasetVariablesEnabled():
					setDatasetVariables(dataset, variables)

				sample = Sample(dataset=dataset, sampleid=valuesDict[sampleidKey], variables=variables)
				sample.save()


def main():
	# Assume config file name if not provided
	configFile = 'setup.json'
	tsvFile = None

	if( len(sys.argv) < 2 or len(sys.argv) > 3):
		print "[Error] Invalid parameters provided."
		print "Valid parameters: script.py samples.tsv [setup.json]"
		sys.exit(-1)

	elif( len( sys.argv ) is 2 ):
		print "[Info] Assume config file is located at setup.json"
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