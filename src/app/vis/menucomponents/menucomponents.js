var vis =
  angular.module('plotter.vis.menucomponents', 
    [
    'plotter.vis.plotting',
    'services.dataset',
    'services.window',
    'services.notify', 
    'services.dimensions', 
    'localytics.directives',
    'services.urlhandler'
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
vis.controller('DatasetTableController', ['$scope', '$rootScope', 'DatasetFactory', 'DimensionService', 'NotifyService', 'constants', '$location', 'UrlHandler',
  function DatasetTableController($scope, $rootScope, DatasetFactory, DimensionService, NotifyService, constants, $location, UrlHandler) {

    $scope.datasets = DatasetFactory.getSets();

    $scope.toggle = function(set) {
      set.toggle();

      // UrlHandler.updateDataset();

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
        NotifyService.addTransient(title, message, level);
      }).finally( function() {
      });
    };
    console.log("dset ctrl", $scope.menuDatasets);
  }
]);



// scatter plot form
vis.directive('scatterplotForm', function () {
  return {
    restrict: 'C',
    scope: { handler: '=' },
    replace: true,
    controller: 'ScatterplotFormController',
    templateUrl: 'vis/menucomponents/scatterplot.tpl.html',
    link: function (scope, elm, attrs) {

    }
  };
});


// scatter plot form controller
vis.controller('ScatterplotFormController', ['$scope', '$rootScope', '$q', 'DatasetFactory', '$injector', 'NotifyService',
  function ($scope, $rootScope, $q, DatasetFactory, $injector, NotifyService) {
    $scope.selection = {};

    $scope.variables = DatasetFactory.variables();

    $scope.canEdit = function () {
      return DatasetFactory.activeSets().length > 0;
    };

    $scope.canSubmit = function () {
      return $scope.canEdit() && !_.isUndefined($scope.selection.x) && !_.isUndefined($scope.selection.y);
    };

    $scope.add = function (select) {
      var selection = angular.copy(select);

      var _callback = function() {
        var plottingDataPromise = DatasetFactory.getVariableData([selection.x, selection.y]);

        plottingDataPromise.then(function (res) {
          // draw the figure
          NotifyService.closeModal();
          var PlotService = $injector.get('PlotService');
          PlotService.drawScatter({ variables: selection, pooled: selection.pooled}, $scope.handler);
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
    scope: { handler: '=' },
    replace: true,
    controller: 'HistogramFormController',
    templateUrl: 'vis/menucomponents/histogram.tpl.html',
    link: function (scope, elm, attrs) {

    }
  };
});


// controller for the histogram form
vis.controller('HistogramFormController', ['$scope', '$rootScope', 'DatasetFactory', '$injector', 'NotifyService',
  function ($scope, $rootScope, DatasetFactory, $injector, NotifyService) {
    // $scope.handler comes when the directive is called in a template

    $scope.selection = {};

    $scope.variables = DatasetFactory.variables();   

    $scope.canEdit = function () {
      return DatasetFactory.activeSets().length > 0;
    };

    $scope.canSubmit = function () {
      return $scope.canEdit() && !_.isUndefined($scope.selection.x);
    };

    $scope.add = function (select) {

      var selection = angular.copy(select);

      var _callback = function() {
        var plottingDataPromise = DatasetFactory.getVariableData([selection.x]);
        plottingDataPromise.then(function successFn(res) {
            // draw the figure
            NotifyService.closeModal();
            var PlotService = $injector.get('PlotService');
            PlotService.drawHistogram({variables: selection, pooled: selection.pooled }, $scope.handler);
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
vis.controller('SOMFormController', 
  ['$scope', '$rootScope', 'DatasetFactory', '$injector', 'NotifyService', 'constants', '$timeout', 'UrlHandler',
  function ($scope, $rootScope, DatasetFactory, $injector, NotifyService, constants, $timeout, UrlHandler) {
    $scope.selection = {};

    $scope.canEdit = function () {
      return DatasetFactory.activeSets().length > 0;
    };

    $scope.canSubmit = function () {
      return $scope.canEdit() && !_.isEmpty($scope.selection.x) && ($scope.selection.x.length >= 3) && _.isEmpty( _.keys( $scope.SOMs ) );
    };

    $scope.close = function(catalogId, somId) {
      var planes = DatasetFactory.getPlaneBySOM(somId);
      _.each( planes, function(plane) {
        // var id = WindowService.getId('id', plane.id);
        // WindowService.remove(id);
      });
      // delete url entry for the menu
      UrlHandler.removeWindow('som', somId);
      delete $scope.SOMs[catalogId];
    };

    $scope.canSubmitPlane = function(som) {
      return som.state == 'ready' && !_.isUndefined(som.tinput);
    };

    $scope.addPlane = function(som) {

      var planeId = _.uniqueId('plane');

      $scope.SOMs[som.id].planes[planeId] = {
        state: 'loading',
        variable: som.tinput
      };

      NotifyService.addTransient('Plane computation started', 'Please be patient, as the computation may take several minutes.', 'info');
      DatasetFactory.getPlane(som).then( 
        function succFn(res) {

          delete $scope.SOMs[som.id].planes[planeId];
          // $scope.SOMs[som.id].state = 'ready';
          // $scope.SOMs[som.id].planes[res.id].state = 'ready';
          // angular.extend( $scope.SOMs[som.id].planes[res.id], {
          //   id: res.id,
          //   plane: res.plane
          // });

          NotifyService.addTransient('SOM plane ready', 'The submitted SOM plane computation is ready', 'success');
          var PlotService = $injector.get('PlotService');

          PlotService.drawSOM(res);

      }, function errFn(res) {
        NotifyService.addTransient('Plane computation failed', res, 'danger');
      });
    };


    // this signal is emitted when url path is extracted on page load, to
    // display the loaded som menu
    $rootScope.$on('sidebar:addSom', function(event, som) {
      var somObj = angular.extend({'state': 'ready', 'planes': {}}, som);
      somObj.som = som.id;
      somObj.datasets = _.map( som.datasets, function(name) { return DatasetFactory.getSet(name); } );
      $scope.SOMs[som.id] = somObj;
    });

    $scope.add = function (selection) {

      var id = _.uniqueId('som');

      $scope.SOMs[id] = {
        'id': id,
        'state': 'loading',
        'variables': angular.copy($scope.selection.x),
        'datasets':  DatasetFactory.activeSets(),
        'planes': {}
      };

      DatasetFactory.getSOM(selection.x).then( 
        function succFn(som) {
          $scope.SOMs[id].state = 'ready';
          angular.extend( $scope.SOMs[id], {
            som: som.id
          });

          UrlHandler.createWindow('som', som);
          NotifyService.addTransient('SOM computation ready', 'The submitted SOM computation is ready', 'success');
      }, function errFn(res) {
        NotifyService.addTransient('SOM computation failed', res, 'danger');
        delete $scope.SOMs[id];
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
    scope: { handler: '=' },
    replace: true,
    controller: 'SOMFormController',
    templateUrl: 'vis/menucomponents/som.tpl.html',
    link: function (scope, elm, attrs) {

    }
  };
});


// controller for the histogram form
vis.controller('HeatmapFormController', ['$scope', '$rootScope', 'DatasetFactory', '$injector', 'NotifyService', 'PlotService',
  function ($scope, $rootScope, DatasetFactory, $injector, NotifyService, PlotService) {
    // $scope.variables = DatasetFactory.variables();
    $scope.selection = {};

    $scope.variables = DatasetFactory.variables();

    $scope.canEdit = function () {
      return DatasetFactory.activeSets().length > 0;
    };

    $scope.canSubmit = function () {
      return $scope.canEdit() && !_.isEmpty($scope.selection.x);
    };

    $scope.clear = function() {
      $scope.selection.x = [];
    };

    $scope.add = function (select) {
      var selection = angular.copy(select);

      var _callback = function() {
        var plottingDataPromise = DatasetFactory.getVariableData(selection.x);
        plottingDataPromise.then(function (res) {
          // draw the figure
          NotifyService.closeModal();
          PlotService.drawHeatmap({variables: selection}, $scope.handler);
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
    scope: { handler: '=' },
    replace: true,
    controller: 'HeatmapFormController',
    templateUrl: 'vis/menucomponents/heatmap.tpl.html',
    link: function (scope, elm, attrs) {

    }
  };
});