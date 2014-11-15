var vis =
  angular.module('plotter.vis.som', 
    [
    'plotter.vis.som.histogram',
    'plotter.vis.som.metabolic',
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
    console.log("SOM ctrl");

    $scope.menuVisible = true;

    $scope.buttonIcon = function() {
      return $scope.menuVisible ? 'fa-minus-square' : 'fa-plus-square active';
    };

    $scope.toggle = function() {
      $scope.menuVisible = !$scope.menuVisible;
    };
  }
]);