angular.module('plotter.vis.menucomponents.sampleinfo', 
  [
  'services.dimensions', 
  'services.filter'
  ])

.directive('plSampleInfo', function plSampleInfo() {
    return {
      restrict: 'A',
      scope: false,
      replace: true,
      controller: 'SampleInfoController',
      templateUrl: 'vis/menucomponents/sampleinfo.tpl.html'
    };

})
.controller('SampleInfoController', function FilterInfoController($scope, FilterService) {

    // update value on change
    $scope.$watch( function() {
      return FilterService.getInfo();
    }, function(val) {
      $scope.info = val;
    });

});