var vis =
  angular.module('plotter.vis.menucomponents.som-inputmenu', 
    []);

vis.controller('SOMInputMenuCtrl', ['$scope', 'DatasetFactory', 'RegressionService', 'NotifyService', 'SOMService',
  function SOMInputMenuCtrl($scope, DatasetFactory, RegressionService, NotifyService, SOMService) {

    $scope.selection = [];

    function setVariables() {
      DatasetFactory.getVariables().then(function(variables) {
        var somVariables = SOMService.getVariables();
        $scope.selection = _.map(somVariables, function(somv) {
          return _.find(variables, function(v) { return v.name == somv; });
        });
      });
    }

    setVariables();

    $scope.canSubmit = function() {
      return $scope.selection.length >= 3;
    };

    $scope.submit = function() {
      function justNames(variables) {
        return _.map($scope.selection, function(v) {
          return v.name;
        });
      }

      var names = justNames($scope.selection);

      SOMService.setVariables(names);
      return names;
    };

  }
]);


vis.directive('somInputMenu', function () {
  return {
    restrict: 'C',
    replace: false,
    scope: {
      canSubmit: "=reCanSubmit",
      submit: "=reSubmit",
      cancel: "=reCancel"
    },
    controller: 'SOMInputMenuCtrl',
    templateUrl: 'vis/menucomponents/som.input.menu.tpl.html',
    link: function (scope, elm, attrs) {
    }
  };
});