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
  obj.load = function(x) {
    throw new Error("not implemented");
  };  

  obj.datasets = function(x) {
    if (!arguments.length) { return priv.datasets; }
    priv.datasets = x;
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