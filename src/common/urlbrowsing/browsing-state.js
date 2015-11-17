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

    obj.injector = function(x) {
      if (!arguments.length) { return priv.injector; }
      priv.injector = x;
      return obj;
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
      var WindowHandler = obj.injector().get('WindowHandler'),
      FilterService = obj.injector().get('FilterService');

      // load handlers
      var handlers = _.map(stateObj['handlers'], function(handler) {
        var winHandler = WindowHandler.get(handler.name);
        if(!winHandler) { throw new Error("WindowHandler not found: " + handler.name); }
        winHandler.load(handler);
        return winHandler;
      });
      // and init
      obj.windowHandlers(handlers);

      // load filters
      var filters = _.map(stateObj['filters'], function(filt) {
        if(filt.type == 'range') {
          return new HistogramFilter()
          .injector(obj.injector())
          .load(filt);
        }
        else if(filt.type == 'classed') {
          return new ClassedBarChartFilter()
          .injector(obj.injector())
          .load(filt);
        }
        else if(filt.type == 'circle') {
          return new CircleFilter()
          .injector(obj.injector())
          .load(filt);
        }
        else {
          throw new Error("Unsupported filter type: " + filt.type);
        }
      });

      _.each(stateObj.handlers, function(handler) {
        _.each(handler.windows, function(win) {
          _.chain(filters)
          .filter(function(filter) {
            // don't try to fill windowID to circle filters
            return filter.type() == 'circle' ? false : filter.windowid() == win.oldId;
          })
          .each(function(filter) {
            filter.windowid(win.id);
          })
          .value();

        });
      });

      // and init
      obj.filters(filters);
    };

    // loads an object that is retrieved from the DB
    // and can be used to initialize the running state
    // of the app
    // obj.load = function(x) {
    //   throw new Error("not implemented");
    // }; 

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
      return obj;
    } catch(err) {
      throw new Error("PlExploreBrowsingState thows error: ", err.message);
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

  obj.som = function(x) {
    if(!arguments.length) { return priv.som; }
    priv.som = x;
    return obj;
  };

  obj.get = function() {
    // call super and add this level info to it
    return _.extend(priv.get(), {
      type: obj.type(),
      selection: _.map(obj.selection(), function(v) { return v.get(); }),
      size: obj.size(),
      som: obj.som()
    });
  };

  obj.load = function(stateObj) {
    function getSelection(selection) {
      return _.map(selection, function(vari) {
        return obj.injector().get('VariableService').getVariable(vari['name']);
      });
    }

    try {
      // common
      priv.load(stateObj);
      obj.selection(getSelection(stateObj['selection']));
      obj.size(stateObj['size']);
      obj.som(stateObj['som']);
      return obj;
    } catch(err) {
      throw new Error("PlExploreBrowsingState thows error: ", err.message);
    }
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

  obj.load = function(stateObj) {
    function getSelection(selection) {
      return _.chain(selection)
      .map(function(val, key) {
        var variables = _.map(val, function(vari) {
          return obj.injector().get('VariableService').getVariable(vari['name']);
        });
        return [key, variables];
      })
      .object()
      .value();
    }
    try {
      // common
      priv.load(stateObj);
      obj.type(stateObj['type']);
      obj.selection(getSelection(stateObj['selection']));
      return obj;
    } catch(err) {
      throw new Error("PlRegressionBrowsingState thows error ", err.message);
    }
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