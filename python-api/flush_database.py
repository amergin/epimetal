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
		self.client = connect( db=self.cfg.getMongoVar('db'), host=self.cfg.getMongoVar('host'), port=int(self.cfg.getMongoVar('port')), w=1 )
		self.db = _get_db()

	def getCollections(self):
		return self.db.collection_names(include_system_collections=False)

	def flush(self):
		self.client.drop_database(self.cfg.getMongoVar('db'))
		print "Flush complete"


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

	print "Warning: this utility will drop the database defined in %s" %configFile
	
	flusher = Flusher(configFile)
	collections = flusher.getCollections()
	print "[Info] Collections currently in the database: %s" % ", ".join(collections)

	regex = re.compile('(yes)', re.IGNORECASE)

	while not regex.search(keypress()):
		pass

	flusher.flush()

if __name__ == "__main__":
	main()