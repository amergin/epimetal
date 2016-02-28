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

    obj.labelName = function() {
      throw new Error("not implemented");
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
      ret.push(obj.labelName());
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

  obj.labelName = obj.name;

  obj.get = function(x) {
    return {
      type: obj.type(),
      name: obj.name()
    };
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
  priv.math = null;

  obj.type = function() {
    return 'custom';
  };

  // only custom vars need to have a state
  obj.get = function(x) {
    return {
      type: obj.type(),
      dependencies: _.map(obj.dependencies(), function(dep) {
        return dep.id;
      }),
      unit: obj.unit(),
      name: obj.descriptiveName(),
      id: obj.id,
      nameOrder: obj.nameOrder(),
      originalExpression: obj.originalExpression()
    };
  };

  obj.descriptiveName = function(x) {
    if(!arguments.length) { return priv.descName; }
    priv.descName = x;
    return obj;
  };

  // override, only get
  obj.labelName = function() {
    var limitLength = 20,
    descName = obj.descriptiveName();
    return descName.length > limitLength ? descName.substr(0, limitLength) + "..." : descName;
  };

  obj.external = function(nanValue, math) {
    priv.nanValue = nanValue;
    priv.math = math;
    return obj;
  };

  obj.originalExpression = function(x) {
    if(!arguments.length) { return priv.originalExpression; }
    priv.originalExpression = x;
    return obj;
  };

  // override
  obj.axisLabel = function() {
    var ret = [];
    ret.push(obj.labelName());
    ret.push("(" + obj.originalExpression() + ")");
    return ret.join(" ");
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

  obj.evaluate = function(sample) {
    function originalVariableName(bracketName) {
      var matchBrackets = /[\[|\]]/ig;
      return bracketName.replace(matchBrackets, '');
    }
    var hasNaN = false,
    values = _.chain(priv.substitutedCache)
    // key is the original with brackets [], value is substituted
    .map(function(subName, bracketName) {
      var varName = originalVariableName(bracketName),
      value = +sample.variables[varName];
      if(isNaN(value)) { hasNaN = true; }
      return [subName, value];
    })
    .object()
    .value();
    /* jshint ignore:start */
    return hasNaN ? priv.nanValue : priv.math.eval(priv.substitutedExpression, values);
    /* jshint ignore:end */
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
