angular.module('plotter.vis.menucomponents.som-settingsmenu', 
  [
  'ext.lodash'
  ])

.constant('SOM_SETTINGS_AVAILABLE_SIZES', [
  { rows: 5, cols: 7 },
  { rows: 7, cols: 9 },
  { rows: 9, cols: 13 }
])
.controller('SOMSettingsMenuCtrl', 
  function SOMInputMenuCtrl($scope, DatasetFactory, SOMService, _, SOM_SETTINGS_AVAILABLE_SIZES) {

  $scope.selection = [];

  function setVariables() {
    DatasetFactory.getVariables().then(function(variables) {
      $scope.selection = _.map(SOMService.inputVariables(), function(somv) {
        return _.find(variables, function(v) { return v.name == somv; });
      });
    });
  }

  setVariables();

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
    function justNames(variables) {
      return _.map($scope.selection, function(v) {
        return v.name;
      });
    }

    var names = justNames($scope.selection);

    // update input variables
    SOMService.inputVariables(names);
    // update SOM size
    SOMService
    .rows($scope.sizes[$scope.selectedSize.ind].rows)
    .columns($scope.sizes[$scope.selectedSize.ind].cols);

    return {
      input: names,
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