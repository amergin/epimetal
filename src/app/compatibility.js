angular.module('plotter.compatibility', ['services.compatibility', 
  'ngSanitize', 
  'mgcrea.ngStrap.alert', 
  'mgcrea.ngStrap.popover', 
  'mgcrea.ngStrap.modal'])

.directive('compatibilityInform', ['$rootScope',
  function($rootScope) {
    return {
      restrict: 'C',
      scope: {},
      replace: true,
      controller: 'CompatibilityController'
    };
  }
  ])

.controller('CompatibilityController', ['$scope', '$modal', 'CompatibilityService',
  function CompatibilityController($scope, $modal, CompatibilityService) {
    console.log("compatibility");

    $scope.features = CompatibilityService.getFeatures();

    var modal = $modal({
      scope: $scope,
      contentTemplate: 'compatibility-inform.tpl.html',
      show: true,
      backdrop: 'static',
      keyboard: false,
      placement: 'center',
      animation: 'am-fade-and-scale'
    });


  }
  ]);