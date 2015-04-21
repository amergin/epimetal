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

    $scope.isSpecial = function() {
      return $scope.window.somSpecial;
    };

    $scope.filterButton = function(x) {
      $scope.window.showResetBtn = x;
    };

    $scope.dimensionService = $scope.$parent.window.handler.getDimensionService();
    // work-around, weird scope issue on filters ?!
    $scope.FilterService = $injector.get('FilterService');

    function initSOMSpecial() {
      $scope.primary = $injector.get('DimensionService').getPrimary();
      $scope.totalDimensionInst = $scope.primary.getDimension($scope.window.variables);
      $scope.totalDimension = $scope.totalDimensionInst.get();
      $scope.dimensionInst = $scope.dimensionService.getDimension($scope.window.variables);
      $scope.dimension = $scope.dimensionInst.get();
    }

    function initDefault() {
      $scope.dimensionInst = $scope.dimensionService.getDimension($scope.window.variables);
      $scope.dimension = $scope.dimensionInst.get();
      $scope.groupInst = null;
      $scope.totalGroupInst = null;

    }

    if( $scope.isSpecial() ) {
      initSOMSpecial();
    } else {
      initDefault();
    }

    $scope.$parent.resetFilter = function() {
      $scope.histogram.filterAll();
      $scope.window.handler.redrawAll();
    };

    $scope.window.showResetBtn = false;
    $scope.resetButton = function(x) {
      $timeout(function() {
        $scope.window.showResetBtn = x;
      });
    };

    $scope.render = function() {
      // only render if the dashboard is visible
      if( $state.current.name === $scope.window.handler.getName() ) {
        $scope.computeExtent();
        $scope.histogram.render();
      }
    };

    // share information with the plot window
    $scope.$parent.headerText = ['Histogram of', $scope.window.variables.x, ''];
    // $scope.$parent.showResetBtn = false;

    $scope.computeExtent = function() {
      // remove older ones
      if($scope.groupInst) { $scope.groupInst.decrement(); }
      if($scope.totalGroupInst) { $scope.totalGroupInst.decrement(); }

      var allValues;
      if( $scope.isSpecial() ) {
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
      $scope.groupInst = $scope.dimensionInst.group(function(d) {
        return Math.floor(d / $scope.binWidth) * $scope.binWidth;
      });

      if( $scope.isSpecial() ) {
        // circle
        $scope.dimensionService.getReducedGroupHistoDistributions($scope.groupInst, $scope.window.variables.x);
        $scope.reduced = $scope.groupInst.get();

        $scope.totalGroupInst = $scope.totalDimensionInst.group(function(d) {
          return Math.floor(d / $scope.binWidth) * $scope.binWidth;
        });
        // total
        $scope.primary.getReducedGroupHisto($scope.totalGroupInst, $scope.window.variables.x);
        $scope.totalReduced = $scope.totalGroupInst.get();
      }
      else {
        $scope.dimensionService.getReducedGroupHisto($scope.groupInst, $scope.window.variables.x);
        $scope.reduced = $scope.groupInst.get();
      }

      // update individual charts to the newest info about the bins
      _.each($scope.barCharts, function(chart, name) {
        if(name === 'total') {
          chart.group($scope.filterOnSet($scope.totalReduced, name), name);
        } else {
          chart.group($scope.filterOnSet($scope.reduced, name), name);
        }
      });

      if($scope.histogram) {
        $scope.histogram.x(d3.scale.linear().domain($scope.extent).range([0, $scope.noBins]));
      }
      console.log("histogram extent is ", $scope.extent, "on windowHandler = ", $scope.window.handler.getName(), "variable = ", $scope.window.variables.x);
    };

    $scope.computeExtent();

    // individual charts that are part of the composite chart
    $scope.barCharts = {};

    if( $scope.isSpecial() ) {
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
          if( $scope.isSpecial() && name != 'total' ) {
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
            // normal histograms or total
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
        };

        var dcGroup = $scope.isSpecial() ? constants.groups.histogram.nonInteractive : constants.groups.histogram.interactive;

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
      .addFilterHandler(function(filters, filter) {
        function defaultFn(filters, filter) {
          filters.push(filter);
          return filters;
        }

        function custom(filters, filter) {
          // adding a filter may be actually shifting it to another position
          var current = _.find($injector.get('FilterService').getFilters(), function(filt) {
            return filt.type() == 'range' && filt.chart() == $scope.histogram;
          });

          if(current) {
            // shifted
            current.payload(filter);
          } else {
            // new
            var filt = new HistogramFilter()
            .chart($scope.histogram)
            .variable($scope.window.variables.x)
            .windowid($scope.window._winid)
            .payload(filter);

            $injector.get('FilterService').addFilter(filt);
          }
          $scope.resetButton(true);
          $injector.get('WindowHandler').reRenderVisible({ compute: true, omit: 'histogram' });
        }

        custom.apply(this, arguments);
        return defaultFn.apply(this, arguments);
      })
      .removeFilterHandler(function(filters, filter) {
        function defaultFn(filters, filter) {
          for (var i = 0; i < filters.length; i++) {
            if (filters[i] <= filter && filters[i] >= filter) {
              filters.splice(i, 1);
              break;
            }
          }
          return filters;
        }

        function custom(filters, filter) {
          $injector.get('FilterService').removeFilter(filt);
          $injector.get('WindowHandler').reRenderVisible({ compute: true, omit: 'histogram' });
          $scope.resetButton(false);
        }

        custom.apply(this, arguments);
        return defaultFn.apply(this, arguments);
      })
      .resetFilterHandler(function(filters) {
        _.each(filters, function(filter) {
          $injector.get('FilterService').removeFilterByPayload(filter);
        });
        $injector.get('WindowHandler').reRenderVisible({ compute: true, omit: 'histogram' });
        $scope.resetButton(false);
        return [];
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

        var chart = dc.barChart($scope.histogram)
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

      if( $scope.isSpecial()  ) {
        var name = 'total';
        var chart = dc.barChart($scope.histogram)
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

      if( !$scope.isSpecial() && !_.isUndefined( $scope.window.filters ) && $scope.window.filters.length > 0) {
        $timeout( function() {
          var filter = dc.filters.RangedFilter($scope.window.filters[0], $scope.window.filters[1]);
          $scope.histogram.filter(filter);
          $scope.histogram.render();
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

      var derivedAddUnbind = $rootScope.$on('dataset:derived:add', function(eve, set) {
        function addChart() {
          var name = set.name(),
          chart = dc.barChart($scope.histogram)
          .centerBar(true)
          .barPadding(0.15)
          .brushOn(true)
          .dimension($scope.dimension)
          .group($scope.filterOnSet($scope.reduced, name), name)
          .valueAccessor(function(d) { // is y direction
            return d.value.counts[name];
          }),
          currentChildren = $scope.histogram.children();

          $scope.barCharts[name] = chart;
          currentChildren.push(chart);
          $scope.histogram.compose(currentChildren);
        }

        $scope.computeExtent();
        addChart();
      });

      var derivedRemoveUnbind = $rootScope.$on('dataset:derived:remove', function(eve, set) {
        function removeChart() {
          var currentChildren = $scope.histogram.children(),
          name = set.name(),
          chart = $scope.barCharts[name];

          _.remove(currentChildren, chart);

          $scope.histogram.compose(currentChildren);
        }

        $scope.computeExtent();
        removeChart();
      });

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
              $scope.render();

              if(!$scope.isSpecial()) {
                var oldFilters = $scope.histogram.filters();
                $scope.histogram.filter(null);
                _.each(oldFilters, function(filter) {
                  $scope.histogram.filter(filter);
                });
                $scope.histogram.redraw();
              }
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

      var gatherStateUnbind =  $rootScope.$on('UrlHandler:getState', function(event, callback) {
        var retObj = _.chain($scope.window)
        .pick(['type', 'grid', 'somSpecial', 'pooled', 'variables', 'handler'])
        .clone()
        .extend({ filters: $scope.histogram.filters()[0] || [] })
        .value();

        callback(retObj);
      });

      $scope.deregisters.push(resizeUnbind, reRenderUnbind, redrawUnbind, gatherStateUnbind, derivedAddUnbind, derivedRemoveUnbind);

      $scope.$on('$destroy', function() {
        console.log("destroying histogram for", $scope.window.variables.x);
        _.each($scope.deregisters, function(unbindFn) {
          unbindFn();
        });

        $scope.groupInst.decrement();
        if($scope.isSpecial()) { $scope.totalGroupInst.decrement(); }
        $scope.dimensionInst.decrement();
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