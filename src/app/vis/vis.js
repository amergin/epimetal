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
    DatasetService.fetch();
 }]);


 vis.controller('PackeryController', function($scope) {

  $scope.init = function(element) {
    console.log("init", element);
  };

  $scope.windows = {};
  $scope.windowRunningNumber = 0;

  // remove from grid
  $scope.remove = function(number) {
    delete $scope.windows['win_' + number];
  };

  // adds window to grid
  $scope.add = function() {
    console.log("add");

    // apply
    $scope.windows[ 'win_' +  (++$scope.windowRunningNumber) ] = 
    { number : $scope.windowRunningNumber };
    console.log("applied");

  };
});

 vis.directive('packery', function() {
  return {
    restrict: 'C',
    templateUrl : 'vis/packery.tpl.html',
    scope : {
      initAttributes : "@"
    },
    replace: true,
    controller: 'PackeryController',
    link: function(scope, elm, attrs) {

      scope.$watch('windows', function(newVals, oldVals, scope) {
        console.log("data change");

        newWins = _.keys(newVals).length;
        oldWins = _.keys(oldVals).length;
        if( newWins > oldWins ) { 
          // add
          scope.packery.bindDraggabillyEvents( 
            new Draggabilly( 
              document.getElementsByClassName('item')[ newWins - 1 ],
              // document.getElementsByClassName('packery')[0],
              //$('div[packery] .item').last()[0], 
              { handle : '.handle' } 
              ) 
            );
          window.packery = scope.packery;
        }

        // update in every case
        scope.packery.reloadItems();
        scope.packery.layout();

      }, true);

      console.log("postlink");
          // create a new empty grid system
          scope.packery = new Packery( elm[0], 
          { 
          // columnWidth: 220, 
          // gutter: 10,
          rowHeight: 420,
          gutter: '.gutter-sizer',
          itemSelector: '.item',
          columnWidth: '.grid-sizer'
          } );//scope.$eval( attrs.initAttributes ) );
}
};
});

App.controller('HistogramController', ['$scope', '$http', 'DatasetService', 
  function($scope, $http, DatasetService) {

    $scope.variables = DatasetService.variables;

    $scope.canEdit = function() {
      return $scope.variables.length > 0;
    };    
}]);

App.directive('histogram', function() {
  return {
    restrict: 'C',
    templateUrl : 'vis/histogram.tpl.html',
    // scope : {
    //   initAttributes : "@"
    // },
    replace: true,
    controller: 'HistogramController',
    link: function(scope, elm, attrs) {

    }
  };
});


App.controller('ScatterplotController', ['$scope', '$http', 'DatasetService', 
  function($scope, $http, DatasetService) {
    $scope.variables = DatasetService.variables;

    $scope.canEdit = function() {
      return $scope.variables.length > 0;
    };
}]);

App.directive('scatterplot', function() {
  return {
    restrict: 'C',
    templateUrl : 'vis/scatterplot.tpl.html',
    replace: true,
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


}]);


vis.directive('dataset', function() {
  return {
    restrict: 'C',
    templateUrl : 'vis/dataset.tpl.html',
    // scope : {
    //   initAttributes : "@"
    // },
    replace: true,
    controller: 'DatasetController',
    link: function(scope, elm, attrs) {

    }
  };
});


vis.factory('DatasetService', ['$http', '$rootScope', function($http, $rootScope) {

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

      // $rootScope.$broadcast(config.broadcast, datasets);

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
    _.each( datasets, function(set, ind) {
      if( set.active ) {
        vars.push( { name: set.name, vars: _.keys(set.samples[0]) } );
      }
    });
    angular.copy(vars,variables);
  };

  service.variables = variables;

  return service;
}]);