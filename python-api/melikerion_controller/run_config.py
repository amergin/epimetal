import ConfigParser
import os
import sys


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
		if not os.access( self.getCtrlVar( "octave_path" ), os.X_OK ):
			print "Problem with Octave binary. EXIT"
			sys.exit(-1)

		if not os.access( self.getCtrlVar( "melikerion_path" ), os.F_OK ):
			print "Melikerion sources do not exist. EXIT"
			sys.exit(-1)

	def getCtrlVar(self,var):
		return self.cfg.get( "melikerion_controller", var ) 

	def getMongoVar(self,var):
		return self.cfg.get("mongodb",var)

	def getZMQVar(self,var):
		return self.cfg.get('zeromq',var)