from melikerion_orm_models import SOM, Plane, SOMTask, PlaneTask
from pymongo.errors import InvalidId
from bson.objectid import ObjectId
import hashlib
import json

# Utility functions
def getObjectId(idStr):
	obj = None
	try:
		obj = ObjectId(idStr)
	except InvalidId:
		print "[Error] Not a valid ObjectId"
		return { 'result': False }
	return { 'result': True, 'doc': obj }

def tooManyTasks(cfg):
	if len(SOMTask.objects) > cfg.getCtrlVar('max_concurrent_tasks'):
		return True
	return False

def getSOM(idStr):
	return SOM.objects.filter(id=idStr).first()

def getExistingSOM(variables, samples):
	return SOM.objects.filter( \
		variables__size=len(variables), variables__all=variables, \
		samples__size=len(samples), samples__all=samples).first()

def createTask(variables, ids):
	task = SOMTask(variables=variables, samples=ids)
	task.save()
	return task

def createSOM(samples, variables, fileDict, bmus):
	def getHash(samples,variables):
		idString = json.dumps(samples + variables, sort_keys=True, ensure_ascii=True, separators=(',',':'))
		return hashlib.md5( idString ).hexdigest()
	md5hash = getHash(samples,variables)
	doc = SOM(samples=samples, variables=variables, plane_bmu=bmus, hash=md5hash)
	for fileKey, filePath in fileDict.iteritems():
		handle = open( filePath, 'r' )
		doc[fileKey].put( handle )
		handle.close()
	doc.save()
	print "Inserted SOM document, ID = %s" %str(doc.id)
	return doc

def getErrorResponse(message):
	return { 'result': { 'code': 'error', 'message': message }, 'data': {} }

def getSuccessResponse(data):
	return { 'result': { 'code': 'success'}, 'data': data }

def taskExists(variables, samples):
	return len(SOMTask.objects.filter( \
		variables__size=len(variables), variables__all=variables, \
		samples__size=len(samples), samples__all=samples)) > 0