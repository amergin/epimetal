angular.module('plotter.vis.menucomponents.dataset', 
  [
  'ext.lodash'
  ])

// directive for displaying the dataset table on sidebar
.directive('plDatasetForm', function () {
  return {
    scope: {},
    restrict: 'A',
    templateUrl: 'vis/menucomponents/dataset.tpl.html',
    replace: true,
    controller: 'DatasetTableController'
  };
})

// dataset table controller
.controller('DatasetTableController', function DatasetTableController($scope, DatasetFactory, NotifyService, WindowHandler, TabService, _) {

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
});