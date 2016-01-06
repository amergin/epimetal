function BaseFilter() {
  var priv = this.privates = {},
    filter = this.filter = {};

  filter.type = function() {
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
      position: undefined,
      origin: {
        x: 0,
        y: 0
      }
    }),
    filter = this.filter;

  function initOrigin() {
    var SOMService = filter.injector().get('SOMService');
    priv.origin.x = _.random(1, SOMService.columns() - 1);
    priv.origin.y = _.random(1, SOMService.rows() - 1);
  }

  // initOrigin();

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

  filter.origin = function(x) {
    if (!arguments.length) {
      return priv.origin;
    }
    priv.origin = x;
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

  filter.position = function(position) {
    if (!arguments.length) {
      return priv.position;
    }
    if(position === undefined) {
      // pass
    } else {
      priv.position = _.pick(position, 'x', 'y');
    }
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
      radius: filter.radius(),
      position: filter.position()
    };
  };

  filter.load = function(state) {
    var id = _.uniqueId('circle');

    filter.id(id);
    filter.name(state.name);
    filter.color(state.color);
    filter.origin(state.origin);
    filter.radius(state.radius);
    filter.position(state.position);
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
    var VariableService = filter.injector().get('VariableService');
    if(state['variable'].type == 'db') {
      var variable = VariableService.getVariable(state.variable.name);
      filter.variable(variable);
    } else if(state['variable'].type == 'custom') {
      // TODO
    }
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