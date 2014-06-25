from melikerion_orm_models import SOM, Plane, SOMTask, PlaneTask

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
	return SOM.objects.filter(id=idStr)

def getExistingSOM(variables, datasets):
	return SOM.objects.filter( \
		variables__size=len(variables), variables__all=variables, \
		datasets__size=len(datasets), datasets__all=datasets).first()

def createTask(datasets, variables):
	task = SOMTask(datasets=datasets, variables=variables)
	task.save()
	return task

def createSOM(datasets, variables, fileDict):

	doc = SOM(datasets=datasets, variables=variables)
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

def taskExists(datasets, variables):
	return len(SOMTask.objects.filter( \
		variables__size=len(variables), variables__all=variables, \
		datasets__size=len(datasets), datasets__all=datasets)) > 0