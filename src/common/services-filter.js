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

    var _colors = d3.scale.category10();

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

    $rootScope.$on('tab.changed', function(event, tabName) {
      _activeDimensionService = DimensionService.get(tabName);
    });

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

    service.updateCircleFilters = function() {
      var inWhatCircles = function(bmu) {
        var includedInCircle = function(bmu, circle) {
          return _.any( circle.hexagons(), function(b) { return b.i === (bmu.key.y-1) && b.j === (bmu.key.x-1); } );
        };

        // should usually be just one name, but it's possible that in several
        var names = [];

        _.each( service.getSOMFilters(), function(circle) {
          if( includedInCircle(bmu, circle) ) {
            names.push( circle.id() );
          }
        });
        return names;
      };

      var resolveAmounts = function() {
        var handle = [];
        var groupedBMUs = _activeDimensionService.getSOMDimension().group();
        var counts = {};
        _.each( groupedBMUs.all(), function(group) {
          var inGroups = inWhatCircles(group);
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
        angular.copy( _.chain(_filters).values().flatten().value(), _filterReturnHandle );
    };

    return service;
  }
  ]);

function CircleFilter(id, $injector) {

  var _name = name,
  _id = id,
  _color,
  _hexagons = [],
  _injector = $injector,
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
    _injector.get('WindowHandler').reRenderVisible({ 'compute': true });
    _injector.get('DimensionService').get('vis.som').updateSOMFilter( _filter.id(), _hexagons );


    return _filter;
  };

  _filter.color = function(color) {
    if(!arguments.length) { return _color; }
    _color = color;
    return _filter;
  };

  return _filter;
}