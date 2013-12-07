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
    //DatasetService.fetch();
  }]);


 vis.controller('HistogramFormController', ['$scope', '$rootScope', 'DatasetService', 
  function($scope, $rootScope, DatasetService) {

    $scope.variables = DatasetService.variables;
    $scope.selection = {};

    $scope.canEdit = function() {
      return DatasetService.anyActiveSets();
    };

    $scope.canSubmit = function() {
      return $scope.canEdit() && !_.isEmpty( $scope.selection );
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
      return DatasetService.anyActiveSets();
    };

    $scope.add = function(selection) {
      $rootScope.$emit('packery.add', selection, 'scatterplot');
    };

    $scope.canSubmit = function() {
      return $scope.canEdit() && !_.isUndefined( $scope.selection.x ) && !_.isUndefined( $scope.selection.y );
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

    $scope.sets = DatasetService.loadDatasets();
    $scope.datasets = [];

    $scope.sets.then( function(result) {
      angular.copy(result, $scope.datasets);
      console.log($scope.datasets);
    });

    $scope.isActive = function(ind) {
      return $scope.datasets[ind].active;
    };

    $scope.toggle = function(ind) {
      DatasetService.toggle(ind);

      // redraw all plots so they notice the changed sample
      // selections
      dc.redrawAll();
    };

    $scope.getBgColor = function(index) {
      return $scope.datasets[index].color;
    };

    $scope.getVariables = function() {
      return DatasetService.getVariables();
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


 vis.factory('DatasetService', 
  ['$http', '$rootScope', '$q', function($http, $rootScope, $q) {

  // privates
  var config = {
    url : '../plotter_sampledata.tsv'
    //'/plotter/random_data.json'
    //'/plotter/random_data_samplenames.json'
  };

  // raw samples
  var samples = [];

  // datasets for navigation
  var datasets = [];

  // active, selectable variables
  var variables = [];

  // dimensions and crossfilter data
  var crossData = null;
  var dimensions = {};

  // Privates end
  // --------------------------------------


  // the service to be returned from factory
  var service = {};

  var getInitDatasets = function() {

    var getBgColor = function(index, length) {
      var hue = 360 * ( index / length );
      var saturation = 1;
      var lightness = 0.65;
      return d3.hsl( hue, saturation, lightness ).toString();
    };    

    var setGroup = dimensions['datasets'].group().top(Infinity);
    var sets = _.map( setGroup, 
      function(ele,ind) { 
        return { 
          name: ele.key,
          sampleCount: ele.value,
          active: false,
          color: getBgColor(ind, setGroup.length) }; 
        } );

    sets = _.sortBy( sets, function(e) { return e.name; } );
    return sets;
  };

  var initCrossfilter = function() {
    // add all samples
    crossData = crossfilter(samples);

    // create dataset dimension
    dimensions['datasets'] = crossData.dimension( function(s) { return s.dataset; } );
  };

  var initVariables = function() {
    var keys = _.keys( samples[0].variables );
    keys.sort();
    
    // trigger change
    angular.copy( keys, variables );
  };


  // load and init datasets when this is called
  service.loadDatasets = function() {
      console.log("Load Datasets");

      var deferred = $q.defer();

      // load raw sample data
      d3.tsv( config.url, function(error, resData) {
        resData.forEach( function(s) {
          var sample = {};
          sample.dataset = s.dataset;
          sample.sampleid = s.sampleid;
          sample.variables = _.omit( s, ['dataset', 'sampleid'] );

          // each variable to number or NaN
          _.each( sample.variables, function(ele, key) {
            sample.variables[key] = +ele;
          });
          samples.push(sample);
  
        });

        // init structures
        initCrossfilter();
        var dsets = getInitDatasets();
        initVariables();
        datasets = dsets;
        $rootScope.$apply( function() {
          console.log("...Datasets loaded");
          deferred.resolve(dsets);
        });

      });

      return deferred.promise;
    };

  service.samples = samples;

  service.getColor = function(name) {
    return _.filter( datasets, function(set) { return set.name === name; } )[0]['color'];
  };

  service.getColors = function() {
      var obj = {
        colors: _.pluck( datasets, 'color')
      };
      obj.indices = {};
      _.each( datasets, function(set,ind) { obj.indices[set.name] = ind;  } );
      return obj;
  };

  service.isActive = function(ind) {
    return datasets[ind].active;
  };

  // what variables can be selected from any dataset?
  service.getVariables = function() {
    return variables;
  };

  // are there currently any active sets?
  service.anyActiveSets = function() {
    return _.any( datasets, function(set) { return set.active; } );
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

  service.getActiveDatasetNames = function() { 
    return _.pluck( _.filter( datasets, function(set) { return set.active; } ), 'name' );
    //_.pluck( datasets, 'name' );
  };

  service.getDatasetNames = function() { 
    return _.pluck( datasets, 'name' );
  };

  // create a crossfilter dimension. Takes one or two arguments
  service.getDimension = function(variable) {

    var legalInput = function(vari) {
      if( variable === 'datasets') {
        return;
      }
      if( !_.contains(variables, vari) || _.isUndefined( vari ) ) {
        throw new Error("Undefined variable tried");
      }
    };

    _.each( arguments, function(arg) {
      legalInput(arg);
    });

    var dim;

    // x,y variables asked, for scatterplot
    if( arguments.length === 2 ) {

      var varX = arguments[0];
      var varY = arguments[1];
      var varComb = varX + "|" + varY;

      // dimension does not exist, create one
      if( _.isUndefined( dimensions[varComb] ) ) {
         dim = crossData.dimension( function(d) { return [ d.variables[varX], d.variables[varY] ]; } );
         dimensions[varComb] = dim;
      }
      else {
        // already defined earlier
        dim = dimensions[varComb];
      }      
    }

    // one variable
    else {
      // dimension does not exist, create one
      if( _.isUndefined( dimensions[variable] ) ) {
         dim = crossData.dimension( function(d) { return d.variables[variable]; } );
         dimensions[variable] = dim;
      }
      else {
        // already defined earlier
        dim = dimensions[variable];
      }
    }
    return dim;
  };

  // form a grouping using a custom reduce function
  service.getReduce = function(dimensionGroup, variable) {

    var reduceAdd = function(p,v) {
      p.counts[v.dataset] = p.counts[v.dataset] + 1;
      p.sums[v.dataset] = p.sums[v.dataset] + v.variables[variable];
      p.dataset = v.dataset;
      p.sampleid = v.sampleid;
      return p;
    };

    var reduceRemove = function(p,v) {
      p.counts[v.dataset] = p.counts[v.dataset] - 1;
      p.sums[v.dataset] = p.sums[v.dataset] - v.variables[variable];
      p.dataset = v.dataset;
      p.sampleid = v.sampleid;
      return p;
    };

    var reduceInitial = function() {
      var setNames = service.getDatasetNames();
      var p = {
        sums: {},
        counts: {}
      };

      _.each( setNames, function(name) {
        p.sums[name] = 0;
        p.counts[name] = 0;
      });
      return p;
    };

    return dimensionGroup.reduce( reduceAdd, reduceRemove, reduceInitial );
  };

  // toggle whether the dataset, determined by index, is active
  service.toggle = function(ind) {
    datasets[ind].active = !datasets[ind].active;

    var activeNames = _.filter( datasets, function(d) { return d.active; } );
    // update crossfilter to know about the (de)selection
    dimensions.datasets.filterFunction( function(dsetName) {
      return _.any( activeNames, function(d) { return d.name === dsetName; } );
    });
  };

  // returns the amount of samples in a dataset
  service.sampleCount = function(ind) {
    return datasets[ind].sampleCount;
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

    // always form a copy so that the form selection is not updated via reference here.
    var selectionCopy = {};
    angular.copy(selection, selectionCopy);

    $scope.windows.push({ number : (++$scope.windowRunningNumber),
      type: type, variables: selectionCopy });
  };

}]);

vis.directive('packery', function() {
  return {
    restrict: 'C',
    templateUrl : 'vis/packery.tpl.html',
    replace: true,
    controller: 'PackeryController',
    scope: {},
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
    // transclude: true,
    link: function($scope, ele, iAttrs, controller) {
      console.log('window linker');
      $scope.element = ele;

      // create window and let Packery know
      $scope.$parent.packery.bindDraggabillyEvents( 
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

    //$scope.data = DatasetService.getActives( [$scope.window.variables.x.set] )[0];
    $scope.dimension = DatasetService.getDimension( $scope.window.variables.x );
    $scope.dsetDimension = DatasetService.getDimension( 'datasets' );

    $scope.noBins = 20;
    $scope.extent = d3.extent( $scope.dimension.group().all(), function(sample) { return sample.key; } );    
    $scope.binWidth = ($scope.extent[1] - $scope.extent[0]) / $scope.noBins;
    $scope.group = $scope.dimension.group(function(d){return Math.floor(d / $scope.binWidth) * $scope.binWidth;});
    $scope.reduced = DatasetService.getReduce( $scope.group, $scope.window.variables.x );
    $scope.activeNames = DatasetService.getDatasetNames();
    $scope.color = DatasetService.getColor;
    $scope.colorMap = DatasetService.getColors();


    //$scope.testi = DatasetService.samples;//.slice(0,5);
    $scope.resetFilter = function() {
      $scope.histogram.filterAll();
      dc.redrawAll();
    };

  }]);

vis.directive('histogram', [ function(){

  var createSVG = function( scope, element, dimension, reducedGroup, variable, noBins, extent, binWidth, colorMap ) {
    // check css window rules before touching these
    scope.width = 470;
    scope.height = 345;
    scope.xBarWidth = 80;

    scope.histogram = dc.barChart( element[0] );


    // only for testing purposes!!
    // var cross = crossfilter(scope.testi);
    // var dim = cross.dimension( function(d) { return d.variables['Ala']; } ); // [ d.variables['Ala'], d.variables['Alb'] ]; } );
    // var group = dim.group().reduceCount();
    // var extent = d3.extent( dim.group().all(), function(d) { return d.key; } );


  // see http://stackoverflow.com/questions/15191258/properly-display-bin-width-in-barchart-using-dc-js-and-crossfilter-js
  // var n_bins = 20;
  // var binWidth = (xMinAndMax[1] - xMinAndMax[0]) / n_bins;
  // var grp = dimension.group(function(d){return Math.floor(d / binWidth) * binWidth;});

  scope.histogram
      .width(scope.width)
      .height(scope.height)
      .xUnits( function() { return 30; } )
      .margins({top: 15, right: 10, bottom: 20, left: 40})
      .dimension(dimension);


      // .group(reducedGroup, 'DATASET1')
      // .valueAccessor( function(d) {
      //   return d.value.counts['DATASET1'] || 0;
      // })
      // .keyAccessor( function(d) {
      //   return d.key;
      // });
      // .stack( reducedGroup, 'DATASET2', function(d) {
      //   return d.value.counts['DATASET2'] || 0;
      // })
      // .stack( reducedGroup, 'DATASET3', function(d) {
      //   return d.value.counts['DATASET3'] || 0;
      // });


      // .colors(colorMap.colors)
      // .colorAccessor( function(d,i) {
      //   return colorMap.indices[d.value.dataset];
      // })
      // .group(reducedGroup)
      // .valueAccessor( function(d) {
      //   return d.value.counts[name];
      // });

      _.each( scope.activeNames, function(name,ind) {
        if( ind === 0 )
        {
          scope.histogram
          .group(reducedGroup, name)
          .valueAccessor( function(d) {
            if( _.isUndefined( d.value.dataset ) ) {
              return 0;
            }
            return d.value.counts[name];
          });
        }
        else {
          scope.histogram
          .stack( reducedGroup, name, function(d) {
            if( _.isUndefined( d.value.dataset ) ) {
              return 0;
            }
            return d.value.counts[name];
          });
        }
      });


      scope.histogram.round(Math.floor)
      .centerBar(false)
      .x(d3.scale.linear().domain(extent).range([0,noBins]))
      .elasticY(true)
      .brushOn(true)      
      .xAxis().ticks(7).tickFormat( d3.format(".2s") );







      // .group(scope.group)
      // .valueAccessor( function(d) {
      //   console.log(d);
      //   return d.value;
      // })

    // scope.varGroup = dimension.group().reduceCount( function(d) {
    //   return d[variable];
    // });
    // without dividing to bins:
    // scope.histogram
    // .renderTitle(true)
    // .brushOn(true)
    // .xUnits( function() { return scope.xBarWidth; } )
    // .width( scope.width )
    // .height( scope.height )
    // .margins({ top: 10, right: 10, bottom: 20, left: 40 })
    // // .dimension( dim )
    // // .group( group )
    // .dimension(scope.dimension)
    // .group(scope.varGroup)
    // .stack( dsetDimension )
    // .transitionDuration(500)
    // .centerBar(true)
    // .gap(2)
    // .x( d3.scale.linear().domain( xMinAndMax ) )
    // // .x( d3.scale.linear().domain( extent ) )
    // .elasticY(true)
    // .elasticX(true)
    // .xAxis().ticks(5).tickFormat( d3.format(".2s") );

    scope.histogram.render();
  };

  var linkFn = function($scope, ele, iAttrs) {
    createSVG( $scope, ele, $scope.dimension, $scope.reduced, $scope.window.variables.x, 
      $scope.noBins, $scope.extent, $scope.binWidth, $scope.colorMap);
  };

  return {
    scope: false,
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

    $scope.dimension = DatasetService.getDimension( $scope.window.variables.x, $scope.window.variables.y );

    $scope.resetFilter = function() {
      $scope.scatterplot.filterAll();
      dc.redrawAll();
    };

  }]);




vis.directive('scatterplot', [ function(){

  var createSVG = function( scope, element, dimension, variableX, variableY ) {
    // check css window rules before touching these
    scope.width = 470;
    scope.height = 345;

    // data = [ { x: 5, y: 10 }, { x: 15, y: 15 }, { x: 40, y: 5 }, { x: 50, y: 2 } ];

    scope.scatterplot = dc.scatterPlot( element[0] );

    scope.varGroup = dimension.group();

    var xExtent = d3.extent( scope.varGroup.top(Infinity), function(d) { return d.key[0]; } );

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
    .elasticY(true)
    .elasticX(true)
    .dimension( dimension )
    .group( scope.varGroup )
    .xAxis().ticks(5).tickFormat( d3.format(".2s") );

    scope.scatterplot.render();

  };

  var linkFn = function($scope, ele, iAttrs) {
    createSVG( $scope, ele, $scope.dimension,
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
