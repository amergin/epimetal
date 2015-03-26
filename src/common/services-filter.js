var mod = angular.module('services.filter', ['services.dimensions', 'services.window']);

mod.factory('FilterService', ['$injector', 'constants', '$rootScope', '$timeout', '$state', 'WindowHandler',
  function ($injector, constants, $rootScope, $timeout, usSpinnerService, $state, WindowHandler) {

    var DimensionService = $injector.get('DimensionService');
    var _activeDimensionService = DimensionService.getPrimary();
    var _filters = {
      'histogram': [],
      'som': [ { type: 'som', circle: new CircleFilter('circle1', $injector).name('A') },
       { type: 'som', circle: new CircleFilter('circle2', $injector).name('B') } ]
    };

    var _somDimensionInst = _activeDimensionService.getSOMDimension();
    var _somDimension = _somDimensionInst.get();

    var _colors = d3.scale.category10();
    var _bmusLookup = {};

    _.each( _filters.som, function(filt) {
      filt.circle.color( _colors(filt.circle.id()) );
    });

    var getCircleFilterInitial = function() {
      var initial = _.map( _filters.som, function(filt) {
        return { circle: filt.circle, count: 0 };
      });
      return initial;
    };

    var _filterReturnHandle = [];
    var _circleFilterReturnHandle = getCircleFilterInitial();

    var service = {};

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

    service.canEdit = function() {
      return _activeDimensionService == DimensionService.getPrimary();
    };

    service.getInfo = function() {
      return DimensionService.getPrimary().getSampleInfo();
    };

    service.getSOMFilters = function() {
      return _.map( _filters.som, function(filt) { return filt.circle; }); //_filters.som;
    };

    service.getSOMFilter = function(id) {
      return _.find( _filters.som, function(cf) { return cf.circle.id() == id; } ).circle;
    };

    service.getSOMFilterColors = function() {
      return _colors;
    };

    service.getCircleFilterInfo = function() {
      return _circleFilterReturnHandle;
    };

    service.addHistogramFilter = function(config) {
      var type = 'histogram';
      _filters[type].push(config);
      updateReturnFilters();
    };

    service.removeHistogramFilter = function(filter, redraw) {
      var ind = Utils.indexOf( _filters['histogram'], function(f,i) { 
        return _.isEqual( f.id, filter.id );
      });

      if( ind == -1 ) { return; }
      else {
        _filters['histogram'].splice(ind,1);
      }

      if( filter.chart ) { filter.chart.filterAll(); }

      if( redraw ) {
        $injector.get('WindowHandler').redrawVisible();
      }
      updateReturnFilters();
    };

    var getUniqueHexagons = function(current, added) {
      return _.chain(current)
      .union(added)
      .uniq( function(d) { return d.i + "|" + d.j; } )
      .value();
    };

    service.getFilters = function() {
      return _filterReturnHandle;
    };

    var bmuStrId = function(bmu) {
      return bmu.x + "|" + bmu.y;
    };

    service.inWhatCircles = function(bmu) {
      var lookup = _bmusLookup[bmuStrId(bmu)];
      // console.log("inWhatCircles reports = ", JSON.stringify(lookup), "for BMU = ", JSON.stringify(bmu));
      return lookup ? lookup.circles : [];
    };

    service.updateCircleFilters = function() {
      var inWhatCircles = function(bmu) {
        // should usually be just one name, but it's possible that in several
        var names = [];

        _.each( service.getSOMFilters(), function(circle) {
          if( circle.contains(bmu) ) {
            names.push( circle.id() );
          }
        });
        return names;
      };

      var resolveAmounts = function() {
        var handle = [];
        var groupedBMUs = _somDimension.group();
        // var groupedBMUs = _activeDimensionService.getSOMDimension().group();
        var counts = {};
        _.each( groupedBMUs.all(), function(group) {
          var inGroups = inWhatCircles(group.key);
          _bmusLookup[bmuStrId(group.key)] = { bmu: group.key, circles: inGroups };
          _.each( inGroups, function(name) {
            counts[name] = counts[name] ? (counts[name] + group.value) : group.value;
          });
        });

        _.each( service.getSOMFilters(), function(circle) {
          handle.push({ circle: circle, count: counts[circle.id()] || 0 });
        });

        return handle;
      };

      var handle = resolveAmounts(handle);
      if( _.isEmpty(handle) ) {
        handle = getCircleFilterInitial();
      }
      angular.copy(handle, _circleFilterReturnHandle);
      updateReturnFilters();
    };

    var updateReturnFilters = function() {
        angular.copy( _.chain(_filters).values().flatten(true).value(), _filterReturnHandle );
    };

    return service;
  }
  ]);

function CircleFilter(id, $injector) {

  var _name,
  _id = id,
  _color,
  _hexagons = [],
  _injector = $injector,
  _radius,
  _position,
  that = this,
  _filter = {};

  _filter.name = function(name) {
    if(!arguments.length) { return _name; }
    _name = name;
    return _filter;
  };

  _filter.id = function() {
    return _id;
  };

  _filter.hexagons = function(hexagons) {
    if(!arguments.length) { return _hexagons; }
    _hexagons = hexagons;
    _injector.get('DimensionService').get('vis.som').updateSOMFilter( _filter.id(), _hexagons );
    _injector.get('WindowHandler').redrawVisible();
    return _filter;
  };

  _filter.radius = function(radius) {
    if(!arguments.length) { return _radius; }
    _radius = radius;
    return _filter;
  };

  _filter.position = function(position) {
    if(!arguments.length) { return _position; }
    _position = _.pick(position, 'x', 'y');
    return _filter;
  };

  // is sample included in this circle?
  _filter.contains = function(bmu) {
    return _.any( _filter.hexagons(), function(hex) {
      return (hex.i === bmu.y) && (hex.j === bmu.x);
    });
  };

  _filter.color = function(color) {
    if(!arguments.length) { return _color; }
    _color = color;
    return _filter;
  };

  return _filter;
}