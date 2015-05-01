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

    $scope.drawChart = function($scope, data, variables) {
      function windowSize(width, height) {
        $scope.window.grid.size.x = Math.round(width/REGRESSION_WIN_X_PX) + 1;
        $scope.window.grid.size.y = Math.round(height/REGRESSION_WIN_Y_PX) + 1;
      }
      var width = REGRESSION_WIDTH,
      height;

      $scope.chart = new RegressionChart()
      .element( $scope.$parent.element[0] )
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
      .data(data)
      .render();
    };


}]);

visu.directive('regressionPlot', ['constants', '$timeout', '$rootScope', '$injector', 'DatasetFactory', 'RegressionService', 'NotifyService',
  function(constants, $timeout, $rootScope, $injector, DatasetFactory, RegressionService, NotifyService) {

    function postLink($scope, ele, attrs, ctrl) {
      function updateChart() {
        var selectedVariables = RegressionService.selectedVariables();
        RegressionService.compute({ variables: selectedVariables, source: $scope.window.source }, $scope.window.handler)
        .then(function succFn(result) {
          $scope.window.computation = result;
          $scope.updateChart($scope, $scope.window.computation.result);
        }, function errFn(result) {
          NotifyService.addTransient('Regression computation failed', 'Something went wrong while updating the regression chart.', 'error');
          $scope.window.handler.removeByType('regression-plot');
        });
      }

      $scope.$parent.element = ele;

      DatasetFactory.getVariables().then(function(variables) {
        $scope.drawChart($scope, $scope.window.computation.result, variables);
      });


      $scope.deregisters = [];

      var reRenderUnbind = $rootScope.$on('window-handler.rerender', function(event, winHandler, config) {
        if( winHandler == $scope.window.handler ) {
          // if( config.omit == 'histogram' ) { return; }
          $timeout( function() {
            updateChart();
          });
        }
      });

      var redrawUnbind =  $rootScope.$on('window-handler.redraw', function(event, winHandler) {
        if( winHandler == $scope.window.handler ) {
          $timeout( function() {
            updateChart();
          });
        }
      });

      var gatherStateUnbind =  $rootScope.$on('UrlHandler:getState', function(event, callback) {
        var retObj = _.chain($scope.window)
        .pick(['type', 'grid', 'handler', 'computation'])
        .clone()
        .value();

        callback(retObj);
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
      scope: false,
      restrict: 'C',
      controller: 'RegressionPlotController',
      link: {
        post: postLink
      }
    };
  }
  ]);