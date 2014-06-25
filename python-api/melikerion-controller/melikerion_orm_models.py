from mongoengine import Document, DynamicDocument, CASCADE, NULLIFY
from mongoengine.fields import StringField, ListField, DynamicField, DictField, FileField, ReferenceField, DateTimeField
from datetime import datetime

class SOM(DynamicDocument):
	datasets = ListField(required=True)#, unique_with='variables')
	variables = ListField(required=True)

	# file fields
	som = FileField(required=True)
	xstats = FileField(required=True)
	bmu = FileField(required=True)
	zi = FileField(required=True)

	meta = {
	'indexes': [ 
		{'fields': ['dataset'] },
		{'fields': ['variables']}
	] }

class Plane(Document):
	variable  = StringField(required=True, unique=True, unique_with='som')
	plane = DynamicField(required=True)
	# delete the plane doc if the original SOM is removed
	som = ReferenceField('SOM', required=True, reverse_delete_rule=CASCADE)

	meta = {
	'indexes': [ 
		{'fields': ('som', 'variable'), 'unique': True}
	] }

class SOMTask(Document):
	created = DateTimeField(required=True, default=datetime.now)
	datasets = ListField(required=True)
	variables = ListField(required=True)

	meta = {
	'indexes': [ 
		#{ 'fields': ('datasets', 'variables') },
		{'fields': ['created'], 'expireAfterSeconds': 600},
		{'fields': ['datasets'] },
		{'fields': ['variables'] }
	] }

class PlaneTask(Document):
	created = DateTimeField(required=True, default=datetime.now)
	som = ReferenceField('SOM', required=True, reverse_delete_rule=NULLIFY, unique_with='tvariable')
	tvariable= StringField(required=True)

	meta = {
	'indexes': [ 
		# not supported:
		{'fields': ('som', 'tvariable'), 'unique': True },
		{'fields': ['created'], 'expireAfterSeconds': 600},
		{'fields': ['som'] },
		{'fields': ['tvariable'] }
	] }