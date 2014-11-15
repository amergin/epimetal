var vis =
  angular.module('plotter.vis.explore', 
    [
    'plotter.vis.plotting',
    'services.dataset',
    'services.window',
    'services.notify', 
    'services.dimensions', 
    'localytics.directives',
    'services.urlhandler'
    ]);

mod.controller('ExploreController', ['$scope', '$templateCache', '$rootScope', 'windowHandler',
  function ExploreController($scope, $templateCache, $rootScope, windowHandler) {
    console.log("explore ctrl");

    $scope.windowHandler = windowHandler;
    $scope.windows  = $scope.windowHandler.get();
  }
]);

mod.controller('ExploreMenuCtrl', ['$scope', '$templateCache', 'DimensionService', '$rootScope', 'constants', 'datasets', 'variables', 'windowHandler',
  function ExploreMenuCtrl($scope, $templateCache, DimensionService, $rootScope, constants, datasets, variables, windowHandler) {
    console.log("menu ctrl", datasets);

    $scope.windowHandler = windowHandler;
  }
]);
