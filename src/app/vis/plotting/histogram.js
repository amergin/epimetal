var visu = angular.module('plotter.vis.plotting.histogram', 
  [
  'ui.router',
  'services.dimensions',
  'services.dataset',
  'services.som',
  'services.window'
  ]);
visu.controller('HistogramPlotController', ['$scope', '$rootScope', 'DimensionService', 'DatasetFactory', 'constants', '$state', '$injector', '$timeout',
  function HistogramPlotController($scope, $rootScope, DimensionService, DatasetFactory, constants, $state, $injector, $timeout) {

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

    $scope.redraw = function() {
      // only redraw if the dashboard is visible
      if( $state.current.name === $scope.window.handler.getName() ) {
        $scope.computeExtent();
        $scope.histogram.x(d3.scale.linear().domain($scope.extent).range([0, $scope.noBins]));
        $scope.histogram.render();
      }
    };

    // share information with the plot window
    $scope.$parent.headerText = ['Histogram of', $scope.window.variables.x, ''];
    $scope.$parent.showResetBtn = false;

    $scope.computeExtent = function() {

      var allValues;
      if( $scope.window.somSpecial ) {
        allValues = $scope.totalDimension.group().all().filter( function(d) {
          return d.value > 0 && d.key != constants.nanValue;
        });
      }
      else {
        allValues = $scope.dimension.group().all().filter(function(d) {
          return d.value > 0 && d.key != constants.nanValue;
        });
      }

      $scope.extent = d3.extent(allValues, function(d) {
        return d.key;
      });

      $scope.noBins = _.max([_.min([Math.floor($scope.dimension.group().size() / 20), 50]), 20]);
      $scope.binWidth = ($scope.extent[1] - $scope.extent[0]) / $scope.noBins;
      $scope.group = $scope.dimension.group(function(d) {
        return Math.floor(d / $scope.binWidth) * $scope.binWidth;
      });

      if( $scope.window.somSpecial ) {
        // circle
        $scope.reduced = $scope.dimensionService.getReducedGroupHistoDistributions($scope.group, $scope.window.variables.x);

        $scope.totalGroup = $scope.totalDimension.group(function(d) {
          return Math.floor(d / $scope.binWidth) * $scope.binWidth;
        });
        // total
        $scope.totalReduced = $scope.primary.getReducedGroupHisto($scope.totalGroup, $scope.window.variables.x);
      }
      else {
        $scope.reduced = $scope.dimensionService.getReducedGroupHisto($scope.group, $scope.window.variables.x);
      }

      // update individual charts to the newest info about the bins
      _.each($scope.barCharts, function(chart, name) {
        if(name === 'total') {
          chart.group($scope.filterOnSet($scope.totalReduced, name), name);
        } else {
          chart.group($scope.filterOnSet($scope.reduced, name), name);
        }
      });

      console.log("histogram extent is ", $scope.extent, "on windowHandler = ", $scope.window.handler.getName(), "variable = ", $scope.window.variables.x);
    };

    $scope.computeExtent();

    // individual charts that are part of the composite chart
    $scope.barCharts = {};

    if( $scope.window.somSpecial ) {
      var somId = $injector.get('SOMService').getSomId();
      var filters = $injector.get('FilterService').getSOMFilters();
      $scope.groupNames = _.map(filters, function(f) { return f.id(); } );
      $scope.colorScale = $injector.get('FilterService').getSOMFilterColors();

    } else {
      $scope.groupNames = DatasetFactory.getSetNames();
      $scope.colorScale = DatasetFactory.getColorScale();      
    }

    // see https://github.com/dc-js/dc.js/wiki/FAQ#filter-the-data-before-its-charted
    // this used to filter to only the one set & limit out NaN's
    $scope.filterOnSet = function(group, name) {
      return {
        'all': function() {
          // special
          if( $scope.window.somSpecial && name != 'total' ) {
            var ret = _.chain(group.all())
            .reject(function(grp) { return grp.key < constants.legalMinValue; })
            .map(function(grp) {
              var lookup = {};

              // for each bmu coordinate
              _.each(grp.value.counts, function(countObj, id) {
                if( id == 'total' ) { return; } // continue
                var circles = $injector.get('FilterService').inWhatCircles(countObj.bmu);

                // that may exist in many circle filters
                _.each(circles, function(circleId) {
                  if( !lookup[circleId] ) { lookup[circleId] = 0; }
                  // add the amount info
                  lookup[circleId] = lookup[circleId] + countObj.count;
                });

              });
              return {
                key: grp.key,
                value: {
                  counts: angular.extend(lookup, { total: grp.value.counts.total })
                }
              };
            })
            .reject(function(grp) { return grp.value.counts[name] === 0; })
            .value();

            return ret;
          } else {
            // normal histograms
            return group.all().filter(function(d) {
              return (d.value.counts[name] > 0) && (d.key >= constants.legalMinValue);
            });
          }
        }
      };
    };

  }
  ]);

visu.directive('histogram', ['constants', '$timeout', '$rootScope', '$injector',

  function(constants, $timeout, $rootScope, $injector) {

    var createSVG = function($scope, config) {
      // check css window rules before touching these
      var _width = 470;
      var _height = 345;
      var _xBarWidth = 50;
      var _poolingColor = '#000000';

      // collect charts here
      var charts = [];

      var resizeSVG = function(chart) {
        var ratio = config.size.aspectRatio === 'stretch' ? 'none' : 'xMinYMin';
          chart.select("svg")
              .attr("viewBox", "0 0 " + [config.size.width, config.size.height].join(" ") )
              .attr("preserveAspectRatio", ratio)
              .attr("width", "100%")
              .attr("height", "100%");
          // don't redraw here, or it will form a feedback loop
          // chart.redraw();
      };

      // work-around, weird scope issue on filters ?!
      $scope.FilterService = $injector.get('FilterService');

      var dcGroup = $scope.somSpecial ? constants.groups.histogram.nonInteractive : constants.groups.histogram.interactive;

      // 1. create composite chart
      $scope.histogram = dc.compositeChart(config.element[0], dcGroup)
      .dimension(config.dimension)
      .width(config.size.width)
      .height(config.size.height)
      .shareColors(true)
      .elasticY(true)
      .elasticX(false)
      .brushOn(config.filterEnabled)
      .renderTitle(false)
      .title(function(d) {
        return ['Value: ' + constants.tickFormat(d.key),
        'Total count: ' + d.value.counts.total || 0
        ].join("\n");
      })
      .x(d3.scale.linear().domain(config.extent).range([0, config.noBins]))
      .xUnits( function() { return _xBarWidth; } )
      .margins({
        top: 15,
        right: 10,
        bottom: 30,
        left: 40
      })
      .xAxisLabel(config.variableX)
      .on("filtered", function(chart, filter) {
        dc.events.trigger( function() {

          $timeout( function() {
            var filterRemoved = _.isNull(filter) && _.isNull(chart.filter());

            if( filterRemoved ) {
              $scope.window.showResetBtn = false;
              $scope.FilterService.removeHistogramFilter({ id: $scope.window._winid });
              // no idea why this is needed
              $scope.histogram.redraw();
            } else {
              $scope.window.showResetBtn = true;
                // remove filter (perhaps slided to another position)
                $scope.FilterService.removeHistogramFilter({ id: $scope.window._winid });
                $scope.FilterService.addHistogramFilter( { 'type': 'range', 'filter': filter, 
                  'var': $scope.window.variables.x, 'id': $scope.window._winid,
                  'chart': $scope.histogram
                });
              }
              $scope.window.handler.getService().reRenderVisible({ compute: true, omit: 'histogram' });

            });

        }, 100);
      })
      .renderlet( function(chart) {
        if( config.pooled ) {
          d3.selectAll( $(config.element).find('rect.bar:not(.deselected)') )
          .attr("class", 'bar pooled')
          .attr("fill", _poolingColor);
        }
      })
      .on("postRender", resizeSVG)
      .on("postRedraw", resizeSVG);

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
        size: $scope.window.size,
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

      $scope.deregisters = [];

      var resizeUnbind = $rootScope.$on('gridster.resize', function(eve, $element) {
        // if( $element.is( $scope.$parent.element.parent() ) ) {
        //   $timeout( function() {
        //     $scope.histogram.render();
        //   });
        // }
      });

      var reRenderUnbind = $rootScope.$on('window-handler.rerender', function(event, winHandler, config) {
        if( winHandler == $scope.window.handler ) {
          if( config.omit == 'histogram' ) { return; }
          $timeout( function() {
            if(config.compute) {
              $scope.redraw();
              var oldFilters = $scope.histogram.filters();
              $scope.histogram.filter(null);
              $timeout(function() {
                _.each(oldFilters, function(filter) {
                  $scope.histogram.filter(filter);
                });
                $scope.histogram.redraw();
              });
              // if(!$scope.somSpecial) {
              //   var oldFilters = $scope.histogram.filters();
              //   $scope.histogram.filter(null);
              //   $timeout(function() {
              //     _.each(oldFilters, function(filter) {
              //       $scope.histogram.filter(filter);
              //     });
              //     $scope.histogram.redraw();
              //   });
              // }
            }
            else {
              $scope.histogram.redraw();
            }
          });
        }
      });

      var redrawUnbind = $rootScope.$on('window-handler.redraw', function(event, winHandler) {
        if( winHandler == $scope.window.handler ) {
          $timeout( function() {
            $scope.histogram.redraw();
          });
        }
      });

      // var restartCrossfilterUnbind = $rootScope.$on('dimension:crossfilter', function(event) {
      //   var oldFilters = $scope.histogram.filters();
      //   $scope.histogram.filter(null);
      //   $scope.redraw();
      //   $timeout(function() {
      //     _.each(oldFilters, function(filter) {
      //       $scope.histogram.filter(filter);
      //     });
      //     $scope.histogram.redraw();
      //   });
      // });

      $scope.deregisters.push(resizeUnbind, reRenderUnbind, redrawUnbind); //, restartCrossfilterUnbind);

      $scope.$on('$destroy', function() {
        console.log("destroying histogram for", $scope.window.variables.x);
        _.each($scope.deregisters, function(unbindFn) {
          unbindFn();
        });
      });

      ele.on('$destroy', function() {
        $scope.$destroy();
      });

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