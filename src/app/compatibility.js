angular.module('plotter.compatibility', ['services.compatibility'])

.directive('compatibilityInform', function($rootScope) {
  return {
    restrict: 'C',
    scope: {},
    replace: true,
    controller: 'CompatibilityController'
  };
})

.controller('CompatibilityController', function CompatibilityController($scope, CompatibilityService) {
  $scope.features = CompatibilityService.getFeatures();
});