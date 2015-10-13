function CrossfilterDimension() {

  var _type,
    _variable = null,
    _count = 0,
    $injector,
    _groups = {},
    _dimension = null,
    _instance,
    _destructFn,
    _creationFn,
    _obj = {},
    _filterFn = null,
    _oldFilterFn = null,
    _sticky = false,
    _filters = null; // only for som

  var increment = function() {
    ++_count;
  };

  var destroy = function() {
    console.log("Destroying dimension ", _type, _variable);
    _.each(_groups, function(group, id) {
      group.destroy();
    });
    _dimension.dispose();
    destructFn(type, _variable);
  };

  _obj.groupAll = function() {
    // always unique
    var id = _.uniqueId('all'),
      func = 'all';
    var destructFn = _.once(function() {
      delete _groups[id];
    });
    //dimension, groupFn, injector, crossfilterInst, destructFn) {
    var group = 
    new CrossfilterGroup()
    .dimension(_dimension)
    .groupFunction(func)
    .injector($injector)
    .instance(_instance)
    .destructFunction(destructFn)
    .create();
    _groups[id] = group;
    return _groups[id];
  };

  // called when necessary details have been filled in
  _obj.create = function() {
    console.log("Creating dimension for ", _variable, " type ", _type);
    _dimension = _instance.dimension(_creationFn);
    return _obj;
  };

  _obj.groupDefault = function() {
    // always unique
    var id = _.uniqueId('default'),
      func = 'default';
    var destructFn = _.once(function() {
      delete _groups[id];
    });
    var group = 
    new CrossfilterGroup()
    .dimension(_dimension)
    .groupFunction(func)
    .injector($injector)
    .instance(_instance)
    .destructFunction(destructFn)
    .create();
    _groups[id] = group;
    return _groups[id];
  };

  _obj.group = function(groupFn, unique) {
    var id;
    var create = function(id) {
      var destructFn = _.once(function() {
        delete _groups[id];
      });
      var group = 
      new CrossfilterGroup()
      .dimension(_dimension)
      .groupFunction(groupFn)
      .injector($injector)
      .instance(_instance)
      .destructFunction(destructFn)
      .create();
      _groups[id] = group;
    };

    if (unique) {
      id = _.uniqueId('group');
      create(id);
    } else {
      id = String(groupFn.toString().hashCode());
      // var id = groupFn ? String(groupFn.toString().hashCode()) : 'default';
      if (_groups[id]) {
        // exists, pass
      } else {
        create(id);
      }
    }
    return _groups[id];
  };

  _obj.type = function(x) {
    if(!arguments.length) { return _type; }
    _type = x;
    if (_type == 'som') {
      _filters = {};

      _obj.hexagons = function(circleId, hexagons) {
        if (!arguments.length) {
          return _filters;
        }
        _filters[circleId] = hexagons;
        if (_.size(_filters) > 0 && _obj.filter()) {
          _dimension.filterFunction(_obj.filter());
          $injector.get('$rootScope').$emit('dimension:SOMFilter');
        }
      };
    }
    return _obj;
  };

  _obj.injector = function(x) {
    if(!arguments.length) { return $injector; }
    $injector = x;
    return _obj;
  };

  _obj.creationFunction = function(x) {
    if(!arguments.length) { return _creationFn; }
    _creationFn = x;
    return _obj;
  }; 

  _obj.destructFunction = function(x) {
    if(!arguments.length) { return _destructFn; }
    _destructFn = x;
    return _obj;
  };

  _obj.instance = function(x) {
    if(!arguments.length) { return _instance; }
    _instance = x;
    return _obj;
  };

  _obj.sticky = function(val) {
    if (!arguments.length) {
      return _sticky;
    }
    _sticky = val;
    return _obj;
  };

  _obj.filter = function(filter) {
    if (!arguments.length) {
      return _filterFn;
    }
    _oldFilterFn = _filterFn;
    _filterFn = filter;
    _dimension.filterFunction(_filterFn);
    return _obj;
  };

  _obj.filterAll = function() {
    _oldFilterFn = _filterFn;
    _filterFn = null;
    _dimension.filterAll();
    return _obj;
  };

  _obj.oldFilter = function() {
    return _oldFilterFn;
  };

  _obj.decrement = function() {
    --_count;
    if (_count < 1 && !_obj.sticky()) {
      destroy();
    } else {
      return _obj;
    }
  };

  _obj.variable = function(x) {
    if(!arguments.length) { _variable = x; }
    _variable = x;
    return _obj;
  };

  _obj.is = function(type, variable) {
    return (type == _type) && (variable == _variable);
  };

  _obj.get = function() {
    increment();
    return _dimension;
  };

  return _obj;
}

function CrossfilterGroup() {
  var _count = 0,
    $injector,
    _dimension,
    _group,
    _groupFn,
    _instance,
    _destructFn,
    _obj = {},
    _functions = {
      add: null,
      remove: null,
      initial: null
    };

  var increment = function() {
    ++_count;
  };

  _obj.decrement = function() {
    --_count;
    if (_count < 1) {
      destroy();
    } else {
      return _obj;
    }
  };

  _obj.dimension = function(x) {
    if(!arguments.length) { return _dimension; }
    _dimension = x;
    return _obj;
  };

  _obj.groupFunction = function(x) {
    if(!arguments.length) { return _groupFn; }
    _groupFn = x;
    return _obj;
  };

  _obj.instance = function(x) {
    if(!arguments.length) { return _instance; }
    _instance = x;
    return _obj;
  };

  _obj.create = function(x) {
    console.log("Creating group ", _groupFn);
    if (_.isString(_groupFn)) {
      switch (_groupFn) {
        case 'all':
          _group = _dimension.groupAll();
          break;

        case 'default':
          _group = _dimension.group();
          break;
      }
    } else {
      _group = _dimension.group(_groupFn);
    }
    return _obj;
  };

  _obj.destroy = function() {
    console.log("Destroying group ", _groupFn || 'default');
    _group.dispose();
    destructFn();
  };

  _obj.injector = function(x) {
    if(!arguments.length) { return $injector; }
    $injector = x;
    return _obj;
  };

  _obj.destructFunction = function(x) {
    if(!arguments.length) { return _destructFn; }
    _destructFn = x;
    return _obj;
  };

  _obj.reduce = function(config) {
    _group.reduce(config.add, config.remove, config.initial);
    return _obj;
  };

  _obj.variable = function() {
    return _variable;
  };

  _obj.get = function() {
    increment();
    return _group;
  };

  return _obj;
}