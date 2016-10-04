import os
import sys
from mongoengine import connect
from mongoengine.connection import _get_db
from config import Config
import re

KEYBOARD_REGEX = '(C\|)(?:.+)'

class Flusher(object):
	def __init__(self, config):
		self.cfg = Config(config)
		self.client = connect(db=self.cfg.getMongoVar('db'), host=self.cfg.getMongoVar('host'), port=int(self.cfg.getMongoVar('port')), w=1)
		print self.client

	def getSampleCollections(self):
		db = self.client[self.cfg.getMongoVar('db')]
		return db.collection_names(include_system_collections=False)

	def getSOMCollections(self):
		db = self.client[self.cfg.getMongoVar('somdb')]
		return db.collection_names(include_system_collections=False)

	def getSettingsCollections(self):
		db = self.client[self.cfg.getMongoVar('settings_db')]
		return db.collection_names(include_system_collections=False)

	def flush(self):
		self.client.drop_database(self.cfg.getMongoVar('db'))
		self.client.drop_database(self.cfg.getMongoVar('somdb'))
		self.client.drop_database(self.cfg.getMongoVar('settings_db'))
		print "[Info] Flush complete"

def main():

	def keypress():
		confirm = raw_input("To wipe the database, type yes and press [enter] -> ")
		return confirm

	# Assume config file name if not provided
	configFile = 'setup.config'
	tsvFile = None

	if( len(sys.argv) < 2 ):
		print "[Error] Invalid parameters provided."
		print "Valid parameters: script.py setup.config"
		sys.exit(-1)

	if( len(sys.argv) is 2 ):
		configFile = sys.argv[1]
		print "[Info] Setup file chosen as %s" %configFile

	if not os.access( configFile, os.R_OK ):
		print "[Error] could not read configuration file. EXIT"
		sys.exit(-1)

	print "Warning: this utility will drop the databases defined in %s" %configFile
	
	flusher = Flusher(configFile)
	sampleCollections = flusher.getSampleCollections()
	somCollections = flusher.getSOMCollections()
	settingsCollections = flusher.getSettingsCollections()

	print "[Info] Collections currently in the sample database: %s" % ", ".join(sampleCollections)
	print "[Info] Collections currently in the SOM database: %s" % ", ".join(somCollections)
	print "[Info] Collections currently in the settings database: %s" % ", ".join(settingsCollections)

	regex = re.compile('(yes)', re.IGNORECASE)

	while not regex.search(keypress()):
		pass

	flusher.flush()

if __name__ == "__main__":
	main()