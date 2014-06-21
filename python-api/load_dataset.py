import os
from mongoengine import connect, Document, DynamicDocument
from mongoengine.fields import StringField, ListField
import sys
from config import Config
from orm_models import Sample, Header
import json
import math
import re

LINE_SEPARATOR = "\t"
SAMPLEID_STRING ="sampleid"

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
		connect( db=self.cfg.getMongoVar('db'), host=self.cfg.getMongoVar('host'), port=int(self.cfg.getMongoVar('port')) )

	def load(self):
		self._loadSamples()
		print "[Info] Loading complete"

	def _modifyHeader(self, headerList):
		def _createHeaderObjects(headerList):
			def _findVarInfo(var, headerInfo):
				escapedVar = _getEscapedVar(var)
				lookup = headerInfo.get(var)
				if lookup:
					return { 'name': escapedVar, 'group': lookup['group'], 'unit': lookup['unit'], 'desc': lookup['name'] }
				else:
					return { 'name': escapedVar, 'group': '', 'unit': '', 'desc': '' }


			headLookup = dict()
			d = dict()
			# convert to lookup table for fast access
			with open( self.cfg.getDataLoaderVar('header_file'), 'r' ) as headFile:
				headerInfo = json.loads( headFile.read() )
				for head in headerInfo:
					headLookup[ head.get('id') ] = head			

			for header in headerList:
				varInfo = _findVarInfo(header, headLookup)
				# do not use the original header because it may contain unescaped characters
				d[ varInfo['name'] ] = varInfo
			return d

		doc = Header.objects.first()

		# omit sampleid
		header = filter(lambda a: a != SAMPLEID_STRING, headerList)

		headerObjs = _createHeaderObjects(header)
		# fresh database, create header doc just once
		if not doc:
			obj = Header(variables=headerObjs)
			obj.save()
		else:
			# only modify header collection if variable is missing
			for head in header:
				if not doc.variables.get(head):
					doc.variables[head] = { 'name': head, 'group': '', 'desc': '', 'unit': '' }
			doc.save()

	def _loadSamples(self):
		def ffloat(f):
			if not isinstance(f,float):
				return f
			if math.isnan(f):
				return 'nan'
			if math.isinf(f):
				return 'inf'
			return f

		with open( self.file ) as fi:
			header = None
			for lineNo, line in enumerate(fi):
				if( lineNo == 0):
					# header
					header = line.strip().split(LINE_SEPARATOR)
					self._modifyHeader(header)
					header = _getEscapedHeader(header)
					continue

				# normal line
				values = line.split(LINE_SEPARATOR)

				# assume first is always dataset
				dataset = values[0]
				valuesDict = dict( zip( header, values[1:] ) )
				variables = {}
				for key, value in valuesDict.iteritems():
					if key == SAMPLEID_STRING:
						continue
					variables[key.encode('ascii')] = ffloat( float(valuesDict[key]) )
				sample = Sample( dataset=dataset, sampleid=valuesDict[SAMPLEID_STRING], variables=variables)
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