from mongoengine import Document, DynamicDocument, CASCADE
from mongoengine.fields import StringField, ListField, SortedListField, FloatField, IntField, DictField, IntField, ReferenceField, GenericReferenceField, DynamicField, BooleanField, DateTimeField
from datetime import datetime

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
	topgroup = StringField(unique=False, required=False)
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

class SOMTrain(Document):
	bmus = ListField(FloatField(min_value=0), required=True)
	weights = ListField(FloatField(), required=True)
	codebook = ListField(FloatField(), required=True)
	variables = SortedListField(StringField(max_length=40), required=True)
	distances = ListField(FloatField(), required=True)
	neighdist = FloatField(required=True)
	somHash = StringField(required=True, unique=True, max_length=60)
	epoch = IntField(required=True, min_value=1)
	rows = IntField(required=True, min_value=1)
	cols = IntField(required=True, min_value=1)
	description = DictField(required=True)

	meta = {
		'indexes': [
			{'fields': ['somHash'], 'unique': True }
		],
	'db_alias': 'som'
	}

class SOMPlane(Document):
	variable  = StringField(required=True, unique=True, unique_with='som')
	plane = DynamicField(required=True)
	# delete the plane doc if the original SOM is removed
	som = ReferenceField('SOMTrain', required=True, reverse_delete_rule=CASCADE)

	meta = {
	'indexes': [ 
		{'fields': ('som', 'variable'), 'unique': True}
	],
	'db_alias': 'som'
	}

class BrowsingState(DynamicDocument):
	urlHash = StringField(required=True, unique=True, max_length=50)
	browsing = ListField(DictField(), required=True)
	common = DictField(required=True)
	created = DateTimeField(default=datetime.now)

	meta = {
		'indexes': [
			{'fields': ['urlHash'], 'unique': True },
			# remove url from index after 30 days, aka TTL
			{'fields': ['created'], 'expireAfterSeconds': 2592000 }
		],
	'db_alias': 'samples'		
	}