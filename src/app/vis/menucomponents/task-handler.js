angular.module('plotter.vis.menucomponents.task-handler', 
  ['services.task-handler'])

.controller('TaskHandlerController', function TaskHandlerController($scope, TaskHandlerService) {

  $scope.visible = function() {

    return TaskHandlerService.hasTasks();
  };

  $scope.circleSpinMax = function() {
    return TaskHandlerService.circleSpinMax.apply(this, arguments);
  };

  $scope.circleSpin = function(x) {
    return TaskHandlerService.circleSpin.apply(this, arguments);
  };

  $scope.circleSpinValue = function(x) {
    return TaskHandlerService.circleSpinValue.apply(this, arguments);
  };

  $scope.cancel = function() {
    TaskHandlerService.cancelAll();
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
.directive('plTaskHandler', function plTaskHandler() {
  return {
    restrict: 'A',
    replace: true,
    controller: 'TaskHandlerController',
    templateUrl: 'vis/menucomponents/task-handler.tpl.html',
    link: function (scope, elm, attrs) {
      scope.element = elm;
    }
  };
});