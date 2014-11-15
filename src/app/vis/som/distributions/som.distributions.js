var vis =
  angular.module('plotter.vis.som.distributions', 
    [
    'plotter.vis.plotting',
    'services.dataset',
    'services.window',
    'services.notify', 
    'services.dimensions', 
    'localytics.directives',
    'services.urlhandler'
    ]);

mod.controller('SOMDistributionsController', ['$scope', '$templateCache', 'DimensionService', '$rootScope', 'constants',
  function SOMDistributionsController($scope, $templateCache, DimensionService, $rootScope, constants) {
  }
]);