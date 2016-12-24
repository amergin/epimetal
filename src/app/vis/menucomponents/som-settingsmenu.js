angular.module('plotter.vis.menucomponents.som-settingsmenu', 
  [
  'ext.lodash',
  'services.variable',
  'services.dataset',
  'mgcrea.ngStrap.button'
  ])

.constant('SOM_SETTINGS_AVAILABLE_SIZES', [
  { rows: 5, cols: 7 },
  { rows: 7, cols: 9 },
  { rows: 9, cols: 13 }
])
.controller('SOMSettingsMenuCtrl', 
  function SOMInputMenuCtrl($scope, DatasetFactory, VariableService, SOMService, 
    _, SOM_SETTINGS_AVAILABLE_SIZES) {

    // make a shallow copy so the unsaved modifications are not propagated via reference
    $scope.selection = angular.copy(SOMService.trainVariables());

    VariableService.getDefaultPivotSettings().then(function succFn(settings) {
      var defaultPivot = SOMService.pivotVariable();
      $scope.pivot = {
        enabled: SOMService.pivotVariableEnabled(),
        variable: defaultPivot ? angular.copy([defaultPivot]) : angular.copy([])
      };
    });

    $scope.tabInd = 0;

    $scope.selectTab = function(ind) {
      $scope.tabInd = ind;
    };

    function getTabName() {
      var ind = $scope.tabInd;
      if(ind === 0) { return 'trainVariables'; }
      if(ind === 1) { return 'size'; }
      if(ind === 2) { return 'pivotVariable'; }
    }

    $scope.canSubmit = function() {
      if($scope.tabInd === 0) {
        return $scope.selection.length >= 3;
      }
      else if($scope.tabInd === 1) {
        return true;
      }
      else if($scope.tabInd === 2) {
        return !$scope.pivotEnabled || $scope.pivotVariable.length > 0;
      }
    };

    $scope.sizes = SOM_SETTINGS_AVAILABLE_SIZES;
    var currentSelection = { rows: SOMService.rows(), cols: SOMService.columns() };
    $scope.selectedSize = {
      ind: Utils.indexOf($scope.sizes, function(d) { return _.isEqual(d, currentSelection); })
    };

    $scope.submit = function() {
      var ret = {
        activeTab: getTabName(),
        trainVariables: $scope.selection,
        size: $scope.sizes[$scope.selectedSize.ind],
        pivot: {
          enabled: $scope.pivot.enabled,
        }
      };
      if($scope.pivot.variable.length > 0) {
        ret.pivot['variable'] = $scope.pivot.variable[0];
      }
      return ret;
    };

})

.directive('somSettingsMenu', function somSettingsMenu() {
  return {
    restrict: 'C',
    replace: false,
    scope: {
      canSubmit: "=reCanSubmit",
      submit: "=reSubmit",
      cancel: "=reCancel"
    },
    controller: 'SOMSettingsMenuCtrl',
    templateUrl: 'vis/menucomponents/som.settings.menu.tpl.html',
    link: function (scope, elm, attrs) {
    }
  };
});