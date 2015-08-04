angular.module('plotter.vis.som.circle-filter-control', [
  'services.dimensions',
  'services.filter'
])

.directive('plCircleFilterControl', function plCircleFilterControl() {
  return {
    restrict: 'A',
    scope: {},
    replace: false,
    controller: 'CircleFilterControlCtrl',
    templateUrl: 'vis/som/circle-filter-control.tpl.html'
  };
})

.constant('CIRCLE_FILTER_NAME_MAX_LENGTH', 4)

.controller('CircleFilterControlCtrl', function CircleFilterControlCtrl($scope, FilterService, $state, NotifyService, TabService, CIRCLE_FILTER_NAME_MAX_LENGTH, WindowHandler) {

  $scope.isVisible = function() {
    var stateName = $state.current.name;
    return stateName == 'vis.som' ? true : false;
  };

  $scope.cirleMaxLength = CIRCLE_FILTER_NAME_MAX_LENGTH;

  function update() {
    $scope.circles = FilterService.getSOMFilters();
  }

  $scope.remove = function(filter) {
    FilterService.removeCircleFilter(filter);
    update();
    // WindowHandler.reRenderVisible();
    WindowHandler.redrawVisible();
  };

  $scope.canSubmit = function() {
    return !TabService.lock();
  };

  update();

  $scope.circleName = null;

  $scope.createCircle = function(name) {
    var modified = name.substring(0, CIRCLE_FILTER_NAME_MAX_LENGTH);
    try {
      var filter = FilterService.createCircleFilter(modified);
      update();
    } catch (err) {
      NotifyService.addSticky('Error', err.message, 'error', {
        referenceId: 'filterinfo'
      });
    }
  };

});