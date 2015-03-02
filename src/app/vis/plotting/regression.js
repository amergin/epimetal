var visu = angular.module('plotter.vis.plotting.regression', 
  [
  'services.dimensions',
  'services.dataset',
  'services.window'
  ]);
visu.controller('RegressionPlotController', ['$scope', '$rootScope', 'DimensionService', 'DatasetFactory', 'constants', '$state', '$injector', '$timeout',
  function RegressionPlotController($scope, $rootScope, DimensionService, DatasetFactory, constants, $state, $injector, $timeout) {
    console.log("regression plot");
  }
  ]);

visu.directive('regressionPlot', ['constants', '$timeout', '$rootScope', '$injector',
  function(constants, $timeout, $rootScope, $injector) {

    function postLink($scope, ele, attrs, ctrl) {

      $scope.$parent.element = ele;

      ele.on('$destroy', function() {
        $scope.$destroy();
      });

    }

    return {
      scope: false,
      restrict: 'C',
      controller: 'RegressionPlotController',
      templateUrl: 'vis/plotting/regression-plot.tpl.html',
      link: {
        post: postLink
      }
    };
  }
  ]);