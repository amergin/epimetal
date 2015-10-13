function PlVariable() {

    // --------------------------------------
    // privates:
    // --------------------------------------

    var priv = this.privates = {
      classed: false,
      desc: '',
      group: null,
      name: undefined,
      name_order: -1,
      unit: ''
    },
    obj = this.obj = {};

    // ---------------------------------------

    // public functions:

    obj.type = function() {
      throw new Error("not implemented");
    };

    obj.get = function(x) {
      throw new Error("not implemented");
    };

    obj.description = function(x) {
      if (!arguments.length) {
        return priv.desc;
      }
      priv.desc = x;
      return obj;
    };

    obj.name = function(x) {
      if (!arguments.length) {
        return priv.name;
      }
      priv.name = x;
      obj.id = x;
      return obj;
    };

    obj.classed = function(x) {
      if (!arguments.length) {
        return priv.classed;
      }
      priv.classed = x;
      return obj;
    };

    obj.nameOrder = function(x) {
      if (!arguments.length) {
        return priv.name_order;
      }
      priv.name_order = x;
      return obj;
    };

    obj.unit = function(x) {
      if (!arguments.length) {
        return priv.unit;
      }
      priv.unit = x;
      return obj;
    };

    // utility fn, only get
    obj.axisLabel = function() {
      var ret = [];
      ret.push(obj.name());
      if(obj.unit()) { ret.push("(" + obj.unit() + ")"); }
      return ret.join(" ");
    };

    obj.group = function(x) {
      if (!arguments.length) {
        return priv.group;
      }
      priv.group = x;
      return obj;
    };

    return obj;
  }

// from database, normal variable
function PlDatabaseVariable() {
  // call super
  PlVariable.call(this);

  var obj = this.obj,
  priv = this.privates;

  obj.type = function() {
    return 'db';
  };

  return obj;

}

PlDatabaseVariable.prototype = _.create(PlVariable.prototype, {
  'constructor': PlDatabaseVariable
});

// custom variable
function PlCustomVariable() {
  // call super
  PlVariable.call(this);

  var obj = this.obj,
  priv = this.privates;

  obj.type = function() {
    return 'custom';
  };

  obj.originalExpression = function(x) {
    if(!arguments.length) { return priv.originalExpression; }
    priv.originalExpression = x;
    return obj;
  };

  obj.substitutedExpression = function(x) {
    if(!arguments.length) { return priv.substitutedExpression; }
    priv.substitutedExpression = x;
    return obj;
  };

  obj.substitutedCache = function(x) {
    if(!arguments.length) { return priv.substitutedCache; }
    priv.substitutedCache = x;
    return obj;
  };

  obj.dependencies = function(x) {
    if(!arguments.length) { return priv.dependencies; }
    priv.dependencies = x;
    return obj;
  };

  return obj;
}

PlCustomVariable.prototype = _.create(PlVariable.prototype, {
  'constructor': PlCustomVariable
});
