import datetime
from config import Config
from mongoengine import MongoEngine
from melikerion_orm_models import SOM, Plane, SOMTask, PlaneTask
import zmq
import os
import json

# Client for MongoDB operations
class MongoDataBaseClient( object ):
	def __init__(self, config ):
		pass