import ConfigParser
import os
import json
import sys

import json

class JSONConfig(object):
	def __init__(self, configFile):
		self.file = configFile
		try:
			with open(self.file) as file:
				self.data = json.load(file)
		except:
			print "[Error] Could not open configuration file %s." % configFile
			sys.exit(-1)

	def getVar(self, category, param = None):
		value = None
		if param is None:
			value = self.data.get(category)
		else:
			value = self.data.get(category).get(param)
			if value is None:
				raise ValueError("[Error] Could not read config category = " + category + ", variable = " + param)
		return value