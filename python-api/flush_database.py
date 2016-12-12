import os
import sys
from mongoengine import connect
from mongoengine.connection import _get_db
from config import JSONConfig
import re

KEYBOARD_REGEX = '(C\|)(?:.+)'
AUTOMATED_STRING = '--yes'

class Flusher(object):
	def __init__(self, config):
		self.cfg = JSONConfig(config)
		self.client = connect( \
			db=self.cfg.getVar("database", "samples").get("name"), \
			host=self.cfg.getVar("database","samples").get("host"), \
			port=self.cfg.getVar("database", "samples").get("port"), \
			w=1 \
		)

	def getSampleCollections(self):
		db = self.client[self.cfg.getVar("database", "samples").get("name")]
		return db.collection_names(include_system_collections=False)

	def getSOMCollections(self):
		db = self.client[self.cfg.getVar("database", "som").get("name")]
		return db.collection_names(include_system_collections=False)

	def getSettingsCollections(self):
		db = self.client[self.cfg.getVar("database", "settings").get("name")]
		return db.collection_names(include_system_collections=False)

	def flush(self):
		self.client.drop_database(self.cfg.getVar("database", "samples").get("name"))
		self.client.drop_database(self.cfg.getVar("database", "som").get("name"))
		self.client.drop_database(self.cfg.getVar("database", "settings").get("name"))
		print "[Info] Flush complete"

def main():

	def keypress():
		confirm = raw_input("To wipe the database, type yes and press [enter] -> ")
		return confirm

	# Assume config file name if not provided
	configFile = 'setup.json'
	tsvFile = None
	automated = False

	noArguments = len(sys.argv)

	if( noArguments < 2 ):
		print "[Error] Invalid parameters provided."
		print "Valid parameters: script.py setup.json ", "[", AUTOMATED_STRING, "]"
		sys.exit(-1)

	elif ( noArguments >= 2 ):
		configFile = sys.argv[1]
		print "[Info] Setup file chosen as %s" %configFile

		if( noArguments is 3 ):
			auto = sys.argv[2]
			if auto == AUTOMATED_STRING:
				automated = True
				print "[Info] Automated switch supplied. Will not ask for confirmation."

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

	if not automated:
		regex = re.compile('(yes)', re.IGNORECASE)

		while not regex.search(keypress()):
			pass

	flusher.flush()

if __name__ == "__main__":
	main()