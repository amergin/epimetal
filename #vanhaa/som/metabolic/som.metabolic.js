var vis =
  angular.module('plotter.vis.som.metabolic', 
    [
    'plotter.vis.plotting',
    'services.dataset',
    'services.window',
    'services.notify', 
    'services.dimensions', 
    'localytics.directives',
    'services.urlhandler'
    ]);

mod.controller('SOMMetabolicController', ['$scope', '$templateCache', 'DimensionService', '$rootScope', 'constants',
  function SOMMetabolicController($scope, $templateCache, DimensionService, $rootScope, constants) {
  }
]);