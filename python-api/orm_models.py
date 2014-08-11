from mongoengine import Document, DynamicDocument, CASCADE
from mongoengine.fields import StringField, ListField, DictField, IntField, ReferenceField, GenericReferenceField

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

class HeaderGroup(Document):
	name = StringField(unique=True)
	order = IntField(required=True, unique=True)

	variables = ListField(GenericReferenceField())#ReferenceField('HeaderSample', reverse_delete_rule=CASCADE))

	meta = {
		'indexes': [
			{'fields': ['order'], 'unique': True },
			{'fields': ['name'], 'unique': True }
		]
	}

class HeaderSample(Document):
	group = ReferenceField('HeaderGroup', required=True, reverse_delete_rule=CASCADE)
	name = StringField(unique=True, required=True)
	unit = StringField()
	desc = StringField()

	meta = {
	'indexes': [
		{'fields': ['group', 'name', 'unit', 'desc'] },
		{'fields': ['name'], 'unique': True }
		]
	}

