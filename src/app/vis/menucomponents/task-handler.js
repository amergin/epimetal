angular.module('plotter.vis.menucomponents.task-handler', 
  ['services.task-handler'])

.controller('TaskHandlerController', ['$scope', 'TaskHandlerService',
  function TaskHandlerController($scope, TaskHandlerService) {
    $scope.visible = function() {
      return TaskHandlerService.hasTasks();
    };

    $scope.cancel = function() {
      TaskHandlerService.cancelAll();
    };

  }
])

// directive for heatmap form
.directive('plTaskHandler', function () {
  return {
    restrict: 'A',
    replace: true,
    controller: 'TaskHandlerController',
    templateUrl: 'vis/menucomponents/task-handler.tpl.html',
    link: function (scope, elm, attrs) {
    }
  };
});