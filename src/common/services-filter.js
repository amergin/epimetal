angular.module('services.filter', [
  'services.dimensions',
  'services.window',
  'ext.d3',
  'ext.lodash'
])

.constant('SOM_MAX_FILTERS', 5)
  .factory('FilterService', function FilterService($injector, $rootScope, WindowHandler, SOM_MAX_FILTERS, d3, _) {

    var DimensionService = $injector.get('DimensionService');
    var _activeDimensionService = DimensionService.getPrimary();
    var _colors = d3.scale.category10();
    var _filters = [];
    var _disabled = false;

    var _somDimensionInst = _activeDimensionService.getSOMDimension();
    var _somDimension = _somDimensionInst.get();

    var _bmusLookup = {};

    function initCircleFilters() {
      service.createCircleFilter('A');
      service.createCircleFilter('B');
    }

    function getCircleCounts(array) {
      return _.chain(array)
        .filter(function(f) {
          return f.type() == 'circle';
        })
        .map(function(filt) {
          return _.defaults(filt, {
            circle: filt,
            count: 0
          });
        })
        .value();
    }

    var service = {};
    var _circleFilters = [];

    function updateCircleFilterHandler() {
      var circles = _.filter(_filters, function(filt) {
        return filt.type() == 'circle';
      });
      _circleFilters = angular.copy(circles);
    }

    service.removeCircleFilter = function(filter) {
      _.remove(_filters, function(filt) {
        return filt.is(filter);
      });
      // filter.remove();
      updateCircleFilterHandler();
      service.updateCircleFilters();
      $rootScope.$emit('som:circle:remove', filter);
    };

    service.createCircleFilter = function(name) {
      var nameTaken = _.any(_filters, function(filt) {
        return filt.type() == 'circle' && filt.name() == name;
      });
      if (nameTaken) {
        throw new Error('The supplied circle name is already in use');
      }
      if (service.getSOMFilters().length >= SOM_MAX_FILTERS) {
        throw new Error('Maximum amount of circle filters reached.');
      }

      var id = _.uniqueId('circle');
      var circle = new CircleFilter($injector)
        .name(name)
        .id(id)
        .color(_colors(id));
      _filters.push(circle);
      updateCircleFilterHandler();
      $rootScope.$emit('som:circle:add', circle);
      return circle;
    };

    service.disabled = function(x) {
      if (!arguments.length) {
        return _disabled;
      }
      _disabled = x;
      return service;
    };

    service.tabChange = function(tabName) {
      function changeDimension() {
        _somDimensionInst.decrement();
        _somDimensionInst = _activeDimensionService.getSOMDimension();
        _somDimension = _somDimensionInst.get();
      }
      _activeDimensionService = DimensionService.get(tabName);
      changeDimension();
      service.updateCircleFilters();
    };

    service.getInfo = function() {
      return DimensionService.getPrimary().getSampleInfo();
    };

    service.getSOMFilters = function() {
      return _circleFilters;
    };

    service.getSOMFilter = function(id) {
      return _.find(_filters, function(filt) {
        return filt.type() == 'circle' && filt.id() == id;
      });
    };

    service.getSOMFilterColors = function() {
      return _colors;
    };

    service.addFilter = function(filter) {
      if (service.disabled()) {
        return;
      }
      _filters.push(filter);
    };

    service.removeFilter = function(filter) {
      if (service.disabled()) {
        return;
      }
      var removed = _.chain(_filters)
        .remove(function(inst) {
          return inst.is(filter);
        })
        .first()
        .value();

      if (removed) {
        removed.remove();
        var TabService = $injector.get('TabService');
        TabService.check({
          force: true,
          origin: 'filter'
        });
      }
    };

    service.resetFilters = function(config) {
      service.disabled(true);
      var removed = _.chain(_filters)
        .filter(function(f) {
          if (config.spareSOM) {
            return f.type() !== 'circle';
          } else {
            return true;
          }
        })
        .each(function(f) {
          f.remove();
        })
        .value();

      _.remove(_filters, function(d) {
        return _.includes(removed, d);
      });

      var TabService = $injector.get('TabService');
      TabService.check({
        force: config.force || false,
        origin: 'filter'
      });
      service.disabled(false);
    };

    service.removeFilterByPayload = function(filter) {
      if (service.disabled()) {
        return;
      }
      var found;
      _.some(_filters, function(instance) {
        if (instance.isPayload(filter)) {
          found = instance;
          return true;
        }
        return false;
      });
      if (found) {
        // found.remove();
        _.remove(_filters, found);
        var TabService = $injector.get('TabService');
        TabService.check({
          force: true,
          origin: 'filter'
        });
      }
    };

    var getUniqueHexagons = function(current, added) {
      return _.chain(current)
        .union(added)
        .uniq(function(d) {
          return d.i + "|" + d.j;
        })
        .value();
    };

    service.getFilters = function() {
      return _filters;
    };

    service.getFiltersByType = function(type) {
      return _.filter(_filters, function(filter) {
        return filter.type() == type;
      });
    };

    service.getActiveFilters = function() {
      var state = $injector.get('TabService').activeState(),
        isSom = _.startsWith(state.name, 'vis.som');
      return _.filter(_filters, function(filt) {
        if (isSom) {
          return filt.type() == 'circle';
        } else {
          return filt.type() != 'circle';
        }
      });
    };

    var bmuStrId = function(bmu) {
      return bmu.x + "|" + bmu.y;
    };

    service.inWhatCircles = function(bmu) {
      var lookup = _bmusLookup[bmuStrId(bmu)];
      return lookup ? lookup.circles : [];
    };

    service.updateCircleFilters = function() {
      var inWhatCircles = function(bmu) {
        // should usually be just one name, but it's possible that in several
        var names = [];

        _.each(service.getSOMFilters(), function(circle) {
          if (circle.contains(bmu)) {
            names.push(circle.id());
          }
        });
        return names;
      };

      var resolveAmounts = function() {
        // var handle = [];
        var groupedBMUs = _somDimension.group();
        // var groupedBMUs = _activeDimensionService.getSOMDimension().group();
        var counts = {};
        _.each(groupedBMUs.all(), function(group) {
          var inGroups = inWhatCircles(group.key);
          _bmusLookup[bmuStrId(group.key)] = {
            bmu: group.key,
            circles: inGroups
          };
          _.each(inGroups, function(name) {
            counts[name] = counts[name] ? (counts[name] + group.value) : group.value;
          });
        });

        _.each(service.getSOMFilters(), function(circle) {
          circle.count(counts[circle.id()] || 0);
        });

        // return handle;
      };

      resolveAmounts();
    };

    initCircleFilters();

    return service;

  });


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
    var SOM_PLANE_SIZE = priv.injector.get('SOM_PLANE_SIZE');
    priv.origin.x = _.random(1, SOM_PLANE_SIZE.x - 1);
    priv.origin.y = _.random(1, SOM_PLANE_SIZE.y - 1);
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