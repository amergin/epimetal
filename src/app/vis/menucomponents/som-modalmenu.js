angular.module('plotter.vis.menucomponents.som-modalmenu', 
[
'ext.lodash'
])

.constant('MAX_PLANE_VARS', 25)

.controller('SOMModalMenuCtrl', function SOMModalMenuCtrl($scope, VariableService, NotifyService, WindowHandler, PlotService, MAX_PLANE_VARS, DimensionService, _) {

    $scope.selection = {
      planes: [],
      profiles: [],
      distributions: []
    };

    VariableService.getSOMDefaultProfiles().then(function(profiles) {
      $scope.selection.profiles = angular.copy(profiles);
    });

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
        },
        'boxplots': function() {
          return $scope.selection.boxplots.length >= 1;
        }
      };

      return (equality[$scope.selectedTab])();
    };

    $scope.submit = function() {
      function hasError() {
        var error = false,
        selectionCount = $scope.selection[$scope.selectedTab].length;

        switch($scope.selectedTab) {
          case 'planes':
          if(selectionCount > MAX_PLANE_VARS) {
            NotifyService.addSticky('Too many selected variables', 'Please limit your selections to ' + MAX_PLANE_VARS + ' variables.', 'error', 
              { referenceId: 'sominfo' });
            error = true;
          }
          break;

          case 'distributions':
          var dimensionCount = DimensionService.getSecondary().availableDimensionsCount();
          if(dimensionCount < selectionCount) {
            NotifyService.addSticky('Too many selected variables', 'Please select a maximum of ' + dimensionCount + ' variables. You can free variables by first closing unnecessary figure windows on this tab.', 
              'error', { referenceId: 'sominfo' });
            error = true;
          }
          break;
        }

        return error;
      }

      if(hasError()) {
        return false;
      }

      var contentHandler = WindowHandler.get('vis.som'),
      planeHandler = contentHandler,
      lookup = {
        'planes': {
          getData: function() {
            return $scope.selection.planes;
          },
          action: function(variables) {
            _.each(variables, function(variable) {
                PlotService.drawSOM({ 
                  variable: variable 
                  //prepend: true,
                  //prependMode: 'vertical' 
                }, planeHandler);
            });
          } 
        },

        'distributions': {
          getData: function() {
            return $scope.selection.distributions;
          },
          action: function(variables) {
            _.each(variables, function(variable) {
              PlotService.drawHistogram({ variable: variable, somSpecial: true, filterEnabled: false }, contentHandler);
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
              PlotService.drawProfileHistogram({ name: prof.name, variables: prof.variables }, contentHandler);
            });
          }
        },

        'boxplots': {
          getData: function() {
            return $scope.selection.boxplots;
          },
          action: function(variables) {
            _.each(variables, function(variable) {
              PlotService.drawBoxplot({ variable: variable, somSpecial: true }, contentHandler);
            });
          }
        }

      };

      var data = lookup[$scope.selectedTab].getData();
      lookup[$scope.selectedTab].action(data);
      return data;
    };

})

.directive('somModalMenu', function somModalMenu() {
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