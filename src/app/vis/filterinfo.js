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

mod.controller('FilterInfoController', ['$scope', '$injector', 'DimensionService', '$rootScope', 'constants', 'FilterService', '$alert', '$state',
  function FilterInfoController($scope, $injector, DimensionService, $rootScope, constants, FilterService, $alert, $state) {
    var numFormat = d3.format('.2e');
    var dimensionService = DimensionService.getPrimary();

    $scope.filters = [];
    $scope.$watch( function() { return FilterService.getFilters(); },
      function(val) { 
        angular.copy(val, $scope.filters); 
      }, true );

    $scope.filteredFilters = [];

    $scope.getAmount = function() {
      var re = /((?:\w+).(?:\w+))(?:.\w+)?/i;
      var parent = _.last( re.exec( $state.current.name ) );
      return _.chain($scope.filters)
      .reject( function(filter) { 
        if( filter.type == 'som' && parent !== 'vis.som' ) {
          return true;
        }
        return false; })
      .size()
      .value();
      // return $scope.filteredFilters.length; //$scope.filters.length;
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

    $scope.showFilter = function(filter) {
      if( filter.type == 'som' ) {
        var re = /((?:\w+).(?:\w+))(?:.\w+)?/i;
        var parent = _.last( re.exec( $state.current.name ) );
        return parent == 'vis.som'; 
      }
      return true;
    };

    var checkEdit = function() {
      if( !$scope.canEdit() ) {
        var alert = $alert({ 
          title: 'Error',
          content: 'Filters can only be edited on Explore tab',
          container: '#filterinfo-alert',
          type: 'danger',
          show: true,
          duration: 5,
          dismissable: true,
          animation: 'am-fade-and-slide-top'
        });
        return true;
      }
      return false;
    };

    $scope.somFilterCount = function(circleId) {
      return _.find( FilterService.getCircleFilterInfo(), function(cf) { return cf.circle.id() == circleId; } ).count;
    };

    $scope.close = function(filter, redraw) {
      if( checkEdit() ) { return; }

      if(filter.type == 'range') {
        FilterService.removeHistogramFilter(filter, redraw);
      }
    };

    $scope.canEdit = function() {
      return FilterService.canEdit();
    };

    $scope.reset = function() {
      if( checkEdit() ) { return; }

      _.each( angular.copy($scope.filters), function(f) {
        $scope.close(f, false);
      });
      // redraw only after all have been deleted
      $injector.get('WindowHandler').redrawVisible();
    };
  }
]);