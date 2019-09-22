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
.controller('WindowActionController', function WindowActionController($rootScope, $scope, WindowHandler) {

  function verboseWindowType(figureName) {
    switch(figureName) {
      case 'pl-somplane':
        return 'SOM';

      case 'pl-histogram':
        return 'Histogram';

      case 'pl-classed-bar-chart':
        return 'Binary variable';

      case 'pl-boxplot':
        return 'Box plot';

      case 'pl-heatmap':
        return 'Heatmap';

      case 'pl-scatterplot':
        return 'Scatterplot';

      case 'pl-profile-histogram':
        return 'Profile Histogram';

      case 'pl-regression':
        return 'Regression Forest plot';

      default:
        return '(Unknown)';
    }
  }

  $scope.windowTypes = {};

  $scope.closeWindowType = function(type) {
    _.chain(WindowHandler.getVisible()[0].get())
    .filter(function(win) {
      return win.object.figure() == type;
    })
    .each(function(win) {
      win.object.remove();
    })
    .value();
  };

  $scope.toggleWindowTypeVisiblity = function(type) {

    var obj = $scope.windowTypes[type];
    obj.visible = !obj.visible;

    _.chain(WindowHandler.getVisible()[0].get())
    .filter(function(win) {
      return win.object.figure() == type;
    })
    .each(function(win) {
      win.object.toggleVisibility();
    })
    .value();
  };

  $scope.$watchCollection(function() {
    return WindowHandler.getVisible()[0].get();
  }, function(windows) {
    var visibleLookup = {};
    $scope.windowTypes = _.chain(windows)
    .countBy(function(win) {
      var type = win.object.figure();
      visibleLookup[type] = !win.object.hidden();
      return type;
    })
    .reduce(function(result, count, figureType) {
      result[figureType] = {
        count: count,
        visible: visibleLookup[figureType],
        name: verboseWindowType(figureType)
      };
      return result;
    }, {})
    .value();
  });

  $scope.visible = function() {
    return _.any(WindowHandler.getVisible(), function(handler) {
      return handler.get().length > 0;
    });
  };

  $scope.close = function() {
    _.each(WindowHandler.getVisible(), function(handler) {
      handler.get().splice(0); // remove
    });
  };

});