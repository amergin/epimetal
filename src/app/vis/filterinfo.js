var mod = angular.module('plotter.vis.filterinfo', ['services.dimensions']);

mod.directive('filterInfo', ['$templateCache', '$compile', '$rootScope', '$injector',
  function($templateCache, $compile, $rootScope, $injector) {
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

mod.controller('FilterInfoController', ['$scope', '$templateCache', 'DimensionService', '$rootScope', 'constants',
  function FilterInfoController($scope, $templateCache, DimensionService, $rootScope, constants) {
    var numFormat = d3.format('.2e');

    $scope.filters = DimensionService.getFilters();
    $scope.formatNumber = function(num) {
      return numFormat(num);
    };

    var _redraw = function() {
      $rootScope.$emit('scatterplot.redrawAll');
      $rootScope.$emit('histogram.redraw');
      $rootScope.$emit('heatmap.redraw');
      dc.redrawAll(constants.groups.scatterplot);
      dc.redrawAll(constants.groups.heatmap);
    };

    $scope.close = function(filter, redraw) {
      if(filter.payload.type == 'som') {
        DimensionService.removeSOMFilter(filter.payload.id, filter.payload.coord);
      }
      else if(filter.payload.type == 'range') {
        filter.payload.chart.filterAll();
      }

      if(redraw) { _redraw(); }
    };

    $scope.reset = function() {
      _.each( angular.copy($scope.filters), function(f) {
        $scope.close(f, false);
      });
      _redraw();
    };
  }
]);