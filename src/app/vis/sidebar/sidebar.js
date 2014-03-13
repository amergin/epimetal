var vis = 
 angular.module( 'plotter.vis.sidebar', [ 'services.dataset' ] );

// directive for displaying the dataset table on sidebar
  vis.directive('dataset', function() {
  return {
    restrict: 'C',
    templateUrl : 'vis/sidebar/dataset.tpl.html',

    replace: true,
    controller: 'DatasetTableController',
    link: function(scope, elm, attrs) {
      console.log("linker");
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
    transclude: true,
    replace: true,
    templateUrl : 'vis/sidebar/scatterplot.tpl.html',
    link: function(scope, elm, attrs) {

    }
  };
});


// scatter plot form controller
 vis.controller('ScatterplotFormController', ['$scope', '$rootScope', '$http', 'DatasetFactory', 
  function($scope, $rootScope, $http, DatasetFactory) {
    $scope.variables = DatasetFactory.variables();
    $scope.selection = {};

    $scope.canEdit = function() {
      return DatasetFactory.activeSets().length > 0;
    };

    $scope.canSubmit = function () {
      return $scope.canEdit() && !_.isUndefined( $scope.selection.x ) && !_.isUndefined( $scope.selection.y );
    };

    $scope.add = function(selection) {
      $rootScope.$emit('packery.add', selection, 'scatterplot');
    };

  }]);


 // directive for histogram form
 vis.directive('histogramForm', function() {
  return {
    restrict: 'C',
    transclude: true,
    replace: true,
    templateUrl : 'vis/sidebar/histogram.tpl.html',
    link: function(scope, elm, attrs) {

    }
  };
});
 

 // controller for the histogram form
 vis.controller('HistogramFormController', ['$scope', '$rootScope', 'DatasetFactory', 
  function($scope, $rootScope, DatasetFactory) {

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
      plottingDataPromise.then( function(data) {
        console.log(data);
        $rootScope.$emit('packery.add', selection, 'histogram');
      });

    };

  }]);

