angular.module('plotter.vis.menucomponents.sampleinfo', 
  [
  'services.dimensions', 
  'services.filter'
  ])

.directive('plSampleInfo', ['$templateCache', '$compile', '$rootScope', '$injector',
  function($templateCache, $compile, $rootScope, $injector) {
    return {
      restrict: 'A',
      scope: false,
      replace: true,
      controller: 'SampleInfoController',
      templateUrl: 'vis/menucomponents/sampleinfo.tpl.html'
    };
  }
])

.controller('SampleInfoController', ['$scope', '$templateCache', 'DimensionService', '$rootScope', 'constants', 'FilterService',
  function FilterInfoController($scope, $templateCache, DimensionService, $rootScope, constants, FilterService) {

    // update value on change
    $scope.$watch( function() {
      return FilterService.getInfo();
    }, function(val) {
      $scope.info = val;
    });

  }
]);