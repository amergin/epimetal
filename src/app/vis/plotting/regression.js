var visu = angular.module('plotter.vis.plotting.regression', 
  [
  'services.dimensions',
  'services.dataset',
  'services.window'
  ]);
visu.controller('RegressionPlotController', ['$scope', '$rootScope', 'DimensionService', 'DatasetFactory', 'constants', '$state', '$injector', '$timeout',
  function RegressionPlotController($scope, $rootScope, DimensionService, DatasetFactory, constants, $state, $injector, $timeout) {
    console.log("regression plot");

    $scope.drawChart = function($scope, data, variables) {
      $scope.chart = new RegressionChart( $scope.$parent.element[0] )
      .data(data)
      .variables(variables)
      .totalColor('#2ca02c')
      .circleColors({
          'circle1': '#1f77b4',
          'circle2': '#ff7f0e'
      })
      .columns(2)
      .render();
    };

    $scope.updateChart = function($scope, data) {
      $scope.chart
      .data(data)
      .render();
    };


}]);

visu.directive('regressionPlot', ['constants', '$timeout', '$rootScope', '$injector', 'DatasetFactory',
  function(constants, $timeout, $rootScope, $injector, DatasetFactory) {

    function postLink($scope, ele, attrs, ctrl) {

      $scope.$parent.element = ele;

      DatasetFactory.getVariables().then(function(variables) {
        $scope.drawChart($scope, $scope.window.computation, variables);
      });


      $scope.deregisters = [];

      var reRenderUnbind = $rootScope.$on('window-handler.rerender', function(event, winHandler, config) {
        if( winHandler == $scope.window.handler ) {
          // if( config.omit == 'histogram' ) { return; }
          $timeout( function() {
            $scope.updateChart($scope, config);
          });
        }
      });

      var redrawUnbind =  $rootScope.$on('window-handler.redraw', function(event, winHandler) {
        if( winHandler == $scope.window.handler ) {
          $timeout( function() {
            $scope.updateChart($scope, config);
          });
        }
      });

      $scope.deregisters.push(reRenderUnbind, redrawUnbind);

      $scope.$on('$destroy', function() {
        _.each($scope.deregisters, function(unbindFn) {
          unbindFn();
        });
      });

      ele.on('$destroy', function() {
        $scope.$destroy();
      });

    }

    return {
      scope: false,
      restrict: 'C',
      controller: 'RegressionPlotController',
      link: {
        post: postLink
      }
    };
  }
  ]);