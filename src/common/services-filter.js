var mod = angular.module('services.filter', ['services.dimensions', 'services.window']);

mod.factory('FilterService', ['$injector', 'constants', '$rootScope', '$timeout', '$state', 'WindowHandler',
  function ($injector, constants, $rootScope, $timeout, usSpinnerService, $state, WindowHandler) {

    var _activeDimensionService = null;
    var _filters = {
      'histogram': [],
      'som': {}
    };
    var _filterReturnHandle = [];

    var DimensionService = $injector.get('DimensionService');

    var service = {};

    $rootScope.$on('tab.changed', function(event, tabName) {
      _activeDimensionService = DimensionService.get(tabName);
    });

    service.getInfo = function() {
      return _activeDimensionService.getSampleInfo();
    };

    service.getSOMFilters = function(somId) {
      return _filters['som'][somId];
    };

    service.updateSOMFilter = function(config) {
      var type = 'som';
      checkDefined( config.som_id, _filters[type], Object);
      checkDefined( config.circle, _filters[type][config.som_id], Object);
      _filters[type][config.som_id][config.circle] = config.hexagons;
      _activeDimensionService.updateSOMFilter( config.som_id, config.circle, config.hexagons );
      $injector.get('WindowHandler').reRenderVisible({ 'compute': true });
    };

    service.addHistogramFilter = function(config) {
      var type = 'histogram';
      // checkDefined(type, _filters, Array);
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

    var checkDefined = function(val, object, objectType) {
      if( _.isUndefined( object[val] ) ) {
        object[val] = objectType();
      }
    };

    return service;
  }
]);