var vis =
  angular.module('plotter.vis.sidebar', 
    ['plotter.vis.plotting', 'services.dataset', 
    'services.notify', 'services.dimensions', 'localytics.directives',
    'services.urlhandler']);

// directive for displaying the dataset table on sidebar
vis.directive('dataset', function () {
  return {
    restrict: 'C',
    templateUrl: 'vis/sidebar/dataset.tpl.html',
    replace: true,
    controller: 'DatasetTableController',
    link: function (scope, elm, attrs) {
      //console.log("Dataset table directive linker");
    }
  };
});

// dataset table controller
vis.controller('DatasetTableController', ['$scope', '$rootScope', 'DatasetFactory', 'DimensionService', 'NotifyService', 'constants', '$location', 'UrlHandler',
  function DatasetTableController($scope, $rootScope, DatasetFactory, DimensionService, NotifyService, constants, $location, UrlHandler) {
    $scope.sets = DatasetFactory.getSets();

    $scope.toggle = function(set) {
      set.toggle();

      UrlHandler.updateDataset();

      DatasetFactory.checkActiveVariables(set).then( function succFn(res) {

        if( res === 'enabled' || res === 'disabled' ) {
          // internally, this updates the dataset dimension 
          // filter to include only the active ones
          // Therefore, this is different from set.toggle() !!!
          DatasetFactory.toggle(set);

          // important!
          $rootScope.$emit('scatterplot.redraw', set, res);
          $rootScope.$emit('histogram.redraw', set, res);
          $rootScope.$emit('heatmap.redraw', set, res);
          dc.redrawAll(constants.groups.scatterplot);
          dc.redrawAll(constants.groups.heatmap);
        }
        else if( res === 'empty' ) {
          DatasetFactory.toggle(set);
        }

      }, function errFn(variable) {
        var title = 'Error fetching variable ' + variable,
        message = 'Something went wrong while fetching samples with the given combination.',
        level = 'danger';
        console.log(title,message,level);
        NotifyService.addTransient(title, message, level);
      });
    };
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
        PlotService.drawScatter({ variables: selection, pooled: selection.pooled});
      }, function errorFn(variable) {
        NotifyService.closeModal();

        var title = 'Variable ' + variable + ' could not be loaded\n',
        message = 'Please check the selected combination is valid for the selected datasets.',
        level = 'danger';
        NotifyService.addTransient(title, message, level);
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
          PlotService.drawHistogram({variables: selection, pooled: selection.pooled });
        },
        function errorFn(variable) {
          NotifyService.closeModal();

          var title = 'Variable ' + variable + ' could not be loaded\n',
          message = 'Please check the selected combination is valid for the selected datasets.',
          level = 'danger';
          NotifyService.addTransient(title, message, level);
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


// controller for the histogram form
vis.controller('HeatmapFormController', ['$scope', '$rootScope', 'DatasetFactory', '$injector', 'NotifyService', 'PlotService',
  function ($scope, $rootScope, DatasetFactory, $injector, NotifyService, PlotService) {
    $scope.variables = DatasetFactory.variables();
    $scope.selection = {};

    $scope.canEdit = function () {
      return DatasetFactory.activeSets().length > 0;
    };

    $scope.canSubmit = function () {
      return $scope.canEdit() && !_.isEmpty($scope.selection.x);
    };

    $scope.clear = function() {
      $scope.selection.x = [];
    };

    $scope.add = function (selection) {
      NotifyService.addSpinnerModal('Loading...');
      var plottingDataPromise = DatasetFactory.getVariableData(selection.x);

      plottingDataPromise.then(function (res) {
        // draw the figure
        NotifyService.closeModal();
        PlotService.drawHeatmap({variables: selection});
      }, function errorFn(variable) {
        NotifyService.closeModal();
        var title = 'Variable ' + variable + ' could not be loaded\n',
        message = 'Please check the selected combination is valid for the selected datasets.',
        level = 'danger';
        NotifyService.addTransient(title, message, level);
      });
    };
  }
]);

// directive for histogram form
vis.directive('heatmapForm', function () {
  return {
    restrict: 'C',
    scope: true,
    replace: true,
    controller: 'HeatmapFormController',
    templateUrl: 'vis/sidebar/heatmap.tpl.html',
    link: function (scope, elm, attrs) {

    }
  };
});