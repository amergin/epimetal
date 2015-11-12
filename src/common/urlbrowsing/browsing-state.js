function PlBrowsingState() {

    // --------------------------------------
    // privates:
    // --------------------------------------

    var priv = this.privates = {
    },
    obj = this.obj = {};

    // ---------------------------------------

    // public functions:

    obj.type = function() {
      throw new Error("not implemented");
    };

    // returns a serializable object of this instance
    // that can be stored to DB
    priv.get = function(x) {
      function handlers() {
        return _.map(priv.windowHandlers, function(handler) {
          return handler.getState();
        });
      }
      function filters() {
        return _.map(priv.filters, function(filter) {
          return filter.get();
        });
      }
      return {
        handlers: handlers(),
        filters: filters()
      };
    };

    // common functionality
    priv.load = function(stateObj) {
    };

    // loads an object that is retrieved from the DB
    // and can be used to initialize the running state
    // of the app
    obj.load = function(x) {
      throw new Error("not implemented");
    }; 

    obj.windowHandlers = function(x) {
      if(!arguments.length) { return priv.windowHandlers; }
      priv.windowHandlers = x;
      return obj;
    };

    obj.filters = function(x) {
      if(!arguments.length) { return priv.filters; }
      priv.filters = x;
      return obj;
    };

    return obj;
  }

function PlExploreBrowsingState() {
  // call super
  PlBrowsingState.call(this);

  var obj = this.obj,
  priv = this.privates;

  obj.type = function() {
    return 'explore';
  };

  obj.load = function(stateObj) {
    try {
      // common
      priv.load(stateObj);
      obj.type(stateObj['type']);
    } catch(err) {
      throw new Error("PlExploreBrowsingState thows error");
    }
  };

  obj.get = function() {
    // call super and add this level info to it
    return _.extend(priv.get(), {
      type: obj.type()
    });
  };

  return obj;
}

PlExploreBrowsingState.prototype = _.create(PlExploreBrowsingState.prototype, {
  'constructor': PlBrowsingState
});

function PlSOMBrowsingState() {
  // call super
  PlBrowsingState.call(this);

  var obj = this.obj,
  priv = this.privates;

  obj.type = function() {
    return 'som';
  };

  obj.selection = function(x) {
    if(!arguments.length) { return priv.selection; }
    priv.selection = x;
    return obj;
  };

  obj.size = function(x) {
    if(!arguments.length) { return priv.size; }
    priv.size = x;
    return obj;
  };

  obj.get = function() {
    // call super and add this level info to it
    return _.extend(priv.get(), {
      type: obj.type(),
      selection: _.map(obj.selection(), function(v) { return v.get(); }),
      size: obj.size()
    });
  };

  return obj;
}

PlSOMBrowsingState.prototype = _.create(PlSOMBrowsingState.prototype, {
  'constructor': PlBrowsingState
});


function PlRegressionBrowsingState() {
  // call super
  PlBrowsingState.call(this);

  var obj = this.obj,
  priv = this.privates;

  obj.type = function() {
    return 'regression';
  };

  obj.selection = function(x) {
    if(!arguments.length) { return priv.selection; }
    priv.selection = x;
    return obj;
  };

  obj.get = function() {
    function getSelection() {
      // pick variable state instead of the whole object
      // while preserving the structure
      return _.chain(obj.selection())
      .map(function(arr,key) { 
        var vals = _.map(arr, function(v) { return v.get(); }); 
        return [key, vals];
      })
      .object()
      .value();      
    }
    // call super and add this level info to it
    return _.extend(priv.get(), {
      type: obj.type(),
      selection: getSelection()
    });
  };

  return obj;

}

PlRegressionBrowsingState.prototype = _.create(PlRegressionBrowsingState.prototype, {
  'constructor': PlBrowsingState
});