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
  $scope.windows = $scope.windowHandler.get();

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


    $scope.$watch('profile', function(profile) {
      if( _.isEmpty(profile) ) { return; }
      var activeSampleSize = $scope.windowHandler.getDimensionService().getSampleDimension().group().reduceCount().size();
      if( activeSampleSize === 0 ) { return; }
      PlotService.drawProfileHistogram({ variables: { x: profile.variables } }, $scope.windowHandler);
    });
  }
]);
