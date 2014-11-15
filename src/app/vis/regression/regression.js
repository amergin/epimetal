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

  mod.controller('RegressionController', ['$scope', '$templateCache', 'DimensionService', '$rootScope', 'constants',
  function RegressionController($scope, $templateCache, DimensionService, $rootScope, constants) {
    console.log("regression ctrl");
  }
]);