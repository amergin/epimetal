from melikerion_orm_models import SOM, Plane, PlaneTask

def tooManyTasks(cfg):
	if len(PlaneTask.objects) > cfg.getCtrlVar('max_concurrent_tasks'):
		return True
	return False

def createTask(somObj, variable):
	task = PlaneTask(som=somObj, variable=variable)
	task.save()
	return task

def createPlane(somObj, variable, plane):
	plane = Plane(som=somObj, variable=variable, plane=plane)
	plane.save()
	return plane

def getPlane(objIdStr):
	return Plane.objects.filter(id=objIdStr).first()

def findPlane(somObjIdStr, variable):
	return Plane.objects.filter(som=somObjIdStr, variable=variable).first()

def getErrorResponse(message):
	return { 'result': { 'code': 'error', 'message': message }, 'data': {} }

def getSuccessResponse(data):
	return { 'result': { 'code': 'success'}, 'data': data }

def getSOM(objIdStr):
	return SOM.objects.filter(id=objIdStr).first()

def taskExists(somObjIdStr, variable):
	return len(PlaneTask.objects) > 0 and len(PlaneTask.objects.filter(som=somObjIdStr, variable=variable)) > 0

