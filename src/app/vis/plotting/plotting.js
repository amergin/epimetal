var visu = angular.module('services.plotting', ['services.dimensions']);


// handles crossfilter.js dimensions/groupings and keeps them up-to-date
visu.service('PlotService', ['$injector', 'DimensionService', function($injector, DimensionService) {

  // var config = { dimension: sth, reducedGroup: sth, varX: sth, varY: sth, pooled: false|true };
  this.drawScatter = function(config) {
    // emit signal to create a new window:
    $rootScope = $injector.get('$rootScope');
    $rootScope.$emit('packery.add', config, 'scatterplot');
  };

  // var config = { dimension: sth, reducedGroup: sth, varX: sth, pooled: false|true };
  this.drawHistogram = function(config) {
    // emit signal to create a new window:
    $rootScope = $injector.get('$rootScope');
    $rootScope.$emit('packery.add', config, 'histogram');
  };

}]);


visu.controller('HistogramPlotController', ['$scope', '$rootScope', 'DimensionService', 'DatasetFactory',
  function HistogramPlotController($scope, $rootScope, DimensionService, DatasetFactory) {

    $scope.dimension = DimensionService.getDimension( $scope.window.variables );

    $scope.extent = d3.extent( $scope.dimension.group().all(), function(sample) { return sample.key; } );
    $scope.noBins = _.max( [ _.min( [ Math.floor( $scope.dimension.group().all().length / 20 ), 50 ] ), 20 ] );
    $scope.binWidth = ($scope.extent[1] - $scope.extent[0]) / $scope.noBins;
    $scope.group = $scope.dimension.group(function(d){return Math.floor(d / $scope.binWidth) * $scope.binWidth;});
    $scope.reduced = DimensionService.getReducedGroupHisto( $scope.group, $scope.window.variables.x );
    $scope.datasetNames = DatasetFactory.getSetNames();
    $scope.colorScale = DatasetFactory.getColorScale();

    $scope.resetFilter = function() {
      $scope.histogram.filterAll();
      dc.redrawAll();
    };

  }]);

visu.directive('histogram', [ function(){

  // var config = { dimension: sth, bins: sth, binWidth: sth, reducedGroup: sth, datasetNames: sth, colorScale: sth, pooled: true|false }
  var createSVG = function( $scope, config ) {
    // check css window rules before touching these
    var _width = 470;
    var _height = 345;
    var _xBarWidth = 50;
    var _poolingColor = 'black';

  // collect charts here
  var charts = [];

  // 1. create composite chart
  $scope.histogram = dc.compositeChart( config.element[0] )
  .width(_width)
  .height(_height)
  .shareColors(true)
  .brushOn(true)
  .mouseZoomable(true)
  .elasticY(true)
  .x(d3.scale.linear().domain(config.extent).range([0,config.noBins]))
  .xUnits( function() { return _xBarWidth; } )
  .margins({top: 15, right: 10, bottom: 20, left: 40});
  //.xAxisLabel( variable );

  // set x axis format
  $scope.histogram
  .xAxis().ticks(7).tickFormat( d3.format(".2s") );

  // set colors
  if( config.pooled ) {
    $scope.histogram.linearColors( [_poolingColor] );
  }
  else {
    $scope.histogram.colors( config.colorScale );
  }

  // 2. for each of the additional stacks, create a child chart
  _.each( config.datasetNames, function(name,ind) {

    var chart = dc.barChart( $scope.histogram )
    .centerBar(true)
    .barPadding(0.15)
    .dimension( config.dimension )
    .group( config.reducedGroup, name)
    // .data( function(group) { 
    //   return group.top(5);
    //   // return group.all().filter( function(kv) { 
    //   //   // drop the 0-group == NaN from plot
    //   //   ++window._counter;
    //   //   console.log("kv=", kv);
    //   //   return true;
    //   //   //return kv.key > 0 || true;
    //   // });
    // })
    .valueAccessor( function(d) {
      // TODO!
      // if( _.isUndefined( d.value.dataset ) ) {
      //   return 0.030;
      // }
      return d.value.counts[name];
    });

    charts.push( chart );

  });

  // 3. compose & render the composite chart
  $scope.histogram.compose( charts );
  $scope.histogram.render();

  // if pooling is in place, override global css opacity rules for these
  // stacks
  if( config.pooled ) {
    d3.select($scope.histogram.g()[0][0])
    .selectAll("g.stack > rect.bar")
    .each( function(d) { 
      d3.select(this).style('opacity', 1); 
    });
  }

  };

  var linkFn = function($scope, ele, iAttrs) {
    var config = {
      dimension: $scope.dimension,
      element: ele,
      bins: $scope.noBins,
      extent: $scope.extent,
      binWidth: $scope.binWidth,
      reducedGroup: $scope.reduced,
      datasetNames: $scope.datasetNames,
      colorScale: $scope.colorScale,
      pooled: $scope.window.variables.pooled || false
    };
    createSVG( $scope, config );

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



visu.controller('ScatterPlotController', ['$scope', 'DatasetFactory', 'DimensionService',
  function($scope, DatasetFactory, DimensionService) {

    $scope.dimension = DimensionService.getXYDimension( $scope.window.variables );
    $scope.reduced = DimensionService.getReduceScatterplot( $scope.dimension.group() );
    $scope.datasetNames = DatasetFactory.getSetNames();
    $scope.xExtent = d3.extent( $scope.reduced.top(Infinity), function(d) { return d.key.x; } );
    $scope.colorScale = DatasetFactory.getColorScale();

    $scope.resetFilter = function() {
      $scope.scatterplot.filterAll();
      dc.redrawAll();
    };


  }]);




visu.directive('scatterplot', [ function(){

  var createSVG = function( $scope, config ) {

    // check css window rules before touching these
    var _width = 470;
    var _height = 345;
    var _poolingColor = 'black';

  // collect charts here
  var charts = [];


  // 1. create composite chart
  $scope.scatterplot = dc.compositeChart( config.element[0] )
  .width( _width )
  .height( _height )
  .brushOn(true)
  .x(d3.scale.linear().domain( config.xExtent ) )
  .colors( d3.scale.category20() )
  .shareColors(true)
  .xAxisLabel( config.varX )
  .yAxisLabel( config.varY )
  .brushOn(false)
  .elasticY(true)
  .margins({top: 15, right: 10, bottom: 20, left: 40});


  // set x axis format
  $scope.scatterplot
  .xAxis().ticks(7).tickFormat( d3.format(".2s") );

  // set colors
  if( config.pooled ) {
    $scope.scatterplot.linearColors([ _poolingColor ]);
  }
  else {
    $scope.scatterplot.colors( config.colorScale );
  }


  // 2. for each of the additional stacks, create a child chart
  _.each( config.datasetNames, function(name,ind) {

    var chart = dc.scatterPlot( $scope.scatterplot )
    .dimension(config.dimension)
    .group(config.reducedGroup, name)
    .symbol( d3.svg.symbol().type('circle') )
    .symbolSize(2)
    .highlightedSize(4)
    .brushOn(false)
    .data(function(group) {
        return group.all().filter(function(d) { 
          return !_.isUndefined( d.value.dataset ); 
        });
    })
    .valueAccessor( function(d) {
      if( _.isUndefined( d.value.dataset ) ) {
        return 0;
      }
      return d.value.counts[name];
    })
    .keyAccessor( function(d) { 
      //if( _.isUndefined( d.value.dataset ) ) { return null; }
      return d.key.x;
    })
    .valueAccessor( function(d) { 
      //if( _.isUndefined( d.value.dataset ) ) { return null; }      
      return d.key.y;
    });

    charts.push( chart );
  });

  // 3. compose & render the composite chart
  $scope.scatterplot.compose( charts );
  $scope.scatterplot.render();

  }; // createSVG


  var linkFn = function($scope, ele, iAttrs) {

    var config = {
      dimension: $scope.dimension,
      element: ele,
      varX: $scope.window.variables.x.variable,
      varY: $scope.window.variables.y.variable,
      xExtent: $scope.xExtent,
      datasetNames: $scope.datasetNames,
      colorScale: $scope.colorScale,
      reducedGroup: $scope.reduced,      
      pooled: $scope.window.variables.pooled || false
    };
    createSVG( $scope, config );
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