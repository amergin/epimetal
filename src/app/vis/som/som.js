var vis =
  angular.module('plotter.vis.som', 
    [
    'plotter.vis.plotting',
    'services.dataset',
    'services.window',
    'services.notify', 
    'services.dimensions', 
    'localytics.directives',
    'services.urlhandler'
    ]);

mod.controller('SOMController', ['$scope', '$templateCache', 'DimensionService', '$rootScope', 'constants',
  function SOMController($scope, $templateCache, DimensionService, $rootScope, constants) {
    console.log("som ctrl");
  }
]);