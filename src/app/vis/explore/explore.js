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

mod.controller('ExploreController', ['$scope', '$templateCache', 'DimensionService', '$rootScope', 'constants', 'datasets', 'variables',
  function ExploreController($scope, $templateCache, DimensionService, $rootScope, constants, datasets, variables) {
    console.log("explore ctrl", datasets, variables);
  }
]);

mod.controller('ExploreMenuCtrl', ['$scope', '$templateCache', 'DimensionService', '$rootScope', 'constants', 'datasets', 'variables',
  function ExploreMenuCtrl($scope, $templateCache, DimensionService, $rootScope, constants, datasets, variables) {
    console.log("menu ctrl", datasets);
  }
]);
