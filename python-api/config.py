import ConfigParser
import os
import json

# Handles run configuration operations
class Config( object ):
	def __init__(self, configFile ):
		self.cfg = self._getConfig(configFile)
		self._checkValidity()

	def _getConfig(self,configFile):
		config = ConfigParser.RawConfigParser()
		config.read(configFile)
		return config

	def _checkValidity(self):
		#sys.exit(-1)
		pass

	def getJSONVariable(self, category, var):
		raw = self.cfg.get(category, var)
		return json.loads(raw)

	def getDataLoaderVar(self,var, useJson=False):
		raw = self.cfg.get("data_loader", var)
		return json.loads(raw) if useJson else raw

	def getFlaskVar(self,var):
		return self.cfg.get("flask", var)

	def getMongoVar(self,var):
		return self.cfg.get("mongodb",var)