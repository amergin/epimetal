var vis =
  angular.module('plotter.vis.som.distributions', 
    [
    // 'plotter.vis.plotting',
    // 'services.dataset',
    // 'services.window',
    // 'services.notify', 
    // 'services.dimensions', 
    // 'localytics.directives',
    // 'services.urlhandler'
    ]);

mod.controller('SOMDistributionsController', ['$scope', '$templateCache', '$rootScope', 'windowHandler',
  function SOMDistributionsController($scope, $templateCache, $rootScope, windowHandler) {
    $scope.windowHandler = windowHandler;
    $scope.windows  = $scope.windowHandler.get();    
  }
]);

mod.controller('SOMMenuController', ['$scope', '$templateCache', '$rootScope', 'windowHandler',
  function SOMMenuController($scope, $templateCache, $rootScope, windowHandler) {
    $scope.windowHandler = windowHandler;
  }
]);

