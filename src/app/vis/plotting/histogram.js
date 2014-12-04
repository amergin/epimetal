var visu = angular.module('plotter.vis.plotting.histogram', 
  [
  'ui.router',
  'services.dimensions',
  'services.dataset',
  'services.som'
  ]);
visu.controller('HistogramPlotController', ['$scope', '$rootScope', 'DimensionService', 'DatasetFactory', 'constants', '$state', '$injector',
  function HistogramPlotController($scope, $rootScope, DimensionService, DatasetFactory, constants, $state, $injector) {

    $scope.dimensionService = $scope.$parent.window.handler.getDimensionService();

    $scope.dimension = $scope.dimensionService.getDimension($scope.window.variables);
    $scope.prevFilter = null;

    if( $scope.window.somSpecial ) {
        $scope.primary = $injector.get('DimensionService').getPrimary();
        $scope.totalDimension = $scope.primary.getDimension($scope.window.variables);      
    }

    $scope.$parent.resetFilter = function() {
      $scope.histogram.filterAll();
      dc.redrawAll(constants.groups.histogram);
    };

    $scope.$onRootScope('histogram.redraw', function(event, dset, action) {
      if( $state.current.name === $scope.window.handler.getName() ) {
        // only redraw if the dashboard is visible
        $scope.computeExtent();
        $scope.histogram.x(d3.scale.linear().domain($scope.extent).range([0, $scope.noBins]));
        $scope.histogram.render();
      }
    });

    // share information with the plot window
    $scope.$parent.headerText = ['Histogram of', $scope.window.variables.x, ''];
    $scope.$parent.showResetBtn = false;

    $scope.computeExtent = function() {
      var allValues = $scope.dimension.group().all().filter(function(d) {
        return d.value > 0 && d.key != constants.nanValue;
      });

      if( $scope.window.somSpecial ) {
        var totalValues = $scope.totalDimension.group().all().filter( function(d) {
          return d.value > 0 && d.key != constants.nanValue;
        });
        allValues = _.union(allValues, totalValues);
      }

      $scope.extent = d3.extent(allValues, function(d) {
        return d.key;
      });

      $scope.noBins = _.max([_.min([Math.floor($scope.dimension.group().all().length / 20), 50]), 20]);
      $scope.binWidth = ($scope.extent[1] - $scope.extent[0]) / $scope.noBins;
      $scope.group = $scope.dimension.group(function(d) {
        return Math.floor(d / $scope.binWidth) * $scope.binWidth;
      });

      if( $scope.window.somSpecial ) {
        // normal
        $scope.reduced = $scope.dimensionService.getReducedGroupHistoDistributions($scope.group, $scope.window.variables.x);

        $scope.totalGroup = $scope.totalDimension.group(function(d) {
          return Math.floor(d / $scope.binWidth) * $scope.binWidth;
        });
        $scope.totalReduced = $scope.primary.getReducedGroupHisto($scope.totalGroup, $scope.window.variables.x);
      }
      else {
        $scope.reduced = $scope.dimensionService.getReducedGroupHisto($scope.group, $scope.window.variables.x);
      }

      // update individual charts to the newest info about the bins
      _.each($scope.barCharts, function(chart, name) {
        if(name === 'total') {
          chat.group($scope.filterOnSet($scope.totalReduced, name), name);
        } else {
          chart.group($scope.filterOnSet($scope.reduced, name), name);
        }
      });

      console.log("histogram extent is ", $scope.extent);
    };

    $scope.computeExtent();

    // individual charts that are part of the composite chart
    $scope.barCharts = {};

    if( $scope.window.somSpecial ) {
      var somId = $injector.get('SOMService').getSomId();
      $scope.groupNames = _.keys($scope.dimensionService.getSOMFilters(somId)); //_.chain( $scope.dimensionService.getSOMFilters(somId) ).keys().union(['total']).reverse().value();
      $scope.colorScale = $injector.get('SOMService').getColorScale();

    } else {
      $scope.groupNames = DatasetFactory.getSetNames();
      $scope.colorScale = DatasetFactory.getColorScale();
      
    }


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

visu.directive('histogram', ['constants', '$timeout', '$rootScope',

  function(constants, $timeout, $rootScope) {

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
        .brushOn(config.filterEnabled)
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
                'chart': $scope.histogram, 'filter':  $scope.prevFilter, 'var': $scope.window.variables.x,
                'handler': $scope.window.handler
              } });
              $scope.prevFilter = null;
            }
            else {
              $scope.window.showResetBtn = true;
              $rootScope.$emit('dc.histogram.filter', {'action': 'added', 
                'payload': { 'type': 'range', 'dimension': $scope.dimension, 
                'chart': $scope.histogram, 'filter':  filter, 'var': $scope.window.variables.x,
                'handler': $scope.window.handler
              } });
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
      _.each(config.groupNames, function(name, ind) {

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

      if( $scope.window.somSpecial  ) {
        var name = 'total';
        var chart = dc.barChart($scope.histogram) //, constants.groups.histogram)
          .centerBar(true)
          .barPadding(0.15)
          .brushOn(true)
          .dimension($scope.totalDimension)
          .group(config.filter($scope.totalReduced, name), name)
          .valueAccessor(function(d) { // is y direction
            return d.value.counts[name];
          });
        $scope.barCharts[name] = chart;
        charts.push(chart);

        // total to background
        charts.reverse();
      }

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

      $scope.$parent.element = ele;

      var config = {
        dimension: $scope.dimension,
        element: ele,
        variableX: $scope.window.variables.x,
        noBins: $scope.noBins,
        extent: $scope.extent,
        binWidth: $scope.binWidth,
        groups: $scope.groups,
        reduced: $scope.reduced,
        groupNames: $scope.groupNames,
        // datasetNames: $scope.datasetNames,
        colorScale: $scope.colorScale,
        pooled: $scope.window.pooled || false,
        filter: $scope.filterOnSet,
        filterEnabled: $scope.window.filterEnabled
      };

      $timeout( function() {
        createSVG($scope, config);
      });


      $scope.$parent.$watch('window.size', function(nevVal, oldVal) {
        if( angular.equals(nevVal, oldVal) ) {
          return;
        }

        if( !_.isUndefined( $scope.histogram ) ) {
          dc.events.trigger( function() {
            $timeout( function() {
              $scope.histogram.render();
            });
          });
        }

      }, true);

      // $scope.$on('gridster-resized', function(newSizes){
      //   console.log(arguments);
      //   var newWidth = sizes[0];
      //   var newHeight = sizes[1];
      // });

      // $scope.getSize = function() {
      //   var ele = $scope.$parent.element;
      //   return [ele.width(), ele.height()];
      // };

      // $scope.$watch($scope.getSize, function(newVal, oldVal) {
      //   $timeout( function() {
      //     if( oldVal == newVal ) {
      //       return;
      //     }
      //     console.log("here");
      //   });
      // }, true);

      // getSize on window resize
      //ele.parent().on('resize', function() {
      // angular.element(ele.parent()).on('resize', function() {
      // ele.parent().bind('resize', function() {
      //   if( !_.isUndefined( $scope.histogram ) ) {
      //     dc.events.trigger( function() {
      //       $scope.histogram.render();
      //     });
      //   }
      // });

    }

    return {
      scope: false,
      restrict: 'C',
      controller: 'HistogramPlotController',
      link: {
        post: postLink
      }
    };
  }
]);