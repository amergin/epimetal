var vis =
  angular.module('plotter.vis.sidebar', 
    ['plotter.vis.plotting', 'services.dataset', 
    'services.notify', 'services.dimensions', 'localytics.directives']);

// directive for displaying the dataset table on sidebar
vis.directive('dataset', function () {
  return {
    restrict: 'C',
    templateUrl: 'vis/sidebar/dataset.tpl.html',
    replace: true,
    //controller: 'DatasetTableController',
    link: function (scope, elm, attrs) {
      console.log("Dataset table directive linker");
    }
  };
});

// dataset table controller
vis.controller('DatasetTableController', ['$scope', '$rootScope', 'DatasetFactory', 'DimensionService', 'NotifyService',
  function DatasetTableController($scope, $rootScope, DatasetFactory, DimensionService, NotifyService) {
    $scope.sets = DatasetFactory.getSets();

    $scope.toggle = function(set) {
      set.toggle();
      DatasetFactory.checkActiveVariables(set).then( function succFn(res) {

        if( res === 'enabled' || res === 'disabled' ) {
          // internally, this updates the dataset dimension 
          // filter to include only the active ones
          // Therefore, this is different from set.toggle() !!!
          DatasetFactory.toggle(set);

          // important!
          dc.redrawAll();
          $rootScope.$emit('scatterplot.redraw', set, res);
          $rootScope.$emit('histogram.redraw', set, res);
        }
        else if( res === 'empty' ) {
          DatasetFactory.toggle(set);
        }

      }, function errFn(res) {
        NotifyService.addSticky(res, 'error');
      });
    };

    // clears all selections
    // $scope.clear = function() {

    //   _.each( $scope.sets, function(set) {
    //     set.disable();
    //     $rootScope.$emit('scatterplot.redraw', set, 'disabled');
    //   });
    //   DimensionService.updateDatasetDimension();
    // };
  }
]);



// scatter plot form
vis.directive('scatterplotForm', function () {
  return {
    restrict: 'C',
    scope: true,
    replace: true,
    controller: 'ScatterplotFormController',
    templateUrl: 'vis/sidebar/scatterplot.tpl.html',
    link: function (scope, elm, attrs) {

    }
  };
});


// scatter plot form controller
vis.controller('ScatterplotFormController', ['$scope', '$rootScope', '$q', 'DatasetFactory', '$injector', 'NotifyService',
  function ($scope, $rootScope, $q, DatasetFactory, $injector, NotifyService) {
    $scope.variables = DatasetFactory.variables();
    $scope.selection = {};

    $scope.canEdit = function () {
      return DatasetFactory.activeSets().length > 0;
    };

    $scope.canSubmit = function () {
      return $scope.canEdit() && !_.isUndefined($scope.selection.x) && !_.isUndefined($scope.selection.y);
    };

    $scope.add = function (selection) {

      NotifyService.addSpinnerModal('Loading...');
      var plottingDataPromise = DatasetFactory.getVariableData([selection.x, selection.y]);

      plottingDataPromise.then(function (res) {
        // draw the figure
        NotifyService.closeModal();
        var PlotService = $injector.get('PlotService');
        PlotService.drawScatter(selection);
      }, function errorFn(result) {
        NotifyService.closeModal();
        NotifyService.addTransient(result, 'error');
      });


    };

  }
]);


// directive for histogram form
vis.directive('histogramForm', function () {
  return {
    restrict: 'C',
    scope: true,
    replace: true,
    controller: 'HistogramFormController',
    templateUrl: 'vis/sidebar/histogram.tpl.html',
    link: function (scope, elm, attrs) {

    }
  };
});


// controller for the histogram form
vis.controller('HistogramFormController', ['$scope', '$rootScope', 'DatasetFactory', '$injector', 'NotifyService',
  function ($scope, $rootScope, DatasetFactory, $injector, NotifyService) {
    $scope.variables = DatasetFactory.variables();
    $scope.selection = {};

    $scope.canEdit = function () {
      return DatasetFactory.activeSets().length > 0;
    };

    $scope.canSubmit = function () {
      return $scope.canEdit() && !_.isEmpty($scope.selection);
    };

    $scope.add = function (selection) {

      NotifyService.addSpinnerModal('Loading...');
      var plottingDataPromise = DatasetFactory.getVariableData([selection.x]);
      plottingDataPromise.then(function successFn(res) {
          // draw the figure
          NotifyService.closeModal();
          var PlotService = $injector.get('PlotService');
          PlotService.drawHistogram(selection);
        },
        function errorFn(result) {
          NotifyService.closeModal();
          NotifyService.addTransient(result, 'error');
        });
    };

  }
]);

// controller for the histogram form
vis.controller('SOMFormController', ['$scope', '$rootScope', 'DatasetFactory', '$injector', 'NotifyService',
  function ($scope, $rootScope, DatasetFactory, $injector, NotifyService) {
    $scope.variables = DatasetFactory.variables();
    $scope.selection = {};

    $scope.canEdit = function () {
      return DatasetFactory.activeSets().length > 0;
    };

    $scope.canSubmit = function () {
      return $scope.canEdit() && !_.isEmpty($scope.selection);
    };

    $scope.add = function (selection) {
      // NotifyService.addSpinnerModal('Loading...');
      // var plottingDataPromise = DatasetFactory.getVariableData([selection.x]);
      // plottingDataPromise.then(function successFn(res) {
      //     // draw the figure
      //     NotifyService.closeModal();
      //     var PlotService = $injector.get('PlotService');
      //     PlotService.drawHistogram(selection);
      //   },
      //   function errorFn(result) {
      //     NotifyService.closeModal();
      //     NotifyService.addTransient(result, 'error');
      //   });
    };

  }
]);

// directive for histogram form
vis.directive('somForm', function () {
  return {
    restrict: 'C',
    scope: true,
    replace: true,
    controller: 'SOMFormController',
    templateUrl: 'vis/sidebar/som.tpl.html',
    link: function (scope, elm, attrs) {

    }
  };
});