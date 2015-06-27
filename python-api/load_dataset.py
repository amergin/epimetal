import os
from mongoengine import connect, Document, DynamicDocument
from mongoengine.fields import StringField, ListField
import sys
from config import Config
from orm_models import Sample, HeaderSample, HeaderGroup
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
		# has 'C|' in the beginning
		self.classVarRegex = re.compile('(C\|)(.+)', re.IGNORECASE)

	def load(self):
		self._loadSamples()
		print "[Info] Loading complete"

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
				return HeaderGroup.objects.get_or_create(name=groupName, defaults={ 'name': groupName, 'topgroup': topGroup, 'order': _getNewGroupOrder() })

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
			# assume header contains: [name, desc, unit, group]
			with open( fileName, 'r' ) as tsv:
				header = []
				for no, line in enumerate(csv.reader(tsv, delimiter="\t")):
					if( no is 0 ):
						header = line
						continue
					rowDict = dict(zip(header, line))
					rowDict['name'] = _getEscapedVar( rowDict.get('name') )

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

				dataset = valuesDict[datasetKey]
				checkHeaderAndSampleDimensions(header, valuesDict, lineNo)

				variables = {}
				for key, value in valuesDict.iteritems():
					if key == datasetKey or key == sampleidKey:
						continue
					# print "ffloat call = ", valuesDict[key]
					variables[key.encode('ascii')] = ffloat( float(valuesDict[key]) )
				sample = Sample( dataset=dataset, sampleid=valuesDict[sampleidKey], variables=variables)
				sample.save()


def main():
	# Assume config file name if not provided
	configFile = 'setup.config'
	tsvFile = None

	if( len(sys.argv) < 2 ):
		print "[Error] TSV file not provided. EXIT"
		sys.exit(-1)

	elif( len( sys.argv ) is 2 ):
		print "[Info] Assume config file is located at setup.config"
		tsvFile = sys.argv[1]

	elif( len( sys.argv) is 3):
		tsvFile = sys.argv[1]
		configFile = sys.argv[2]
	else:
		print "[Error] Invalid parameters provided."
		print "Valid parameters: script.py filename.tsv [setup.config]"
		sys.exit(-1)

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