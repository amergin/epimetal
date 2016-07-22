angular.module('plotter.vis.menucomponents.task-progress-indicator', 
  ['services.task-handler'])

.controller('TaskProgressIndicatorCtrl', function TaskProgressIndicator($scope, TaskHandlerService) {

  $scope.circleSpinMax = function() {
    return TaskHandlerService.circleSpinMax.apply(this, arguments);
  };

  $scope.circleSpin = function(x) {
    return TaskHandlerService.circleSpin.apply(this, arguments);
  };

  $scope.circleSpinValue = function(x) {
    return TaskHandlerService.circleSpinValue.apply(this, arguments);
  };

  $scope.getCircleInlineCSS = function(radius) {
    var width = $scope.element[0].offsetWidth,
      height = $scope.element[0].offsetHeight;
    return {
      'top': Math.ceil((height - radius * 2) / 2),
      'left': Math.ceil((width - radius * 2) / 2)
    };
  };

})

// directive for heatmap form
.directive('plTaskProgressIndicator', function plTaskHandler() {
  return {
    restrict: 'A',
    replace: true,
    controller: 'TaskProgressIndicatorCtrl',
    templateUrl: 'vis/menucomponents/task-progress-indicator.tpl.html',
    link: function (scope, elm, attrs) {
      scope.element = elm;
    }
  };
});