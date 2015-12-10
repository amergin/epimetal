function PlCommonBrowsingState() {
  // --------------------------------------
  // privates:
  // --------------------------------------

  var obj = {},
  priv = {};

  // ---------------------------------------

  // public functions:

  obj.type = function() {
    return "common_browsing_state";
  };

  // returns a serializable object of this instance
  // that can be stored to DB
  obj.get = function(x) {
    return {
      datasets: _.map(obj.datasets(), function(set) { return set.state(); }),
      variables: obj.customVariables(),
      active: obj.activeView(),
      menu: obj.sideMenu()
    };
  };

  // loads an object that is retrieved from the DB
  // and can be used to initialize the running state
  // of the app
  obj.load = function(stateObj) {
    function datasets(sets) {
      return _.map(sets, function(obj) {
        if(obj['type'] == 'database') {
          return inject.get('DatasetFactory').getSet(obj['name'])
          .active(obj['active'])
          .color(obj['color']);
        } else {
          var samples = _.map(obj.samples, function(samp) {
            return _.assign(samp, {
              bmus: {},
              variables: {}
            });
          });
          return inject.get('DatasetFactory').createDerived({
            name: obj.name,
            samples: obj.samples,
            color: obj.color,
            setActive: obj.active
          });
        }
      });
    }

    function customVariables() {
      // TODO
    }

    try {
      obj.activeView(stateObj['active']);

      var inject = obj.injector(),
      dsets = datasets(stateObj['datasets']);
      obj.datasets(dsets);
      obj.injector().get('DatasetFactory').updateDataset();

      obj.sideMenu(stateObj['menu']);
      // obj.customVariables();
      return obj;
      
    } catch(err) {
      throw new Error("PlCommonBrowsingState throws error: " + err.message);
    }
  };  

  obj.datasets = function(x) {
    if (!arguments.length) { return priv.datasets; }
    priv.datasets = x;
    return obj;
  };

  obj.injector = function(x) {
    if (!arguments.length) { return priv.injector; }
    priv.injector = x;
    return obj;
  };

  obj.activeView = function(x) {
    if (!arguments.length) { return priv.activeView; }
    priv.activeView = x;
    return obj;
  };

  obj.customVariables = function(x) {
    if (!arguments.length) { return priv.customVariables; }
    priv.customVariables = x;
    return obj;
  };

  obj.sideMenu = function(x) {
    if (!arguments.length) { return priv.sideMenu; }
    priv.sideMenu = x;
    return obj;
  };

  return obj;
}