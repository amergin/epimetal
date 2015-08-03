angular.module('plotter.vis.plotting.regression', 
  [
  'services.dimensions',
  'services.dataset',
  'services.window',
  'services.notify',
  'services.regression.ww'
  ])

.constant('REGRESSION_WIDTH', 450)
.constant('REGRESSION_DEFAULT_X', 9)
.constant('REGRESSION_DEFAULT_Y', 4)

.controller('RegressionPlotController', ['$scope', '$rootScope', 'DimensionService', 'DatasetFactory', 'constants', '$state', '$injector', '$timeout', 'REGRESSION_WIN_X_PX', 'REGRESSION_WIN_Y_PX', 'REGRESSION_WIDTH', 'FilterService',
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
      .header([
        { 'title': 'Target variable', 'content': $scope.window.extra().computation.input.target },
        { 'title': 'Adjust variables', 'content': $scope.window.extra().computation.input.adjust }
      ])
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


}])

.directive('plRegression', ['constants', '$timeout', '$rootScope', '$injector', 'DatasetFactory', 'RegressionService', 'NotifyService',
  function(constants, $timeout, $rootScope, $injector, DatasetFactory, RegressionService, NotifyService) {

    function postLink($scope, ele, attrs, ctrl) {
      function initDropdown() {
        var selector = _.template('#<%= id %> <%= element %>.<%= cls %>'),
        id = $scope.element.parent().attr('id');

        $scope.window.addDropdown({
          type: "export:svg",
          selector: selector({ id: id, element: 'svg', cls: 'regression' }),
          scope: $scope,
          source: 'svg',
          window: $scope.window
        });

        $scope.window.addDropdown({
          type: "export:png",
          selector: selector({ id: id, element: 'svg', cls: 'regression' }),
          scope: $scope,
          source: 'svg',
          window: $scope.window
        });
      }

      function updateChart() {
        var selectedVariables = $scope.window.extra().computation.input;
        NotifyService.addTransient('Regression analysis started', 'Regression analysis computation started.', 'info');
        RegressionService.compute({ variables: selectedVariables, source: $scope.window.extra().source }, $scope.window)
        .then(function succFn(result) {
          NotifyService.addTransient('Regression analysis completed', 'Regression chart ready.', 'success');
          $scope.window.extra()['computation'] = result;
          $scope.updateChart($scope, $scope.window.extra().computation.result);
        }, function errFn(result) {
          NotifyService.addTransient('Regression computation failed', 'Something went wrong while updating the regression chart.', 'error');
          // $scope.window.handler.removeByType('pl-regression');
        })
        .finally(function() {
        });
      }

      $scope.element = ele;

      DatasetFactory.getVariables().then(function(variables) {
        RegressionService.compute({ variables: $scope.window.variables(), source: $scope.window.extra().source }, $scope.window)
        .then(function succFn(result) {
          $scope.window.extra()['computation'] = result;
          $scope.drawChart($scope, $scope.window.extra().computation.result, variables);
        }, function errFn(result) {
          // NotifyService.addTransient('Regression computation failed', 'Something went wrong while updating the regression chart.', 'error');
        })
        .finally(function() {
        });
      });

      $scope.deregisters = [];

      var reRenderUnbind = $rootScope.$on('window-handler.rerender', function(event, winHandler, config) {
        if( winHandler == $scope.window.handler() ) {
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
        if($scope.chart) {
          $scope.chart.remove();
        }
      });

      ele.on('$destroy', function() {
        $scope.$destroy();
      });

      initDropdown();
    }

    return {
      restrict: 'C',
      controller: 'RegressionPlotController',
      link: {
        post: postLink
      }
    };

}]);