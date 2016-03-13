angular.module('plotter.vis.som.trainvariables', 
  ['mgcrea.ngStrap.popover'])

.controller('TrainvariablesController', function TrainvariablesController($scope, $popover, $element) {

    // create popover relative to the button
    $scope.popover = $popover($element, {
      title: 'Train variables',
      trigger: 'manual',
      placement: 'bottom-left',
      contentTemplate: 'vis/som/vis.som.side.trainvariables.tpl.html',
      autoClose: 1
    });

    $scope.arrays = [];

    $scope.$watch('variables', function(val) {
      angular.copy(Utils.subarrays($scope.variables, 2), $scope.arrays);
    });

    $scope.popover.$scope.arrays = function() {
      return $scope.arrays;
    };

    $scope.click = function() {
      $scope.popover.show();
    };

})

// directive for heatmap form
.directive('plTrainVariables', function () {
  return {
    restrict: 'A',
    scope: {
      'variables': '=reVariables'
    },
    // replace: true,
    controller: 'TrainvariablesController',
    template: 'Train variables: <button type="button" class="btn btn-sm btn-secondary" ng-click="click()">{{variables.length}}</button>',
    link: function (scope, elm, attrs) {
    }
  };
});