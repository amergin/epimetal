var vis = 
 angular.module( 'plotter.vis.sidebar', [ 'services.plotting', 'services.dataset', 'services.dimensions' ] );

// directive for displaying the dataset table on sidebar
  vis.directive('dataset', function() {
  return {
    restrict: 'C',
    templateUrl : 'vis/sidebar/dataset.tpl.html',
    replace: true,
    controller: 'DatasetTableController',
    scope: {},
    link: function(scope, elm, attrs) {
      console.log("Dataset table directive linker");
    }
  };
});

// dataset table controller
vis.controller('DatasetTableController', ['$scope', 'DatasetFactory',
  function DatasetTableController($scope, DatasetFactory)
  {
    $scope.sets  = DatasetFactory.getSets();
  }]);




// scatter plot form
 vis.directive('scatterplotForm', function() {
  return {
    restrict: 'C',
    scope: true,
    replace: true,
    controller: 'ScatterplotFormController',
    templateUrl : 'vis/sidebar/scatterplot.tpl.html',
    link: function(scope, elm, attrs) {

    }
  };
});


// scatter plot form controller
 vis.controller('ScatterplotFormController', ['$scope', '$rootScope', '$q', 'DatasetFactory', '$injector',
  function($scope, $rootScope, $q, DatasetFactory, $injector) {
    console.log("scatter");
    $scope.variables = DatasetFactory.variables();
    $scope.selection = {};

    $scope.canEdit = function() {
      return DatasetFactory.activeSets().length > 0;
    };

    $scope.canSubmit = function () {
      return $scope.canEdit() && !_.isUndefined( $scope.selection.x ) && !_.isUndefined( $scope.selection.y );
    };

    $scope.add = function(selection) {

      var plottingDataPromise = DatasetFactory.getVariableData(selection.x, selection.y);

      plottingDataPromise.then( function(res) {
        // get the dimension / grouping

        var DimensionService = $injector.get('DimensionService');
        // var dimAndGroup = DimensionService.getDimensionAndGroup(selection);

        // var VisService = $injector.get('VisService');

        // // draw the figure
        // VisService.drawScatter({ 
        //   dimension: dimAndGroup.dimension, 
        //   reducedGroup: dimAndGroup.group,
        //   varX: selection.x,
        //   varY: selection.y,
        //   pooled: ( $scope.pooled || false )
        // });

      });


    };

  }]);


 // directive for histogram form
 vis.directive('histogramForm', function() {
  return {
    restrict: 'C',
    scope: true,
    replace: true,
    controller: 'HistogramFormController',
    templateUrl : 'vis/sidebar/histogram.tpl.html',
    link: function(scope, elm, attrs) {

    }
  };
});
 

 // controller for the histogram form
 vis.controller('HistogramFormController', ['$scope', '$rootScope', 'DatasetFactory', '$injector',
  function($scope, $rootScope, DatasetFactory, $injector) {
    console.log("histo");

    $scope.variables = DatasetFactory.variables();
    $scope.selection = {};

    $scope.canEdit = function() {
      return DatasetFactory.activeSets().length > 0;
    };

    $scope.canSubmit = function () {
      return $scope.canEdit() && !_.isEmpty( $scope.selection );
    };

    $scope.add = function(selection) {

      var plottingDataPromise = DatasetFactory.getVariableData(selection.x);

      plottingDataPromise.then( function(res) {
        var PlotService = $injector.get('PlotService');

        // draw the figure
        PlotService.drawHistogram({ 
          varX: selection.x,
          pooled: ( $scope.pooled || false )
        });

      });

    };

  }]);

