var mod = angular.module('plotter.vis.som.circle-filter-control', ['services.dimensions', 'services.filter', 'mgcrea.ngStrap.alert']);

mod.directive('circleFilterControl', ['$templateCache', '$compile', '$rootScope', '$injector', 'FilterService',
  function($templateCache, $compile, $rootScope, $injector, FilterService) {
    return {
      restrict: 'C',
      scope: {},
      replace: false,
      controller: 'CircleFilterControlCtrl',
      templateUrl: 'vis/som/circle-filter-control.tpl.html'
    };
  }
]);

mod.constant('CIRCLE_FILTER_NAME_MAX_LENGTH', 4);

mod.controller('CircleFilterControlCtrl', ['$scope', 'FilterService', '$state', 'NotifyService', 'TabService', 'CIRCLE_FILTER_NAME_MAX_LENGTH', 'WindowHandler',
  function CircleFilterControlCtrl($scope, FilterService, $state, NotifyService, TabService, CIRCLE_FILTER_NAME_MAX_LENGTH, WindowHandler) {

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
      var modified = name.substring(0,CIRCLE_FILTER_NAME_MAX_LENGTH);
      try {
        var filter = FilterService.createCircleFilter(modified);
        update();
      } catch(err) {
        NotifyService.addSticky('Error', err.message, 'error', { referenceId: 'filterinfo' });
      }
    };

  }
]);