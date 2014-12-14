var mod = angular.module('plotter.vis.filterinfo', ['services.dimensions', 'services.filter']);

mod.directive('filterInfo', ['$templateCache', '$compile', '$rootScope', '$injector', 'FilterService',
  function($templateCache, $compile, $rootScope, $injector, FilterService) {
    return {
      restrict: 'C',
      scope: false,
      replace: true,
      priority: 7000,
      controller: 'FilterInfoController',
      template: function(tElem, tAttrs) {
        var button = $templateCache.get('vis/filterinfo.btn.tpl.html');
        var btnEl = angular.element(button);
        return btnEl[0].outerHTML;
      }
    };
  }
]);

mod.controller('FilterInfoController', ['$scope', '$injector', 'DimensionService', '$rootScope', 'constants', 'FilterService',
  function FilterInfoController($scope, $injector, DimensionService, $rootScope, constants, FilterService) {
    var numFormat = d3.format('.2e');
    var dimensionService = DimensionService.getPrimary();

    $scope.filters = [];
    $scope.$watch( function() { return FilterService.getFilters(); },
      function(val) { 
        angular.copy(val, $scope.filters); 
      }, true );

    $scope.getAmount = function() {
      return $scope.filters.length;
    };

    $scope.formatNumber = function(num) {
      return numFormat(num);
    };

    $scope.filterOrder = function(filt) {
      if(filt.type === 'som') {
        return "som(" + filt.hexagons + ")";
      } else if(filt.type === 'range') {
        return "range" + filt.var;
      }
    };

    $scope.close = function(filter, redraw) {
      if(filter.type == 'range') {
        FilterService.removeHistogramFilter(filter, redraw);
      }
    };

    $scope.reset = function() {
      _.each( angular.copy($scope.filters), function(f) {
        $scope.close(f, false);
      });
      // redraw only after all have been deleted
      $injector.get('WindowHandler').redrawVisible();
    };
  }
]);