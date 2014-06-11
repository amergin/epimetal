var visu = angular.module('plotter.vis.plotting.histogram', ['plotter.vis.plotting']);
visu.controller('HistogramPlotController', ['$scope', '$rootScope', 'DimensionService', 'DatasetFactory', 'constants',
  function HistogramPlotController($scope, $rootScope, DimensionService, DatasetFactory, constants) {

    $scope.dimension = DimensionService.getDimension($scope.window.variables);

    $scope.$onRootScope('histogram.redraw', function(event, dset, action) {
      $scope.computeExtent();
      $scope.histogram.x(d3.scale.linear().domain($scope.extent).range([0, $scope.noBins]));
      $scope.histogram.render();

    });

    $scope.headerText = $scope.window.variables.x;

    $scope.computeExtent = function() {
      // var allValues = $scope.dimension.group().all();
      // if( _.first( allValues ).key === constants.nanValue  ) {
      //   allValues = allValues.slice(1);
      // }
      // $scope.extent = d3.extent( allValues, function(d) { return d.key; } );
      var allValues = $scope.dimension.group().all().filter(function(d) {
        return d.value > 0 && d.key != constants.nanValue;
      });
      $scope.extent = d3.extent(allValues, function(d) {
        return d.key;
      });

      $scope.noBins = _.max([_.min([Math.floor($scope.dimension.group().all().length / 20), 50]), 20]);
      $scope.binWidth = ($scope.extent[1] - $scope.extent[0]) / $scope.noBins;
      $scope.group = $scope.dimension.group(function(d) {
        return Math.floor(d / $scope.binWidth) * $scope.binWidth;
      });

      $scope.reduced = DimensionService.getReducedGroupHisto($scope.group, $scope.window.variables.x);

      // update individual charts to the newest info about the bins
      _.each($scope.barCharts, function(chart, name) {
        chart.group($scope.filterOnSet($scope.reduced, name), name);
      });

      console.log("histogram extent is ", $scope.extent);
    };

    $scope.computeExtent();

    // individual charts that are part of the composite chart
    $scope.barCharts = {};

    $scope.datasetNames = DatasetFactory.getSetNames();
    $scope.colorScale = DatasetFactory.getColorScale();

    $scope.resetFilter = function() {
      $scope.histogram.filterAll();
      dc.redrawAll(constants.groups.histogram);
    };

    // $scope.toggleBrush = function() {
    //   $scope.histogram.brushOn( !$scope.histogram.brushOn() );
    //   $scope.histogram.render();
    // };

    // see https://github.com/dc-js/dc.js/wiki/FAQ#filter-the-data-before-its-charted
    // this used to filter to only the one set & limit out NaN's
    $scope.filterOnSet = function(group, name) {
      return {
        'all': function() {
          return group.all().filter(function(d) {
            return (d.value.counts[name] > 0) && (d.key >= constants.legalMinValue);
          });
        }
      };
    };

  }
]);

visu.directive('histogram', ['constants',

  function(constants) {

    var createSVG = function($scope, config) {
      // check css window rules before touching these
      var _width = 470;
      var _height = 345;
      var _xBarWidth = 50;
      var _poolingColor = 'black';

      // collect charts here
      var charts = [];

      //var tickFormat = d3.format(".2s");

      // 1. create composite chart
      $scope.histogram = dc.compositeChart(config.element[0], constants.groups.histogram)
        .dimension(config.dimension)
        .width(_width)
        .height(_height)
        .shareColors(true)
        .elasticY(true)
        .elasticX(false)
        .renderTitle(false)
        .title(function(d) {
          return 'Value: ' + constants.tickFormat(d.key) +
            "\n" +
            "Dataset: " + d.value.dataset +
            "\n" +
            "Count: " + d.value.counts[d.value.dataset];
        })
        .x(d3.scale.linear().domain(config.extent).range([0, config.noBins]))
        .xUnits(function() {
          return _xBarWidth;
        })
        .margins({
          top: 15,
          right: 10,
          bottom: 30,
          left: 40
        })
        .xAxisLabel(config.variableX)
        .on("filtered", function(chart, filter) {
          //console.log("filter trigger", chart, filter);
          $rootScope.$emit('scatterplot.redrawAll');
        });

      // set x axis format
      $scope.histogram
        .xAxis().ticks(7).tickFormat(constants.tickFormat);

      // set colors
      if (config.pooled) {
        $scope.histogram.linearColors([_poolingColor]);
      } else {
        $scope.histogram.colors(config.colorScale);
      }



      // 2. for each of the additional stacks, create a child chart
      _.each(config.datasetNames, function(name, ind) {

        var chart = dc.barChart($scope.histogram) //, constants.groups.histogram)
        .centerBar(true)
          .barPadding(0.15)
          .brushOn(true)
          .dimension(config.dimension)
          .group(config.filter(config.reduced, name), name)
          .valueAccessor(function(d) { // is y direction
            return d.value.counts[name];
          });

        $scope.barCharts[name] = chart;
        charts.push(chart);
      });

      // 3. compose & render the composite chart
      $scope.histogram.compose(charts);
      $scope.histogram.render();

      // if pooling is in place, override global css opacity rules for these
      // stacks
      if (config.pooled) {
        d3.select($scope.histogram.g()[0][0])
          .selectAll("g.stack > rect.bar")
          .each(function(d) {
            d3.select(this).style('opacity', 1);
          });
      }

    };

    var linkFn = function($scope, ele, iAttrs) {
      var config = {
        dimension: $scope.dimension,
        element: ele,
        variableX: $scope.window.variables.x,
        noBins: $scope.noBins,
        extent: $scope.extent,
        binWidth: $scope.binWidth,
        groups: $scope.groups,
        reduced: $scope.reduced,
        datasetNames: $scope.datasetNames,
        colorScale: $scope.colorScale,
        pooled: $scope.window.variables.pooled || false,
        filter: $scope.filterOnSet
      };
      createSVG($scope, config);

    };
    linkFn.$inject = ['$scope', 'ele', 'iAttrs'];

    return {
      scope: false,
      restrict: 'C',
      require: '^?window',
      replace: true,
      controller: 'HistogramPlotController',
      transclude: true,
      link: linkFn
    };
  }
]);