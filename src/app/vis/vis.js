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
 angular.module( 'plotter.vis', [ 'ui.state' ]);

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


 vis.controller('HistogramFormController', ['$scope', '$rootScope', 'DatasetService', 
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

 vis.directive('histogramForm', function() {
  return {
    restrict: 'C',
    transclude: true,
    replace: true,
    templateUrl : 'vis/histogram.tpl.html',
    link: function(scope, elm, attrs) {

    }
  };
});


 vis.controller('ScatterplotFormController', ['$scope', '$rootScope', '$http', 'DatasetService', 
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

 vis.directive('scatterplotForm', function() {
  return {
    restrict: 'C',
    transclude: true,
    replace: true,
    templateUrl : 'vis/scatterplot.tpl.html',
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
    url : '/plotter/random_data.json'
    //'/plotter/random_data_samplenames.json'
  };
  var datasets = [];
  var variables = [];

  var service = {};

  // load datasets
  service.fetch = function() {
    var promise = $http.get( config.url ).then( function(response) {

      var res = response.data;
      console.log("Load Datasets",res);

      // for each dataset
      _.each( res, function( value, key, res ) {

        // find out keys of every sample
        var keys = _.keys( value.samples[0] );

        // modify each variable to contain numeric results, not strings
        _.each( value.samples, function(obj,ind) {

          _.each( keys, function(k) {
            // to number if possible
            value.samples[ind][k] = +obj[k];
          });

        });

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

  service.getActives = function(setNames) {
    if( !_.isArray(setNames) ) {
      throw new Error("invalid parameters");
    }

    var results = _.filter( datasets, function(set) {
      return _.contains( setNames, set.name ) && set.active;
    });

    return results;
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

    // pass signal to dc plotter
    $rootScope.$emit('dc.add', selection, type);

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


vis.directive('window', ['$compile', function($compile){
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

      // create window and let Packery know
      $scope.packery.bindDraggabillyEvents( 
        new Draggabilly( $scope.element[0], { handle : '.handle' } ) 
        );
      $scope.packery.reloadItems();      
      $scope.packery.layout();

      // append a new suitable div to execute its directive
      var elName = '';
      if( $scope.window.type === 'histogram' ) {
        elName = 'histogram';
      }
      else if( $scope.window.type === 'scatterplot' ) {
        elName = 'scatterplot';
      }
      else {
        throw new Error("unknown plot type");
      }

      var newEl = angular.element(
        '<div class="' + elName + '"' + 
        ' id="window' + $scope.window.number + '"></div>');
      $scope.element.append( newEl );
      $compile( newEl )($scope);
    }
  };
}]);


vis.controller('HistogramPlotController', ['$scope', '$rootScope', 'DatasetService', 
  function($scope, $rootScope, DatasetService) {
    $scope.data = DatasetService.getActives( [$scope.window.variables.x.set] )[0];

    $scope.resetFilter = function() {
      $scope.histogram.filterAll();
      dc.redrawAll();
    };

  }]);

vis.directive('histogram', [ function(){

  var createSVG = function( scope, element, data, variable ) {
    // check css window rules before touching these
    scope.width = 470;
    scope.height = 345;

    scope.histogram = dc.barChart( element[0] );
    scope.crossData = crossfilter(data.samples);

    scope.varDimension = scope.crossData.dimension( function(d) {
      return d[variable];
    });

    scope.varGroup = scope.varDimension.group().reduceCount( function(d) {
      return d[variable];
    });

    var minAndMax = d3.extent( data.samples, function(d) { return d[variable]; } );

    scope.histogram
    .renderTitle(true)
    .brushOn(true)
    .width( scope.width )
    .height( scope.height )
    .margins({ top: 10, right: 10, bottom: 20, left: 40 })
    .dimension(scope.varDimension)
    .group(scope.varGroup)
    .transitionDuration(500)
    .centerBar(true)
    .gap(2)
    .x( d3.scale.linear().domain( minAndMax ) )
    .elasticY(true)
    .xAxis().tickFormat();

    scope.histogram.render();


    // // calculate bin information
    // var numBins = Math.ceil( Math.sqrt( data.samples.length ) );
    // // var maxVal = _.max( data.samples, function(d) { return d[variable] } );
    // // var minVal = _.min( data.samples, function(d) { return d[variable] } );
    // var maxAndMin = d3.extent(data.samples, function(d) { return d[variable]; });
    // var binWidth = ( maxAndMin[0] - maxAndMin[1] ) / numBins;


    // scope.ordinalBarChart = dc.barChart( element[0]  );
    // var ndx = crossfilter(data.samples);
    // var varDimension = ndx.dimension( function(d) {
    //   return +d[variable];
    // });
    // var varGroup = varDimension.group( function(d) {
    //   return Math.floor( d / binWidth ) * binWidth;
    // });

    // scope.ordinalBarChart
    // .width(scope.width)
    // .height(scope.height)
    // .dimension(varDimension)
    // .round(Math.floor)
    // .group(varGroup)
    // .elasticY(true)
    // .x( d3.scale.linear().domain(maxAndMin).range([0,numBins]) )
    // .xUnits(dc.units.linear)
    // .xAxis();
    // //.x(d3.scale.ordinal().domain( varGroup.all() ) )

    // scope.ordinalBarChart.render();

  };

  var linkFn = function($scope, ele, iAttrs) {
    createSVG( $scope, ele, $scope.data, $scope.window.variables.x.variable );
  };

  return {
    scope: false,
    // scope: {},
    restrict: 'C',
    require: '^?window',
    replace: true,
    controller: 'HistogramPlotController',
    transclude: true,
    link: linkFn
  };
}]);





vis.controller('ScatterPlotController', ['$scope', '$rootScope', 'DatasetService', 
  function($scope, $rootScope, DatasetService) {
    console.log("scope:",$scope);

    var sets = DatasetService.getActives( [$scope.window.variables.x.set, $scope.window.variables.y.set] );

    var joinedSamples = function( dataX, dataY ) {
      var joined = [];

      // same dset for x-y
      if( _.isUndefined( dataY ) ) {
        _.each( dataX.samples, function(ele,ind) {
          joined.push( { x: ele, y: ele } );
        });        
      }
      else if( ( dataX.length < dataY.length ) ) {
        _.each( dataX.samples, function(ele,ind) {
          // join only using the shortest array, rest won't pair
          joined.push( { x: ele, y: dataY.samples[ind] } );
        });
      }
      else {
        _.each( dataY.samples, function(ele,ind) {
          // join only using the shortest array, rest won't pair
          joined.push( { y: ele, x: dataX.samples[ind] } );
        });
      }

      return joined;
    };

    $scope.data = joinedSamples( sets[0], sets[1] );


    $scope.resetFilter = function() {
      $scope.scatterplot.filterAll();
      dc.redrawAll();
    };

  }]);




vis.directive('scatterplot', [ function(){

  var createSVG = function( scope, element, data, variableX, variableY ) {
    // check css window rules before touching these
    scope.width = 470;
    scope.height = 345;

    // data = [ { x: 5, y: 10 }, { x: 15, y: 15 }, { x: 40, y: 5 }, { x: 50, y: 2 } ];

    scope.scatterplot = dc.scatterPlot( element[0] );
    scope.crossData = crossfilter( data );

    scope.varDimension = scope.crossData.dimension( function(d) {
      return [ d.x[variableX], d.y[variableY] ];
    });

    scope.varGroup = scope.varDimension.group();

    var xExtent = d3.extent( data, function(d) { return d.x[variableX]; } );

    scope.scatterplot
    // .title( function(d) {
    //   return variableX + ": " + d.x + "\n" + variableY + ": " + d.y;
    // })
    // .renderTitle(true)
    .width( scope.width )
    .height( scope.height )
    .symbol( d3.svg.symbol().type('circle') )
    .symbolSize(5)
    .highlightedSize(7)
    .brushOn(true)
    .x(d3.scale.linear().domain( xExtent ) )
    .yAxisLabel( variableY )
    .xAxisLabel( variableX )
    .dimension( scope.varDimension )
    .group( scope.varGroup );

    scope.scatterplot.render();

  };

  var linkFn = function($scope, ele, iAttrs) {
    createSVG( $scope, ele, $scope.data, 
      $scope.window.variables.x.variable, $scope.window.variables.y.variable );
  };

  return {
    scope: false,
    // scope: {},
    restrict: 'C',
    require: '^?window',
    replace: true,
    controller: 'ScatterPlotController',
    transclude: true,
    link: linkFn
  };
}]);
