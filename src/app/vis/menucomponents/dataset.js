var vis =
  angular.module('plotter.vis.menucomponents.dataset', 
    [
    ]);

// directive for displaying the dataset table on sidebar
vis.directive('datasetForm', function () {
  return {
    scope: {},
    restrict: 'C',
    templateUrl: 'vis/menucomponents/dataset.tpl.html',
    replace: true,
    controller: 'DatasetTableController'
  };
});

// dataset table controller
vis.controller('DatasetTableController', ['$scope', '$rootScope', 'DatasetFactory', 'DimensionService', 'NotifyService', 'constants', '$location', 'UrlHandler', 'WindowHandler', 'FilterService', 'TabService',
  function DatasetTableController($scope, $rootScope, DatasetFactory, DimensionService, NotifyService, constants, $location, UrlHandler, WindowHandler, FilterService, TabService) {

    $scope.$watch(function() {
      return DatasetFactory.getSets();
    }, function(sets) {
      $scope.datasets = _.values(sets);
    }, true);

    $scope.removeDerived = function(set) {
      DatasetFactory.removeDerived(set);
    };

    $scope.isDerived = function(set) {
      return set.type() == 'derived';
    };

    $scope.canToggle = function() {
      return !TabService.lock();
    };

    $scope.toggle = function(set) {
      WindowHandler.spinAllVisible();

      set.toggle();
      DatasetFactory.checkActiveVariables(set).then( function succFn(res) {

        if( res === 'enabled' || res === 'disabled' ) {
          DatasetFactory.updateDataset(set);

          TabService.check({ force: true, origin: 'dataset' });

          // important!
          WindowHandler.reRenderVisible({ compute: true, dset: set, action: ("dataset:" + res) });
        }
        else if( res === 'empty' ) {
          DatasetFactory.updateDataset(set);
        }

      }, function errFn(variable) {
        var title = 'Error fetching variable ' + variable,
        message = 'Something went wrong while fetching samples with the given combination.',
        level = 'error';
        NotifyService.addTransient(title, message, level);
      }).finally( function() {
        WindowHandler.stopAllSpins();
      });
    };
  }
]);