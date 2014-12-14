var mod = angular.module('plotter.vis.sampleinfo', ['services.dimensions', 'services.filter']);

mod.directive('sampleInfo', ['$templateCache', '$compile', '$rootScope', '$injector',
  function($templateCache, $compile, $rootScope, $injector) {
    return {
      restrict: 'C',
      scope: false,
      replace: true,
      controller: 'SampleInfoController',
      templateUrl: 'vis/sampleinfo.tpl.html'
      // template: function(tElem, tAttrs) {
      //   var button = $templateCache.get('vis/sampleinfo.tpl.html');
      //   var btnEl = angular.element(button);
      //   return btnEl[0].outerHTML;
      // }
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