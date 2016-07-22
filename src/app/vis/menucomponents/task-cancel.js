angular.module('plotter.vis.menucomponents.task-cancel', 
  ['services.task-handler'])

.controller('TaskCancelCtrl', function TaskProgressIndicator($scope, TaskHandlerService) {

  $scope.visible = function() {

    return TaskHandlerService.hasTasks();
  };

  $scope.cancel = function() {
    TaskHandlerService.cancelAll();
  };

})

// directive for heatmap form
.directive('plTaskCancel', function plTaskCancel() {
  return {
    restrict: 'A',
    replace: true,
    controller: 'TaskCancelCtrl',
    templateUrl: 'vis/menucomponents/task-cancel.tpl.html',
    link: function (scope, elm, attrs) {
      scope.element = elm;
    }
  };
});