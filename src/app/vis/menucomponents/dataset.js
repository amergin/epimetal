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
.controller('DatasetTableController', function DatasetTableController($scope, $log, DatasetFactory, NotifyService, WindowHandler, TabService, _) {

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
    function removeInactiveSeparatedHeatmaps(set) {
      var win = null,
      isSeparated = false,
      isHeatmap = false,
      isSameDataset = false,
      winToBeRemoved = null;
      _.each(WindowHandler.getVisible(), function(handler) {
        _.each(handler.get(), function(w) {
          win = w.object;
          isHeatmap = win.figure() == 'pl-heatmap';
          isSeparated = win.extra().separate === true;
          isSameDataset = win.extra().dataset == set;

          if(isHeatmap && isSeparated && isSameDataset) {
            winToBeRemoved = win;
          }
        });
      });

      if(winToBeRemoved) {
        $log.debug("Dataset ", set, " has become inactive -> removing its separated heatmap.");
        winToBeRemoved.remove();
      }
    }

    set.toggle();

    if (TabService.activeState().name == 'vis.som') {
      DatasetFactory.updateDataset(set);
      TabService.check({ origin: 'dataset' });
      $log.debug("Toggled: SOM -> not necessary to continue.");
      return;
    }
    else if (TabService.activeState().name == 'vis.explore') {
      if(!set.active()) {
        removeInactiveSeparatedHeatmaps(set);
      }
    }
    
    WindowHandler.spinAllVisible();

    DatasetFactory.checkActiveVariables(set).then( function succFn(action) {

        if( action === 'enabled' || action === 'disabled' ) {
          DatasetFactory.updateDataset(set);

          TabService.check({ origin: 'dataset' });

          // important!
          WindowHandler.reRenderVisible({ compute: true, dset: set, action: ("dataset:" + action) });
        }
        else if( action === 'empty' ) {
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