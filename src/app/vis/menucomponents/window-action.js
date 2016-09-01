angular.module('plotter.vis.menucomponents.window-action', 
  [
  'services.window'
  ])

.directive('plWindowAction', function plWindowAction() {
    return {
      restrict: 'A',
      scope: false,
      replace: true,
      controller: 'WindowActionController',
      templateUrl: 'vis/menucomponents/window-action.tpl.html'
    };

})
.controller('WindowActionController', function WindowActionController($scope, WindowHandler) {

  $scope.visible = function() {
    return true;
  };

  $scope.close = function() {
    _.each(WindowHandler.getVisible(), function(handler) {
      if(handler.getName() !== 'vis.som.plane') {
        handler.get().splice(0); // remove
      }
    });
  };

});