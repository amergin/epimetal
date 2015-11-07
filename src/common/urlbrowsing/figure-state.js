function FigureState() {
  // --------------------------------------
  // privates:
  // --------------------------------------

  var obj = {},
  priv = {};

  // ---------------------------------------

  // public functions:

  obj.type = function() {
    return "figure_state";
  };

  // returns a serializable object of this instance
  // that can be stored to DB
  obj.get = function(x) {
    throw new Error("not implemented");
  };

  // loads an object that is retrieved from the DB
  // and can be used to initialize the running state
  // of the app
  obj.load = function(x) {
    throw new Error("not implemented");
  };

  obj.window = function(x) {
    if(!arguments.length) { return priv.window; }
    priv.window = x;
    return obj;
  };

  return obj;
}