function BaseFilter() {
  var priv = this.privates = {},
    filter = this.filter = {};

  filter.type = function() {
    throw new Error("not implemented");
  };

  filter.state = function() {
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

  return filter;
}

function CircleFilter($injector) {

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
  priv.injector = $injector;

  function initOrigin() {
    var SOMService = priv.injector.get('SOMService');
    priv.origin.x = _.random(1, SOMService.columns() - 1);
    priv.origin.y = _.random(1, SOMService.rows() - 1);
  }

  initOrigin();

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

  // filter.injector = function(x) {
  //   if(!arguments.length) { return priv.injector; }
  //   priv.injector = x;
  //   return filter;
  // };

  filter.hexagons = function(hexagons) {
    if (!arguments.length) {
      return priv.hexagons;
    }
    priv.hexagons = hexagons;
    priv.injector.get('DimensionService').get('vis.som').updateSOMFilter(filter.id(), priv.hexagons);
    priv.injector.get('WindowHandler').redrawVisible();
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
    priv.position = _.pick(position, 'x', 'y');
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
      id: filter.id(),
      origin: filter.origin(),
      color: filter.color()
    };
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

  filter.get = function() {
    return {
      payload: filter.payload(),
      windowid: filter.windowid(),
      variable: filter.variable().get()
    };
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

  filter.remove = function() {
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