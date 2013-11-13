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
 vis.controller( 'VisCtrl', function VisController( $scope ) {
 });


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

App.controller('HistogramController', function($scope, $http) {
});

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


vis.controller('DatasetController', ['$scope', 'DatasetService',
  function($scope, DatasetService)
  {

  DatasetService.load().then( function(response) {
    $scope.datasets = response.data;
  },
  function(response) {
    console.log(response);
  });

  $scope.toggleSelection = function( ind ) {
    if( (ind >= 0) && ( ind < $scope.datasets.length ) )
    {
      var dset = $scope.datasets[ind];
      if( typeof( dset['selected'] ) === "undefined" ) {
        dset['selected'] = true;
      }
      else {
        dset['selected'] = !dset['selected'];
      }
    } 
  };

  $scope.isActive = function(ind) {
    return $scope.datasets[ind]['selected'] === true;
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


vis.factory('DatasetService', ['$http', function($http) {

  // privates
  var config = {
    url : '/plotter/random_data.json'
  };

  var service = {};

  service.load = function() {
    return $http.get( config.url );
  };

  // service.count = function() { return datasets.length; };

  // service.getVariables = function() {
  //   if( datasets.length === 0 )
  //   {
  //     // no datasets -> no vars
  //     return [];
  //   }

  //   return _.keys( datasets[selectedSetInd] );
  // };

  // service.setActive = function( ind ) {
  //   selectedSetInd = ind || null;
  // };

  // service.get = function() {
  //   return datasets;
  // };

  return service;
}]);




// $scope.getVariables = function(setName) {
//   console.log("called");
//   if( typeof( $scope.datasets ) !== "undefined" )
//   {
//     var foundSet = _.filter( $scope.datasets, function(set) {
//       return set.name === setName;
//     });

//     if( foundSet == 'undefined' ) { 
//       console.log("Cannot find corresponding dataset");
//       return ["error"];
//     }

//     return _.keys( foundSet.samples );
//   }
//   else {
//     console.log("Datasets not loaded");
//     return ["error"];
//   }

// };