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

.constant('CIRCLE_FILTER_NAME_MAX_LENGTH', 20)

.controller('CircleFilterControlCtrl', function CircleFilterControlCtrl($scope, FilterService, $state, NotifyService, TabService, WindowHandler, CIRCLE_FILTER_NAME_MAX_LENGTH) {

  $scope.isVisible = function() {
    var stateName = $state.current.name;
    return stateName == 'vis.som' ? true : false;
  };

  $scope.circleNameMaxLength = CIRCLE_FILTER_NAME_MAX_LENGTH;

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
    try {
      var filter = FilterService.createCircleFilter({ name: name });
      update();
    } catch (err) {
      NotifyService.addSticky('Error', err.message, 'error', {
        referenceId: 'filterinfo'
      });
    }
  };

});