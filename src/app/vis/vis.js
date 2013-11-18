/**
 * Each section of the site has its own module. It probably also has
 * submodules, though this boilerplate is too simple to demonstrate it. Within
 * `src/app/home`, however, could exist several additional folders representing
 * additional modules that would then be listed as dependencies of this one.
 * For example, a `note` section could have the submodules `note.create`,
 * `note.delete`, `note.edit`, etc.
 *
 * Regardless, so long as dependencies are managed correctly, the build process
 * will automatically take take of the rest.
 *
 * The dependencies block here is also where component dependencies should be
 * specified, as shown below.
 */

 var vis = 
 angular.module( 'plotter.vis', [
  'ui.state'
  ]);

/**
 * Each section or module of the site can also have its own routes. AngularJS
 * will handle ensuring they are all available at run-time, but splitting it
 * this way makes each module more "self-contained".
 */
 vis.config(function config( $stateProvider ) {

  var visState = {
    name: 'vis',
    url: '/vis',
    abstract: false,
    controller: 'VisCtrl',
    templateUrl: 'vis/vis.tpl.html',
    data: { pageTitle: 'Visualization' }
  };

  $stateProvider.state(visState);



  // $stateProvider.state( 'vis', {
  //   url: '/vis',
  //   views: {
  //     "main": {
  //       controller: 'VisCtrl',
  //       templateUrl: 'vis/vis.tpl.html'
  //     }
  //   },
  //   data:{ pageTitle: 'Visualization' }
  // });
});


/**
 * And of course we define a controller for our route.
 */
 vis.controller( 'VisCtrl', ['$scope','DatasetService', 
  function VisController( $scope, DatasetService) {

    // load datasets
    DatasetService.fetch();
  }]);


 vis.controller('HistogramController', ['$scope', '$rootScope', 'DatasetService', 
  function($scope, $rootScope, DatasetService) {

    $scope.variables = DatasetService.variables;
    $scope.selection = {};

    $scope.canEdit = function() {
      return $scope.variables.length > 0;
    };

    $scope.canSubmit = function() {
      return !_.isEmpty( $scope.selection );
    };

    $scope.getSets = function() {
      return $scope.datasets;
    };

    $scope.add = function(selection) {
      $rootScope.$emit('packery.add', selection, 'histogram');
    };

  }]);

 vis.directive('histogram', function() {
  return {
    restrict: 'C',
    transclude: true,
    replace: true,
    templateUrl : 'vis/histogram.tpl.html',
    link: function(scope, elm, attrs) {

    }
  };
});


 vis.controller('ScatterplotController', ['$scope', '$rootScope', '$http', 'DatasetService', 
  function($scope, $rootScope, $http, DatasetService) {
    $scope.variables = DatasetService.variables;
    $scope.selection = {};

    $scope.canEdit = function() {
      return $scope.variables.length > 0;
    };

    $scope.add = function(vars) {
      $rootScope.$emit('packery.add', vars);
    };

    $scope.add = function(selection) {
      $rootScope.$emit('packery.add', selection, 'scatterplot');
    };

    $scope.canSubmit = function() {
      return ( $scope.selection.x !== undefined ) && ( $scope.selection.y !== undefined );
    };    

  }]);

 vis.directive('scatterplot', function() {
  return {
    restrict: 'C',
    transclude: true,
    replace: true,
    templateUrl : 'vis/scatterplot.tpl.html',
    controller: 'ScatterplotController',
    link: function(scope, elm, attrs) {

    }
  };
});



 vis.controller('DatasetController', ['$scope', 'DatasetService',
  function($scope, DatasetService)
  {

    $scope.datasets = DatasetService.datasets;

    $scope.isActive = function(ind) {
      return $scope.datasets[ind].active;
    };

    $scope.toggle = function(ind) {
      return DatasetService.toggle(ind);
    };

    $scope.getBgColor = function(index) {
      var hue = 360 * ( index / DatasetService.datasets.length );
      var saturation = 1;
      var lightness = 0.65;
      return d3.hsl( hue, saturation, lightness ).toString();
    };

  }]);


 vis.directive('dataset', function() {
  return {
    restrict: 'C',
    templateUrl : 'vis/dataset.tpl.html',

    replace: true,
    controller: 'DatasetController',
    link: function(scope, elm, attrs) {

    }
  };
});


 vis.factory('DatasetService', ['$http', '$rootScope', function($http) {

  // privates
  var config = {
    url : '/plotter/random_data.json',
    broadcast: 'DATASET_UPDATE'
  };
  var datasets = [];
  var variables = [];

  var service = {};

  // load datasets
  service.fetch = function() {
    var promise = $http.get( config.url ).then( function(response) {

      var res = response.data;
      console.log("Load Datasets",res);

      _.each( res, function( value, key, res ) {
        _.extend( value, {active: false} );
      });

      angular.copy(res, datasets);

      // return value is picked up on the controller from promise
      return datasets;
    });

    return promise;
  };

  service.datasets = datasets;

  service.isActive = function(ind) {
    return datasets[ind].active;
  };

  service.toggle = function(ind) {
    datasets[ind].active = !datasets[ind].active;

    // update available variables
    var vars = [];

    // create structure suitable for ng-options (flat list)
    _.each( datasets, function(set,ind) {
      if(set.active) {
        vars = _.map( _.keys( set.samples[0] ), function(ele) {
          return { set: set.name, variable: ele };
        }).concat(vars);
      }
    });
    // this will trigger the change
    angular.copy(vars,variables);
  };

  service.variables = variables;

  return service;
}]);




vis.controller('PackeryController', ['$scope', '$rootScope', '$timeout', function($scope,$rootScope, $timeout) {

  $scope.$onRootScope('packery.add', function(event,selection,type) {
    $scope.add( selection,type );
  });

  $scope.windows = [];
  $scope.windowRunningNumber = 0;

  // remove from grid
  $scope.remove = function(number, element) {
    // console.log("remove window ", number, ", array size=", $scope.windows.length);
    $scope.windows = _.reject( $scope.windows, function(obj) { 
      return obj.number === number; 
    });
    // $scope.windows.splice(number,1);
    $scope.packery.remove( element );
    $scope.packery.layout();
  };

  // adds window to grid
  $scope.add = function(selection, type) {
    console.log("add",selection, type);
    $scope.windows.push({ number : (++$scope.windowRunningNumber),
      type: type, variables: selection });
  };

}]);

vis.directive('packery', function() {
  return {
    restrict: 'C',
    templateUrl : 'vis/packery.tpl.html',
    replace: true,
    controller: 'PackeryController',
    scope: true,
    link: function(scope, elm, attrs, controller) {


      console.log("postlink");
          // create a new empty grid system
          scope.packery = new Packery( elm[0], 
          { 
          // columnWidth: 220, 
          // gutter: 10,
          // see https://github.com/metafizzy/packery/issues/7
          rowHeight: 420,
          itemSelector: '.window',
          gutter: '.gutter-sizer',
          columnWidth: '.grid-sizer'
        } );

          window.packery = scope.packery;
        }
      };
    });


vis.directive('window', [function(){
  return {
    scope: false,
    require: '^packery',
    restrict: 'C',
    templateUrl : 'vis/window.tpl.html',
    replace: true,
    transclude: true,
    link: function($scope, ele, iAttrs, controller) {
      console.log('window linker');
      $scope.element = ele;
      $scope.packery.bindDraggabillyEvents( 
        new Draggabilly( $scope.element[0], { handle : '.handle' } ) 
        );
      $scope.packery.reloadItems();      
      $scope.packery.layout();
    }
  };
}]);
