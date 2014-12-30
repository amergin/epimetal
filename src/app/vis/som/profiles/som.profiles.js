var vis =
  angular.module('plotter.vis.som.profiles', 
    [
    // 'plotter.vis.plotting',
    // 'services.dataset',
    // 'services.window',
    // 'services.notify', 
    // 'services.dimensions', 
    // 'localytics.directives',
    // 'services.urlhandler'
    ]);

mod.controller('SOMProfilesController', ['$scope', '$templateCache', '$rootScope', 'PlotService', 'DatasetFactory', 'windowHandler',
  function SOMProfilesController($scope, $templateCache, $rootScope, PlotService, DatasetFactory, windowHandler) {
  $scope.windowHandler = windowHandler;
  $scope.windowHandler.filtersEnabled(false);
  $scope.windows = $scope.windowHandler.get();

  $scope.getClass = function(type) {
    var number = $scope.windows.length;
    if( type == 'profile-histogram' ) {
      return (number == 2) ? 'col-sm-9' : 'col-sm-12';
    } else if( type == 'histogram' ) {
      return 'col-sm-3';
    }
  };

  $scope.histogramVisible = function() {
    return $scope.windows.length == 2;
    //return true;
  };

  }
]);

mod.controller('SOMProfilesMenuController', ['$scope', '$templateCache', '$rootScope', 'PlotService', 'DatasetFactory', 'windowHandler',
  function SOMProfilesMenuController($scope, $templateCache, $rootScope, PlotService, DatasetFactory, windowHandler) {
    $scope.windowHandler = windowHandler;

    // selected from the dropdown
    $scope.profile = {};
    DatasetFactory.getVariables().then( function(res) {
      $scope.profiles = DatasetFactory.getProfiles();
    });

    var removeOldProfile = function() {
      var ind = Utils.indexOf($scope.windowHandler.get(), function(win) {
        return win.type == 'profile-histogram';
      });
      if( ind != -1 ) {
        $scope.windowHandler.get().splice(ind,1);
      }
    };

    $scope.$watch('profile', function(profile) {
      if( _.isEmpty(profile) ) { return; }
      var activeSampleSize = $scope.windowHandler.getDimensionService().getSampleDimension().group().reduceCount().size();
      if( activeSampleSize === 0 ) { return; }
      removeOldProfile();
      PlotService.drawProfileHistogram({ variables: { x: profile.variables } }, $scope.windowHandler);
    });
  }
]);
