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
      }).finally( function() {
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

      var _callback = function() {
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

      NotifyService.addSpinnerModal('Loading...', _callback);

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
      return $scope.canEdit() && !_.isUndefined($scope.selection.x);
    };

    $scope.add = function (selection) {

      var _callback = function() {
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

      NotifyService.addSpinnerModal('Loading...', _callback);
    };

  }
]);

// controller for the histogram form
vis.controller('SOMFormController', ['$scope', '$rootScope', 'DatasetFactory', '$injector', 'NotifyService', 'constants', '$timeout',
  function ($scope, $rootScope, DatasetFactory, $injector, NotifyService, constants, $timeout) {
    $scope.variables = DatasetFactory.variables();
    $scope.selection = {};

    $scope.canEdit = function () {
      return DatasetFactory.activeSets().length > 0;
    };

    $scope.canSubmit = function () {
      return $scope.canEdit() && !_.isEmpty($scope.selection.x);
    };

    $scope.close = function(somId) {
      delete $scope.SOMs[somId];
    };

    $scope.canSubmitPlane = function(som) {
      return som.state == 'ready' && !_.isUndefined(som.tinput);
    };

    $scope.addPlane = function(som) {

      NotifyService.addTransient('Plane computation started', 'Please be patient, as the computation may take several minutes.', 'info');
      DatasetFactory.getPlane(som).then( 
        function succFn(res) {
          console.log("success", som);

          $scope.SOMs[som.id].state = 'ready';
          $scope.SOMs[som.id].planes[res.id] = {
            id: res.id,
            plane: res.plane
          };
          NotifyService.addTransient('SOM plane ready', 'The submitted SOM plane computation is ready', 'success');
          var PlotService = $injector.get('PlotService');
          PlotService.drawSOM(res);

      }, function errFn(res) {
        NotifyService.addTransient('Plane computation failed', res, 'danger');
        console.log("som failed", res);
      });

    };

    $scope.add = function (selection) {

      var id = _.uniqueId('som');

      $scope.SOMs[id] = {
        'id': id,
        'state': 'loading',
        'variables': angular.copy($scope.selection.x),
        'datasets':  _.map( DatasetFactory.activeSets(),function(set) { return set.getName(); } ),
        'planes': {}
      };

      DatasetFactory.getSOM(selection.x).then( 
        function succFn(som) {
          console.log("success", som);

          $scope.SOMs[id].state = 'ready';
          angular.extend( $scope.SOMs[id], {
            som: som.id
          });
          NotifyService.addTransient('SOM computation ready', 'The submitted SOM computation is ready', 'success');
      }, function errFn(res) {
        NotifyService.addTransient('SOM computation failed', res, 'danger');
        console.log("som failed", res);
      });

    };

    $scope.clear = function() {
      $scope.selection.x = [];
    };

    $scope.SOMs = {};

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

      var _callback = function() {
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

      NotifyService.addSpinnerModal('Loading...', _callback);

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