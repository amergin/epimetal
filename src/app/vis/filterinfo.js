var mod = angular.module('plotter.vis.filterinfo', ['services.dimensions', 'services.filter', 'mgcrea.ngStrap.alert']);

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

mod.controller('FilterInfoController', ['$scope', '$timeout', '$injector', 'DimensionService', '$rootScope', 'constants', 'FilterService', '$state', 'NotifyService', 'TabService',
  function FilterInfoController($scope, $timeout, $injector, DimensionService, $rootScope, constants, FilterService, $state, NotifyService, TabService) {
    var numFormat = d3.format('.2e');
    var dimensionService = DimensionService.getPrimary();

    $scope.filters = [];
    $scope.$watch( function() { return FilterService.getFilters(); },
      function(val) { 
        angular.copy(val, $scope.filters); 
      }, true );

    $scope.getAmount = function() {
      return _.chain($scope.filters)
      .map($scope.showFilter)
      .countBy()
      .value().true || 0;
    };

    $scope.formatNumber = function(num) {
      return numFormat(num);
    };

    $scope.filterOrder = function(filt) {
      // if(filt.type === 'som') {
      //   return "som(" + filt.hexagons + ")";
      // } else if(filt.type === 'range') {
      //   return "range" + filt.var;
      // }
    };

    $scope.showFilter = function(filter) {
      if(filter.type() == 'circle') {
        var state = TabService.activeState().name;
        var isSomState = _.startsWith(state, 'vis.som');
        return isSomState;
      } 
      return true;
    };

    var checkEdit = function() {
      if( !$scope.canEdit() ) {
        NotifyService.addSticky('Warning', 'Filters can only be edited on Explore tab.', 'warn', 
          { referenceId: 'filterinfo' });
        return true;
      }
      return false;
    };

    $scope.somFilterCount = function(circleId) {
      return _.find( FilterService.getCircleFilterInfo(), function(cf) { return cf.circle.id() == circleId; } ).count;
    };

    $scope.close = function(filter) {
      if( checkEdit() ) { return; }

      FilterService.removeFilter(filter);
      if(FilterService.getActiveFilters().length === 0) {
        $timeout(function() {
          $injector.get('WindowHandler').reRenderVisible({ compute: true, omit: 'histogram' });
          $injector.get('WindowHandler').redrawVisible();
        });
      }
    };

    $scope.canEdit = function() {
      return FilterService.canEdit();
    };

    $scope.reset = function() {
      _.each($scope.filters, function(filter) {
        filter.remove();
      });
      $scope.filters = [];
      $timeout(function() {
        $injector.get('WindowHandler').reRenderVisible({ compute: true, omit: 'histogram' });
        $injector.get('WindowHandler').redrawVisible();
      });
    };
  }
]);