angular.module('services.filter', [
  'services.dimensions',
  'services.window',
  'ext.d3',
  'ext.lodash'
])

.constant('SOM_MAX_FILTERS', 5)
  .factory('FilterService', function FilterService($injector, $rootScope, WindowHandler, SOM_MAX_FILTERS, d3, _, lodashEq) {

    var DimensionService = $injector.get('DimensionService');
    var _activeDimensionService = DimensionService.getPrimary();
    var _colors = d3.scale.category10();
    var _filters = [];
    var _disabled = false;

    var _somDimensionInst = _activeDimensionService.getSOMDimension();
    var _somDimension = _somDimensionInst.get();

    var _bmusLookup = {};

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

    service.createCircleFilter = function(config) {
      if(config.filter) {
        // load object
        _filters.push(config.filter);
        updateCircleFilterHandler();
        $rootScope.$emit('som:circle:add', config.filter);
        return config.filter;
      }
      else {
        var nameTaken = _.any(_filters, function(filt) {
          return filt.type() == 'circle' && filt.name() == config.name;
        });
        if (nameTaken) {
          throw new Error('The supplied circle name is already in use');
        }
        if (service.getSOMFilters().length >= SOM_MAX_FILTERS) {
          throw new Error('Maximum amount of circle filters reached.');
        }

        var id = _.uniqueId('circle'),
        circle = new CircleFilter()
          .injector($injector)
          .name(config.name)
          .id(id)
          .color(_colors(id))
          .init();
        _filters.push(circle);
        updateCircleFilterHandler();
        $rootScope.$emit('som:circle:add', circle);
        return circle;
      }
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
      // do a little double-checking: does the filter exist?
      var contains = lodashEq.contains(_filters, function(existing) {
        if(filter.type() == 'circle') {
          return filter.type() == 'circle' && filter.id() == existing.id();
        } 
        else if(filter.type() == 'classed') {
          return existing.type() == filter.type() && existing.payload() == filter.payload();
        }
        // else if(filter.type() == 'classed') { return false; }
        else {
          if(existing.type() !== 'circle') {
            return existing.windowid() == filter.windowid();
          }
        }
      });
      if(!contains) {
        _filters.push(filter);
      }
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

    return service;

  });