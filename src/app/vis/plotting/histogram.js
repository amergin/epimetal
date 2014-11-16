var visu = angular.module('plotter.vis.plotting.histogram', 
  [
  'ui.router',
  'services.dimensions',
  'services.dataset'
  ]);
visu.controller('HistogramPlotController', ['$scope', '$rootScope', 'DimensionService', 'DatasetFactory', 'constants', '$state',
  function HistogramPlotController($scope, $rootScope, DimensionService, DatasetFactory, constants, $state) {

    $scope.dimension = DimensionService.getDimension($scope.window.variables);
    $scope.prevFilter = null;

    $scope.$onRootScope('histogram.redraw', function(event, dset, action) {
      if( $state.current.name === $scope.window.handler.getName() ) {
        // only redraw if the dashboard is visible
        $scope.computeExtent();
        $scope.histogram.x(d3.scale.linear().domain($scope.extent).range([0, $scope.noBins]));
        $scope.histogram.render();
      }
    });

    $scope.headerText = ['Histogram of', $scope.window.variables.x, ''];
    $scope.window.showResetBtn = false;


    $scope.computeExtent = function() {
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

visu.directive('histogram', ['constants', '$timeout',

  function(constants, $timeout) {

    var createSVG = function($scope, config) {
      // check css window rules before touching these
      var _width = 470;
      var _height = 345;
      var _xBarWidth = 50;
      var _poolingColor = '#000000';

      // collect charts here
      var charts = [];

      //var tickFormat = d3.format(".2s");

      // 1. create composite chart
      $scope.histogram = dc.compositeChart(config.element[0], constants.groups.histogram)
        .dimension(config.dimension)
        .width(null)
        .height(null)
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
          $timeout( function() {
            if (_.isNull(filter) || _.isNull(chart.filter())) {
              $scope.window.showResetBtn = false;
              $rootScope.$emit('dc.histogram.filter', {'action': 'removed', 
                'payload': { 'type': 'range', 'dimension': $scope.dimension, 
                'chart': $scope.histogram, 'filter':  $scope.prevFilter, 'var': $scope.window.variables.x } });
              $scope.prevFilter = null;
            }
            else {
              $scope.window.showResetBtn = true;
              $rootScope.$emit('dc.histogram.filter', {'action': 'added', 
                'payload': { 'type': 'range', 'dimension': $scope.dimension, 
                'chart': $scope.histogram, 'filter':  filter, 'var': $scope.window.variables.x } });
              $scope.prevFilter = filter;
            }
            $rootScope.$emit('scatterplot.redrawAll');
            $rootScope.$emit('heatmap.redraw');
          });
        })
        .renderlet( function(chart) {
          if( config.pooled ) {
            d3.selectAll( $(config.element).find('rect.bar:not(.deselected)') )
            .attr("class", 'bar pooled')
            .attr("fill", _poolingColor);
          }

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

      if( !_.isUndefined( $scope.window.filter ) ) {
        $timeout( function() {
          $scope.histogram.filter( $scope.window.filter );
          $scope.histogram.redraw();
          $rootScope.$emit('scatterplot.redrawAll');
        });
      }

    };

    function postLink($scope, ele, attrs, ctrl) {
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
        pooled: $scope.window.pooled || false,
        filter: $scope.filterOnSet
      };

      createSVG($scope, config);

      // redraw on window resize
      ele.parent().on('resize', function() {
        if( !_.isUndefined( $scope.histogram ) ) {
          dc.events.trigger( function() {
            $scope.histogram.render();
          });
        }
      });

    }

    return {
      scope: false,
      restrict: 'C',
      replace: true,
      controller: 'HistogramPlotController',
      link: {
        post: postLink
      }
    };
  }
]);