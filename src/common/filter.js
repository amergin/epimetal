function BaseFilter() {
  var priv = this.privates = {},
    filter = this.filter = {};

  filter.type = function() {
    throw new Error("not implemented");
  };

  filter.trackId = function() {
    throw new Error("not implemented");
  };

  filter.isPayload = function() {
    throw new Error("not implemented");
  };

  filter.remove = function() {
    throw new Error("not implemented");
  };

  filter.is = function(instance) {
    throw new Error("not implemented");
  };

  filter.get = function() {
    throw new Error("not implemented");
  };

  filter.load = function() {
    throw new Error("not implemented");
  };

  filter.injector = function(x) {
    if (!arguments.length) { return priv.injector; }
    priv.injector = x;
    return filter;
  };

  return filter;
}

function CircleFilter() {

  BaseFilter.call(this);

  var priv = _.extend(this.privates, {
      name: undefined,
      id: undefined,
      color: undefined,
      hexagons: [],
      injector: null,
      radius: undefined,
      count: 0,
      origin: {}
    }),
    filter = this.filter;

  // picks an origin in point scale and translates it into
  // relative scale.
  function initOrigin() {
    var SOMService = filter.injector().get('SOMService'),
    columns = SOMService.columns(),
    rows = SOMService.rows();

    // in relative scale, the domain for mapping hex points
    // is (0,0) -> (1,1).
    priv.origin = {
      x: _.random(1, columns - 1) / columns,
      y: _.random(1, rows - 1) / rows
    };
  }

  function checkValueIsInRelativeScale(value) {
    var inRange = _.inRange(value, 0, 1);
    if(inRange) {
      // all is ok
      return;
    } else {
      if(value == 1) {
        // upper limit is also acceptable
        return;
      }
      throw new Error('Tried to submit value that is not in range [0,1]! value = ' + value);
    }
  }

  filter.trackId = function() {
    return filter.id();
  };

  filter.init = function() {
    initOrigin();
    return filter;
  };

  filter.isPayload = function(x) {
    return false;
  };

  filter.name = function(name) {
    if (!arguments.length) {
      return priv.name;
    }
    priv.name = name;
    return filter;
  };

  filter.type = function() {
    return 'circle';
  };

  filter.is = function(instance) {
    return !_.isUndefined(instance.id) && instance.id() == filter.id();
  };

  filter.id = function(x) {
    if (!arguments.length) {
      return priv.id;
    }
    priv.id = x;
    return filter;
  };

  filter.initialOrigin = function(obj) {
    if(!arguments.length) { return priv.initialOrigin; }
    priv.initialOrigin = obj;
    return filter;
  };

  // accepts an object with x,y coordinate
  // in relative scale. The hex coordinates are
  // mapped to value domain of [0,1]. Note that
  // the value may also be outside this domain
  // in the case the circle is placed on the outskirts
  // of the plane, not on top of the hex planes.
  filter.origin = function(obj) {
    if (!arguments.length) { return priv.origin; }
    console.log("Circle " + filter.name(), "sets origin to", obj);
    priv.origin = obj;
    return filter;
  };

  filter.hexagons = function(hexagons) {
    if (!arguments.length) {
      return priv.hexagons;
    }
    priv.hexagons = hexagons;
    filter.injector().get('DimensionService').get('vis.som').updateSOMFilter(filter.id(), priv.hexagons);
    filter.injector().get('WindowHandler').redrawVisible();
    return filter;
  };

  filter.radius = function(radius) {
    if (!arguments.length) {
      return priv.radius;
    }
    checkValueIsInRelativeScale(radius);
    priv.radius = radius;
    return filter;
  };

  filter.count = function(x) {
    if (!arguments.length) {
      return priv.count;
    }
    priv.count = x;
    return filter;
  };

  // is sample included in this circle?
  filter.contains = function(bmu) {
    return _.any(filter.hexagons(), function(hex) {
      return (hex.i === bmu.y) && (hex.j === bmu.x);
    });
  };

  filter.color = function(color) {
    if (!arguments.length) {
      return priv.color;
    }
    priv.color = color;
    return filter;
  };

  // get current state as serializable object
  filter.get = function() {
    return {
      name: filter.name(),
      origin: filter.origin(),
      color: filter.color(),
      type: filter.type(),
      radius: filter.radius()
    };
  };

  filter.load = function(state) {
    var id = _.uniqueId('circle');

    filter.id(id);
    filter.name(state.name);
    filter.color(state.color);
    filter.origin(state.origin);
    if(state.radius !== undefined) {
      filter.radius(state.radius);
    }
    return filter;
  };

  filter.remove = function() {
    // do
  };

  return filter;
}

CircleFilter.prototype = _.create(BaseFilter.prototype, {
  'constructor': BaseFilter
});

function BaseFigureFilter() {
  BaseFilter.call(this);

  var priv = _.extend(this.privates, {
      variable: undefined,
      chart: null,
      windowid: undefined,
      payload: undefined
    }),
    filter = this.filter;

  filter.variable = function(x) {
    if (!arguments.length) {
      return priv.variable;
    }
    priv.variable = x;
    return filter;
  };

  filter.chart = function(x) {
    if (!arguments.length) {
      return priv.chart;
    }
    priv.chart = x;
    return filter;
  };

  filter.payload = function(x) {
    if (!arguments.length) {
      return priv.payload;
    }
    priv.payload = x;
    return filter;
  };

  filter.isPayload = function(x) {
    return priv.payload == x;
  };

  filter.windowid = function(x) {
    if (!arguments.length) {
      return priv.windowid;
    }
    priv.windowid = x;
    return filter;
  };

  filter.is = function(instance) {
    return !_.isUndefined(instance.chart) && filter.chart() == instance.chart();
  };

  priv.get = function() {
    return {
      payload: filter.payload(),
      windowid: filter.windowid(),
      variable: filter.variable().get()
    };
  };

  priv.load = function(state) {
    filter.payload(state['payload']);
    filter.windowid(state['windowid']);

    // find and assign variable
    var VariableService = filter.injector().get('VariableService'),
    identifier,
    variable;
    if(state['variable'].type == 'db') {
      identifier = state.variable.name;
    } else if(state['variable'].type == 'custom') {
      identifier = state.variable.id;
    }
    variable = VariableService.getVariable(identifier);
    filter.variable(variable);
    return filter;
  };

  return filter;
}

BaseFigureFilter.prototype = _.create(BaseFilter.prototype, {
  'constructor': BaseFilter
});

function HistogramFilter() {
  // call super
  BaseFigureFilter.call(this);

  var priv = this.privates,
    filter = this.filter;

  filter.type = function() {
    return 'range';
  };

  filter.trackId = function() {
    return filter.variable().id;
  };

  filter.get = function() {
    return _.extend(priv.get(), {
      'type': filter.type()
    });
  };

  filter.load = function(state) {
    // do common
    state.payload = new dc.filters.RangedFilter(state.payload[0], state.payload[1]);
    priv.load(state);
    return filter;
  };

  filter.remove = function() {
    console.log("remove triggered");
    priv.chart.filterAll();
    priv.chart.redraw();
    return filter;
  };

  return filter;
}

HistogramFilter.prototype = _.create(BaseFigureFilter.prototype, {
  'constructor': BaseFigureFilter
});

function ClassedBarChartFilter() {
  // call super
  BaseFigureFilter.call(this);

  var priv = this.privates,
    filter = this.filter;

  filter.type = function() {
    return 'classed';
  };

  filter.trackId = function() {
    return filter.variable().id;
  };

  filter.get = function() {
    return _.extend(priv.get(), {
      'type': filter.type()
    });
  };

  filter.load = function(state) {
    // do common
    priv.load(state);
    return filter;
  };

  filter.remove = function() {
    var filters = priv.chart.filters(),
      removeIndex = _.indexOf(filters, priv.payload);

    // 1. clear all current filters
    priv.chart.filter(null);

    // 2. remove the one
    filters.splice(removeIndex, 1);

    // 3. add filter one by one, but not the one to be deleted
    _.each(filters, function(filt, ind) {
      priv.chart.filter(filt);
    });
    priv.chart.redraw();
    return filter;
  };

  return filter;
}

ClassedBarChartFilter.prototype = _.create(BaseFigureFilter.prototype, {
  'constructor': BaseFigureFilter
});