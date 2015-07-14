var vis =
  angular.module('plotter.vis.menucomponents.som-modalmenu', 
    []);

vis.controller('SOMModalMenuCtrl', ['$scope', 'DatasetFactory', 'RegressionService', 'NotifyService', 'SOMService', 'WindowHandler', 'PlotService',
  function SOMModalMenuCtrl($scope, DatasetFactory, RegressionService, NotifyService, SOMService, WindowHandler, PlotService) {

    $scope.selection = {
      planes: [],
      profiles: angular.copy(DatasetFactory.getProfiles()),
      distributions: []
    };


    $scope.selectedTab = 'planes';

    $scope.selectTab = function(tab) {
      $scope.selectedTab = tab;
    };

    $scope.activeTabIs = function(tab) {
      return $scope.selectedTab == tab;
    };

    $scope.canSubmit = function() {
      var equality = {
        'profiles': function() {
          return _.any($scope.selection.profiles, function(prof) { return prof.selected; });
        },
        'distributions': function() {
          return $scope.selection.distributions.length >= 1;
        },
        'planes': function() {
          return $scope.selection.planes.length >= 1;
        }
      };

      return (equality[$scope.selectedTab])();
    };

    $scope.submit = function() {
      function justNames(variables) {
        return _.map(variables, function(v) {
          return v.name;
        });
      }
      var contentHandler = WindowHandler.get('vis.som.content'),
      planeHandler = WindowHandler.get('vis.som.plane');
      lookup = {
        'planes': {
          getData: function() {
            return justNames($scope.selection.planes);
          },
          action: function(variables) {
            _.each(variables, function(variable) {
                PlotService.drawSOM({ variables: { x: variable } }, planeHandler);
            });
          } 
        },

        'distributions': {
          getData: function() {
            return justNames($scope.selection.distributions);
          },
          action: function(variables) {
            _.each(variables, function(variable) {
              PlotService.drawHistogram({ variables: { x: variable }, somSpecial: true, filterEnabled: false }, contentHandler);
            });
          }
        },

        'profiles': {
          getData: function() {
            var selected = _.filter($scope.selection.profiles, function(prof) {
              return prof.selected;
            });
            return selected;
          },
          action: function(profiles) {
            _.each(profiles, function(prof) {
              PlotService.drawProfileHistogram({ name: prof.name, variables: { x: justNames(prof.variables) } }, contentHandler);
            });
          }
        }
      };

      var data = lookup[$scope.selectedTab].getData();
      lookup[$scope.selectedTab].action(data);
      return data;
    };

  }
]);


vis.directive('somModalMenu', function () {
  return {
    restrict: 'C',
    replace: false,
    scope: {
      canSubmit: "=reCanSubmit",
      submit: "=reSubmit",
      cancel: "=reCancel"
    },
    controller: 'SOMModalMenuCtrl',
    templateUrl: 'vis/menucomponents/som.modal.menu.tpl.html',
    link: function (scope, elm, attrs) {
    }
  };
});