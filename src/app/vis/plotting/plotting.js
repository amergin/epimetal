var visu = angular.module('services.plotting', ['services.dimensions']);


// handles crossfilter.js dimensions/groupings and keeps them up-to-date
visu.service('PlotService', ['$injector', 'DimensionService', function($injector, DimensionService) {

  var vars = {};
  var config = {
    // check css window rules before touching these
    width: 470,
    height: 345,
    xBarWidth: 20    
  };

  var _histogram = null;

  // var config = { dimension: sth, reducedGroup: sth, varX: sth, varY: sth, pooled: false|true };
  this.drawScatter = function(config) {
  };

  // var config = { dimension: sth, reducedGroup: sth, varX: sth, pooled: false|true };
  this.drawHistogram = function(config) {
    vars.dim = DimensionService.getDimension({ x: config.varX });
    vars.extent = d3.extent( vars.dim.group().all(), function(sample) { return sample.key; } );
    vars.noBins = _.max( [ _.min( [ Math.floor( vars.dim.group().all().length / 20 ), 50 ] ), 20 ] );
    vars.binWidth = ( vars.extent[1] - vars.extent[0]) / vars.noBins;
    vars.group = vars.dim.group(function(d){return Math.floor(d / vars.binWidth) * vars.binWidth;});
    vars.pooled = config.pooled;

    var reduGroup = DimensionService.getReducedGroupHisto(vars.group, config.varX);

    // emit signal to create a new window:
    $rootScope = $injector.get('$rootScope');
    $rootScope.$emit('packery.add', {x: config.varX}, 'histogram');

  };


}]);


visu.controller('HistogramPlotController', ['$scope', '$rootScope', 'DimensionService', 'DatasetFactory',
  function HistogramPlotController($scope, $rootScope, DimensionService) {

    //$scope.data = DatasetService.getActives( [$scope.window.variables.x.set] )[0];
    // $scope.dimension = DimensionService.getDimension( $scope.window.variables.x );

    // $scope.extent = d3.extent( $scope.dimension.group().all(), function(sample) { return sample.key; } );
    // $scope.noBins = _.max( [ _.min( [ Math.floor( $scope.dimension.group().all().length / 20 ), 50 ] ), 20 ] );
    // $scope.binWidth = ($scope.extent[1] - $scope.extent[0]) / $scope.noBins;
    // $scope.group = $scope.dimension.group(function(d){return Math.floor(d / $scope.binWidth) * $scope.binWidth;});
    // $scope.reduced = DimensionService.getReducedGroupHisto( $scope.group, $scope.window.variables.x );
    // $scope.datasetNames = DatasetFactory.getSetNames();
    // $scope.pooled = $scope.window.variables.pooled || false;

    //$scope.colorScale = DatasetService.getColorScale();

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
    var _xBarWidth = 20;
    var _poolingColor = 'black';

  // collect charts here
  var charts = [];

  // 1. create composite chart
  $scope.histogram = dc.compositeChart( element[0] )
  .width(_width)
  .height(_height)
  .shareColors(true)
  .brushOn(true)
  .elasticY(true)
  .x(d3.scale.linear().domain(extent).range([0,config.noBins]))
  .xUnits( function() { return _xBarWidth; } )
  .margins({top: 15, right: 10, bottom: 20, left: 40});
  //.xAxisLabel( variable );

  // set x axis format
  $scope.histogram
  .xAxis().ticks(7).tickFormat( d3.format(".2s") );

  // set colors
  if( isPooled ) {
    $scope.histogram.linearColors( _poolingColor );
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
    .valueAccessor( function(d) {
      // TODO!
      if( _.isUndefined( d.value.dataset ) ) {
        return 0;
      }
      return d.value.counts[name];
    });

    charts.push( chart );

  });

  // 3. compose & render the composite chart
  scope.histogram.compose( charts );
  scope.histogram.render();

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
      bins: $scope.noBins,
      binWidth: $scope.binWidth,
      reducedGroup: $scope.reduced,
      datasetNames: $scope.datasetNames,
      colorScale: d3.scale.category20(),
      pooled: $scope.pooled
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


