var mod = angular.module('services.filter', ['services.dimensions', 'services.window']);

mod.factory('FilterService', ['$injector', 'constants', '$rootScope', '$timeout', '$state', 'WindowHandler',
  function ($injector, constants, $rootScope, $timeout, usSpinnerService, $state, WindowHandler) {

    var DimensionService = $injector.get('DimensionService');
    var _activeDimensionService = DimensionService.getPrimary();
    var _filters = {
      'histogram': [],
      'som': [ new CircleFilter('circle1', $injector).name('A'), new CircleFilter('circle2', $injector).name('B') ]
    };

    var _colors = d3.scale.category10();

    _.each( _filters.som, function(filt) {
      filt.color( _colors(filt.id()) );
    });

    var _filterReturnHandle = [];
    var _groupedBMUs;

    var service = {};

    var inWhatCircles = function(bmu) {
      var includedInCircle = function(bmu, circle) {
        // var circleBMUs = service.getSOMFilter(circleId);
        return _.any( circle.hexagons(), function(b) { return b.i === (bmu.y-1) && b.j === (bmu.x-1); } );
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

    $rootScope.$on('tab.changed', function(event, tabName) {
      _activeDimensionService = DimensionService.get(tabName);
      // _groupedBMUs = _activeDimensionService.getReducedGroupHistoDistributions( _activeDimensionService.getSOMDimension().group() );
    });

    service.getInfo = function() {
      return DimensionService.getPrimary().getSampleInfo();
    };

    service.getSOMFilters = function() {
      return _filters.som;
    };

    service.getSOMFilter = function(id) {
      return _.find( _filters.som, function(cf) { return cf.id() == id; } );
    };

    service.getSOMFilterColors = function() {
      return _colors;
    };

    service.getCircleFilterInfo = function() {
      _groupedBMUs = _activeDimensionService.getReducedGroupHistoDistributions( _activeDimensionService.getSOMDimension().group() );
      var ret = [];
      _.each( service.getSOMFilters(), function(circle) {
        var sum = d3.sum( _groupedBMUs.all(), function(d) { return d.value.counts[ circle.id() ] || 0; } );
        if( sum > 5000 ) {
          console.log("sum OVER", _groupedBMUs.all());
        }
        ret.push({ circle: circle, count: sum });
        // ret[circle.name()] = d3.sum( _groupedBMUs.all(), function(d) { return d.value.counts[ circle.id() ] || 0; } );
      });
      return ret;
    };

    service.addHistogramFilter = function(config) {
      var type = 'histogram';
      _filters[type].push(config);
      updateReturnFilters();
      console.log("after add", _filters[type]);
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
      console.log("after del", _filters['histogram']);
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

    var updateReturnFilters = function() {
      // _filterReturnHandle = angular.copy(_.chain(_filters).values().flatten().value() 
      angular.copy( _.chain(_filters).values().flatten().value(), _filterReturnHandle );
    };

    // var checkDefined = function(val, object, objectType) {
    //   if( _.isUndefined( object[val] ) ) {
    //     object[val] = objectType();
    //   }
    // };

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