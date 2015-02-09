var vis =
angular.module('plotter.vis.regression', 
  [
  'plotter.vis.plotting',
  'services.dataset',
  'services.window',
  'services.notify', 
  'services.dimensions', 
  'localytics.directives',
  'services.urlhandler'
  ]);

mod.controller('RegressionController', ['$scope', '$templateCache', 'DimensionService', '$rootScope', 'constants', 'variables', 'windowHandler',
  function RegressionController($scope, $templateCache, DimensionService, $rootScope, constants, variables, windowHandler) {
    $scope.handler = windowHandler;
    $scope.windows = windowHandler.get();
    console.log("regression ctrl");
  }
  ])

.controller('RegressionSubmenuController', ['$scope', '$templateCache', 'DimensionService', '$rootScope', 'windowHandler',
  function RegressionController($scope, $templateCache, DimensionService, $rootScope, windowHandler) {
    $scope.windowHandler = windowHandler;
  }
]);
