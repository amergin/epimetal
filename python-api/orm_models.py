from mongoengine import Document, DynamicDocument, CASCADE
from mongoengine.fields import StringField, ListField, DictField, IntField, ReferenceField, GenericReferenceField, DynamicField, BooleanField

class Sample(DynamicDocument):
	dataset = StringField(required=True, unique=False)
	sampleid = StringField(required=True, unique=False)
	variables = DictField()
	#'variables' will be added dynamically later on

	meta = {
	'indexes': [ 
		{'fields': ('dataset', 'sampleid'), 'unique': True},
		{'fields': ['dataset'] }
	],
	'db_alias': 'samples'
	}

class HeaderGroup(Document):
	name = StringField(unique=True)
	order = IntField(required=True, unique=True)

	variables = ListField(GenericReferenceField())#ReferenceField('HeaderSample', reverse_delete_rule=CASCADE))

	meta = {
		'indexes': [
			{'fields': ['order'], 'unique': True },
			{'fields': ['name'], 'unique': True }
		],
	'db_alias': 'samples'		
	}

class HeaderSample(Document):
	group = ReferenceField('HeaderGroup', required=True, reverse_delete_rule=CASCADE)
	name = StringField(unique=True, required=True)
	unit = DynamicField(required=True) #StringField()
	classed = BooleanField(required=True, default=False)
	desc = StringField()

	meta = {
	'indexes': [
		{'fields': ['group', 'name', 'unit', 'desc'] },
		{'fields': ['name'], 'unique': True }
		],
	'db_alias': 'samples'		
	}

class BrowsingState(DynamicDocument):
	urlHash = StringField(required=True, unique=True, max_length=50)
	stateHash = StringField(required=True, unique=True, max_length=50)
	activeState = StringField(unique=False, max_length=30)
	datasets = ListField(StringField(max_length=50))
	sampleCount = IntField(required=True)
	views = ListField(required=True)
	som = DictField(required=True)
	regression = DictField(required=True)

	meta = {
		'indexes': [
			{'fields': ['urlHash'], 'unique': True },
			{'fields': ['stateHash'], 'unique': True }
		],
	'db_alias': 'samples'		
	}