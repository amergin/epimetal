var mod = angular.module('plotter.vis.sampleinfo', ['services.dimensions', 'services.filter']);

mod.directive('sampleInfo', ['$templateCache', '$compile', '$rootScope', '$injector',
  function($templateCache, $compile, $rootScope, $injector) {
    return {
      restrict: 'C',
      scope: false,
      replace: true,
      controller: 'SampleInfoController',
      templateUrl: 'vis/sampleinfo.tpl.html'
    };
  }
]);

mod.controller('SampleInfoController', ['$scope', '$templateCache', 'DimensionService', '$rootScope', 'constants', 'FilterService',
  function FilterInfoController($scope, $templateCache, DimensionService, $rootScope, constants, FilterService) {

    // update value on change
    $scope.$watch( function() {
      return FilterService.getInfo();
    }, function(val) {
      $scope.info = val;
    });

  }
]);