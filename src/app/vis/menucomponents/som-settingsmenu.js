angular.module('plotter.vis.menucomponents.som-settingsmenu', 
  [
  'ext.lodash',
  'services.variable',
  'services.dataset'
  ])

.constant('SOM_SETTINGS_AVAILABLE_SIZES', [
  { rows: 5, cols: 7 },
  { rows: 7, cols: 9 },
  { rows: 9, cols: 13 }
])
.controller('SOMSettingsMenuCtrl', 
  function SOMInputMenuCtrl($scope, DatasetFactory, VariableService, SOMService, _, SOM_SETTINGS_AVAILABLE_SIZES) {

    $scope.selection = SOMService.trainVariables();

    $scope.tabInd = 0;

    $scope.selectTab = function(ind) {
      $scope.tabInd = ind;
    };

    $scope.canSubmit = function() {
      if($scope.tabInd === 0) {
        return $scope.selection.length >= 3;
      }
      else if($scope.tabInd == 1) {
        return true;
      }
    };

    $scope.sizes = SOM_SETTINGS_AVAILABLE_SIZES;
    var currentSelection = { rows: SOMService.rows(), cols: SOMService.columns() };
    $scope.selectedSize = {
      ind: Utils.indexOf($scope.sizes, function(d) { return _.isEqual(d, currentSelection); })
    };

    $scope.submit = function() {
      // update input variables
      SOMService.trainVariables($scope.selection);
      // update SOM size
      SOMService
      .rows($scope.sizes[$scope.selectedSize.ind].rows)
      .columns($scope.sizes[$scope.selectedSize.ind].cols);

      return {
        input: $scope.selection,
        size: $scope.sizes[$scope.selectedSize.ind]
      };
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