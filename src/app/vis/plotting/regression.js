var visu = angular.module('plotter.vis.plotting.regression', 
  [
  'services.dimensions',
  'services.dataset',
  'services.window',
  'services.notify'
  ]);

visu.constant('REGRESSION_WIDTH', 450);

visu.controller('RegressionPlotController', ['$scope', '$rootScope', 'DimensionService', 'DatasetFactory', 'constants', '$state', '$injector', '$timeout', 'REGRESSION_WIN_X_PX', 'REGRESSION_WIN_Y_PX', 'REGRESSION_WIDTH', 'FilterService',
  function RegressionPlotController($scope, $rootScope, DimensionService, DatasetFactory, constants, $state, $injector, $timeout, REGRESSION_WIN_X_PX, REGRESSION_WIN_Y_PX, REGRESSION_WIDTH, FilterService) {
    console.log("regression plot");

    function windowSize(width, height) {
      $scope.window.size({
        x: Math.round(width/REGRESSION_WIN_X_PX) + 1,
        y: Math.round(height/REGRESSION_WIN_Y_PX) + 1
      });
    }

    $scope.drawChart = function($scope, data, variables) {
      var width = REGRESSION_WIDTH,
      height;

      $scope.chart = new RegressionChart()
      .element( $scope.element[0] )
      .width(width)
      .data(data)
      .variables(variables)
      .circleColors(FilterService.getSOMFilterColors())
      .datasetColors(DatasetFactory.getColorScale());

      height = $scope.chart.estimatedHeight();
      windowSize(width, height);

      $scope.chart.render();
    };

    $scope.updateChart = function($scope, data) {
      $scope.chart
      .data(data);

      var height = $scope.chart.estimatedHeight(),
      width = REGRESSION_WIDTH;

      windowSize(width, height);
      $scope.chart.render();
    };


}]);

visu.directive('plRegression', ['constants', '$timeout', '$rootScope', '$injector', 'DatasetFactory', 'RegressionService', 'NotifyService',
  function(constants, $timeout, $rootScope, $injector, DatasetFactory, RegressionService, NotifyService) {

    function postLink($scope, ele, attrs, ctrl) {
      function initDropdown() {
        $scope.window.addDropdown({
          type: "export:svg",
          element: $scope.element.find('svg.regression'),
          scope: $scope,
          source: 'svg',
          window: $scope.window
        });

        $scope.window.addDropdown({
          type: "export:png",
          element: $scope.element.find('svg.regression'),
          scope: $scope,
          source: 'svg',
          window: $scope.window
        });
      }

      function updateChart() {
        var selectedVariables = RegressionService.selectedVariables();
        $scope.window.spin(true);
        // $scope.$parent.startSpin();
        RegressionService.compute({ variables: selectedVariables, source: $scope.window.extra().source }, $scope.window.handler())
        .then(function succFn(result) {
          $scope.window.extra()['computation'] = result;
          $scope.updateChart($scope, $scope.window.extra().computation.result);
        }, function errFn(result) {
          NotifyService.addTransient('Regression computation failed', 'Something went wrong while updating the regression chart.', 'error');
          $scope.window.handler.removeByType('pl-regression');
        })
        .finally(function() {
          $scope.window.spin(false);
        });
      }

      $scope.element = ele;

      DatasetFactory.getVariables().then(function(variables) {
        $scope.drawChart($scope, $scope.window.extra().computation.result, variables);
        initDropdown();
      });

      $scope.deregisters = [];

      var reRenderUnbind = $rootScope.$on('window-handler.rerender', function(event, winHandler, config) {
        if( winHandler == $scope.window.handler() ) {
          // if( config.omit == 'histogram' ) { return; }
          $timeout( function() {
            updateChart();
          });
        }
      });

      var redrawUnbind =  $rootScope.$on('window-handler.redraw', function(event, winHandler) {
        if( winHandler == $scope.window.handler() ) {
          $timeout( function() {
            updateChart();
          });
        }
      });

      var gatherStateUnbind =  $rootScope.$on('UrlHandler:getState', function(event, callback) {

      });

      $scope.deregisters.push(reRenderUnbind, redrawUnbind, gatherStateUnbind);

      $scope.$on('$destroy', function() {
        _.each($scope.deregisters, function(unbindFn) {
          unbindFn();
        });
        $scope.chart.remove();
      });

      ele.on('$destroy', function() {
        $scope.$destroy();
      });

    }

    return {
      restrict: 'C',
      controller: 'RegressionPlotController',
      link: {
        post: postLink
      }
    };
  }
  ]);