from mongoengine import Document, DynamicDocument
from mongoengine.fields import StringField, ListField, DictField

class Sample(DynamicDocument):
	dataset = StringField()
	sampleid = StringField()
	variables = DictField()
	#'variables' will be added dynamically later on

	meta = {
	'indexes': [ 
		{'fields': ('dataset', 'sampleid'), 'unique': True},
		{'fields': ['dataset'] }
	] }

class Header(Document):
	variables = DictField()
	
	meta = {
	'indexes': [ 
		{'fields': ['variables'] }
	] }