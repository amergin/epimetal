import sys

from orm_models import Sample, SOMTrain
from mongoengine.queryset import DoesNotExist
from hashids import Hashids

def _getModifiedParameters(variables):
  ret = ['sampleid', 'dataset']
  prefix = 'variables.'
  for var in variables:
    ret.append( prefix + var )
  return ret

def _getUrlSalt():
  ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
  return ''.join(random.choice(ALPHABET) for i in range(24))

def _getHashids():
  # returns always with a new salt
  return Hashids(salt=_getUrlSalt(), min_length=8)

def _getSizeOfDict(d):
  size = sys.getsizeof(d)
  size += sum(map(sys.getsizeof, d.itervalues())) + sum(map(sys.getsizeof, d.iterkeys())) 
  return size

def withoutKeys(dictionary, keys):
  for excludeKey in keys:
    dictionary.pop(excludeKey, None)

def flatten(l): 
  return [item for sublist in l for item in sublist]

def dictSubset(dictionary, keys):
  return dict([(i, dictionary[i]) for i in keys if i in dictionary])  

def variablesExist(array):
  variables = Sample.objects.first().variables
  for variable in array:
    if variables.get(variable) is None:
      print "variable NOT defined = ", variable
      return False
  return True

def variablesExistObject(obj):
  variables = Sample.objects.first().variables
  array = None
  if isinstance(obj, list):
    array = obj
  elif obj.get('type', '') == 'db':
    array = [obj]
  elif isinstance(obj, dict):
    array = flatten(obj.values())

  for variable in array:
    if variable.get('type') == 'db':
      if not variable.get('name') in variables:
        return False
    else:
      # custom is not processed, TODO
      pass
  return True

def legalSOM(var):
  if (isinstance(var, str) or isinstance(var, unicode)) and len(var) > 0:
    try: 
      return SOMTrain.objects.get(id=var.encode('utf8')) is not None
    except DoesNotExist, e:
      return False
  else:
    return False

def legalSOMHash(var):
  if (isinstance(var, str) or isinstance(var, unicode)) and len(var) > 0:
    try: 
      return SOMTrain.objects.get(somHash=var.encode('utf8')) is not None
    except DoesNotExist, e:
      return False
  else:
    return False

def legalString(var):
  return (isinstance(var, unicode) or isinstance(var, str)) and len(var) > 0

def isArray(variable):
  return isinstance(variable, list)

def legalArray(var):
  def isNotEmpty(array):
    return len(array) > 0

  return isArray(var) and isNotEmpty(var)

def legalBool(var):
  return isinstance(var, bool)


