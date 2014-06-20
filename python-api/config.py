import ConfigParser
import os

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

	def getDataLoaderVar(self,var):
		return self.cfg.get("data_loader", var)

	def getFlaskVar(self,var):
		return self.cfg.get("flask", var)

	def getMongoVar(self,var):
		return self.cfg.get("mongodb",var)