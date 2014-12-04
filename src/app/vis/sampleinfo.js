var mod = angular.module('plotter.vis.sampleinfo', ['services.dimensions']);

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

mod.controller('SampleInfoController', ['$scope', '$templateCache', 'DimensionService', '$rootScope', 'constants',
  function FilterInfoController($scope, $templateCache, DimensionService, $rootScope, constants) {
    $scope.info = DimensionService.getPrimary().getSampleInfo();
  }
]);