angular.module('plotter.vis.plotting.histogram', 
  [
  'ui.router',
  'services.dimensions',
  'services.dataset',
  'services.som',
  'services.window',
  'ext.d3',
  'ext.dc',
  'ext.lodash'
  ])

.constant('HISTOGRAM_WIDTH', 450)
.constant('HISTOGRAM_HEIGHT', 375)
.constant('HISTOGRAM_POOLING_COLOR', '#000000')
.constant('HISTOGRAM_SOM_TOTAL_COLOR', '#00b300')

.controller('HistogramPlotController', function HistogramPlotController($scope, DatasetFactory, constants, $state, $injector, $timeout, HISTOGRAM_POOLING_COLOR, GRID_WINDOW_PADDING, d3, dc, _) {

    $scope.isSpecial = function() {
      return $scope.window.extra().somSpecial || false;
    };

    $scope.$watch(function() {
      return $scope.window.pooled();
    }, function(newVal, oldVal) {
      if( newVal !== oldVal) {
        if(newVal) {
          $scope.histogram.colors(null);
          $scope.histogram.linearColors([HISTOGRAM_POOLING_COLOR]);
        } else {
          $scope.histogram.colors($scope.colorScale);
        }

        $scope.histogram.render();
      }
    });

    $scope.dimensionService = $scope.window.handler().getDimensionService();

    // work-around, weird scope issue on filters ?!
    $scope.FilterService = $injector.get('FilterService');

    function initSOMSpecial() {
      $scope.primary = $injector.get('DimensionService').getPrimary();
      $scope.totalDimensionInst = $scope.primary.getDimension($scope.window.variables());
      $scope.totalDimension = $scope.totalDimensionInst.get();
      $scope.dimensionInst = $scope.dimensionService.getDimension($scope.window.variables());
      $scope.dimension = $scope.dimensionInst.get();
    }

    function initDefault() {
      $scope.dimensionInst = $scope.dimensionService.getDimension($scope.window.variables());
      $scope.dimension = $scope.dimensionInst.get();
      $scope.groupInst = null;
      $scope.totalGroupInst = null;

    }

    if( $scope.isSpecial() ) {
      initSOMSpecial();
    } else {
      initDefault();
    }

    $scope.window.resetFn(function() {
      $scope.histogram.filterAll();
      $scope.window.handler().redrawAll();
    });

    $scope.resetButton = function(x) {
      $timeout(function() {
        $scope.window.resetButton(x);
      });
    };

    $scope.render = function() {
      // only render if the dashboard is visible
      if( $state.current.name === $scope.window.handler().getName() ) {
        $scope.computeExtent();
        $scope.histogram.render();
      }
    };

    // share information with the plot window
    $scope.window.headerText(['Histogram of', $scope.window.variables().name()]);

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
        $scope.dimensionService.getReducedGroupHistoDistributions($scope.groupInst, $scope.window.variables());
        $scope.reduced = $scope.groupInst.get();

        $scope.totalGroupInst = $scope.totalDimensionInst.group(function(d) {
          return Math.floor(d / $scope.binWidth) * $scope.binWidth;
        });
        // total
        $scope.primary.getReducedGroupHisto($scope.totalGroupInst);
        $scope.totalReduced = $scope.totalGroupInst.get();
      }
      else {
        $scope.dimensionService.getReducedGroupHisto($scope.groupInst);
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
      console.log("histogram extent is ", $scope.extent, "on windowHandler = ", $scope.window.handler().getName(), "variable = ", $scope.window.variables());
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

    $scope.getHeight = function(ele) {
      return _.max([ele.height() - GRID_WINDOW_PADDING, 150]);
    };

    $scope.getWidth = function(ele) {
      return _.max([ele.width(), 150]);
    };

})

.directive('plHistogram', function plHistogram(constants, $timeout, $rootScope, $injector, HISTOGRAM_WIDTH, HISTOGRAM_HEIGHT, HISTOGRAM_POOLING_COLOR, HISTOGRAM_SOM_TOTAL_COLOR, _, dc) {

    var createSVG = function($scope, config) {
      var _xBarWidth = 50;

      // collect charts here
      var charts = [];

      var resizeSVG = function(chart) {
        // var ratio = config.size.aspectRatio === 'stretch' ? 'none' : 'xMinYMin';
        chart.select("svg")
        .attr("viewBox", "0 0 " + [HISTOGRAM_WIDTH, HISTOGRAM_HEIGHT].join(" "))
        // .attr("viewBox", "0 0 " + [config.size.width, config.size.height].join(" ") )
        // .attr("preserveAspectRatio", ratio)
        .attr("preserveAspectRatio", "none")
        .attr("width", "100%")
        .attr("height", "100%");
          // don't redraw here, or it will form a feedback loop
      };

      var dcGroup = $scope.isSpecial() ? constants.groups.histogram.nonInteractive : constants.groups.histogram.interactive,
      range = $scope.isSpecial() ? [config.noBins*2, 18] : [config.noBins-5, 18],
      xUnitsScale = d3.scale.linear().domain([250, 900]).range(range).clamp(true);

      // 1. create composite chart
      $scope.histogram = dc.compositeChart(config.element[0], dcGroup)
      .dimension(config.dimension)
      .width( $scope.getWidth(config.element) )
      .height( $scope.getHeight(config.element) )
      // .transitionDuration(250)
      // .width(HISTOGRAM_WIDTH)
      // .height(HISTOGRAM_HEIGHT)
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
      .xUnits(function(low, high) {
        var width = $scope.getWidth($scope.element);
        return Math.round(xUnitsScale(width));
      })
      .margins({
        top: 15,
        right: 10,
        bottom: 30,
        left: 40
      })
      .xAxisLabel(config.xLabel)
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
            .variable($scope.window.variables())
            .windowid($scope.window.id())
            .payload(filter);

            $injector.get('FilterService').addFilter(filt);
          }
          $scope.resetButton(true);
          $injector.get('WindowHandler').reRenderVisible({ compute: true, action: 'filter:add', omit: 'histogram' });
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
          $injector.get('WindowHandler').reRenderVisible({ compute: true, action: 'filter:remove', omit: 'histogram' });
          $scope.resetButton(false);
        }

        custom.apply(this, arguments);
        return defaultFn.apply(this, arguments);
      })
      .resetFilterHandler(function(filters) {
        _.each(filters, function(filter) {
          $injector.get('FilterService').removeFilterByPayload(filter);
        });
        $injector.get('WindowHandler').reRenderVisible({ compute: true, action: 'filter:reset', omit: 'histogram' });
        $scope.resetButton(false);
        return [];
      })
      .renderlet( function(chart) {
        if( $scope.window.pooled() ) {
          d3.selectAll( $(config.element).find('rect.bar:not(.deselected)') )
          .attr("class", 'bar pooled')
          .attr("fill", HISTOGRAM_POOLING_COLOR);
        }
      });
      // .on("postRender", resizeSVG)
      // .on("postRedraw", resizeSVG);

      // set x axis format
      $scope.histogram
      .xAxis().ticks(7).tickFormat(constants.tickFormat);

      // set colors
      if ( $scope.window.pooled() ) {
        $scope.histogram.linearColors([HISTOGRAM_POOLING_COLOR]);
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
        .linearColors([HISTOGRAM_SOM_TOTAL_COLOR])
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

      function initDropdown() {
        var selector = _.template('#<%= id %> <%= element %>'),
        id = $scope.element.parent().attr('id');
        $scope.window.addDropdown({
          type: "export:svg",
          selector: selector({ id: id, element: 'svg' }),
          scope: $scope,
          source: 'svg',
          window: $scope.window
        });

        $scope.window.addDropdown({
          type: "export:png",
          scope: $scope,
          selector: selector({ id: id, element: 'svg' }),
          source: 'svg',
          window: $scope.window
        });

        $scope.window.addDropdown({
          type: "pooling",
          window: $scope.window
        });
      }

      $scope.element = ele;

      var config = {
        dimension: $scope.dimension,
        element: ele,
        xLabel: $scope.window.variables().axisLabel(),
        noBins: $scope.noBins,
        extent: $scope.extent,
        binWidth: $scope.binWidth,
        groups: $scope.groups,
        reduced: $scope.reduced,
        groupNames: $scope.groupNames,
        colorScale: $scope.colorScale,
        filter: $scope.filterOnSet,
        filterEnabled: $scope.window.extra().filterEnabled
      };

      $scope.element.ready(function() {
        $timeout(function() {
          createSVG($scope, config);
          initDropdown();
        });
      });

      $scope.deregisters = [];

      var somFilterAddedUnbind = $rootScope.$on('som:circle:add', function(event, filter) {
        function addChart() {
          var name = filter.id(),
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

        if(!$scope.isSpecial()) { return; }

        $scope.computeExtent();
        addChart();
        $scope.histogram.render();
      });

      var somFilterRemovedUnbind = $rootScope.$on('som:circle:remove', function(event, filter) {
        function removeChart() {
          var currentChildren = $scope.histogram.children(),
          name = filter.id(),
          chart = $scope.barCharts[name];

          _.remove(currentChildren, chart);
          $scope.histogram.compose(currentChildren);
        }
        if(!$scope.isSpecial()) { return; }

        $scope.computeExtent();
        removeChart();
        $scope.histogram.render();
      });

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

        if( $scope.isSpecial() ) { 
          // $scope.computeExtent();
          // $scope.histogram.render();
        } else {
          $scope.computeExtent();
          addChart();
          $scope.histogram.render();
        }
      });

      var derivedRemoveUnbind = $rootScope.$on('dataset:derived:remove', function(eve, set) {
        function removeChart() {
          var currentChildren = $scope.histogram.children(),
          name = set.name(),
          chart = $scope.barCharts[name];

          _.remove(currentChildren, chart);
          $scope.histogram.compose(currentChildren);
        }

        if( $scope.isSpecial() ) { 
          // $scope.computeExtent();
          // $scope.histogram.render();
        } else {
          $scope.computeExtent();
          removeChart();
          $scope.histogram.render();
        }
      });

      function renderWithNewDimensions() {
        function setSize() {
          $scope.size = angular.copy($scope.window.size()); 
        }

        var width = $scope.getWidth($scope.element),
        height = $scope.getHeight($scope.element);
        $scope.histogram.width(width);
        $scope.histogram.height(height);
        // currently buggy, use render instead of redraw
        $scope.histogram.render(); //.redraw();
        setSize();
      }

      function setResize() {
        function setSize() {
          $scope.size = angular.copy($scope.window.size()); 
        }

        var resizeUnbind = $scope.$on('gridster-item-transition-end', function(item) {
          function gridSizeSame() {
            return _.isEqual($scope.size, $scope.window.size());
          }
          if(!gridSizeSame()) {
            renderWithNewDimensions();
          }
        });

        setSize();
        $scope.deregisters.push(resizeUnbind);
      }

      setResize();

      function setResizeElement() {
        var renderThr = _.debounce(function() {
          renderWithNewDimensions();
        }, 150, { leading: false, trailing: true });

        var resizeUnbind = $scope.$on('gridster-resized', function(sizes, gridster) {
          var isVisible = _.contains($injector.get('WindowHandler').getVisible(), $scope.window.handler());
          if(!isVisible) { return; }
          renderThr();
        });
      }

      setResizeElement();

      var reRenderUnbind = $rootScope.$on('window-handler.rerender', function(event, winHandler, config) {
        if( winHandler == $scope.window.handler() ) {
          if( config.omit == 'histogram' ) { return; }
          $timeout( function() {
            if(config.compute) {
              $scope.render();

              if(!$scope.isSpecial()) {
                // var oldFilters = $scope.histogram.filters();
                // $scope.histogram.filter(null);
                // _.each(oldFilters, function(filter) {
                //   $scope.histogram.filter(filter);
                // });
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
        if( winHandler == $scope.window.handler() ) {
          $timeout( function() {
            $scope.histogram.redraw();
          });
        }
      });

      var gatherStateUnbind =  $rootScope.$on('UrlHandler:getState', function(event, callback) {
      });

      $scope.deregisters.push(reRenderUnbind, redrawUnbind, gatherStateUnbind, derivedAddUnbind, derivedRemoveUnbind, somFilterRemovedUnbind, somFilterAddedUnbind);

      $scope.$on('$destroy', function() {
        console.log("destroying histogram for", $scope.window.variables());
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
      restrict: 'C',
      controller: 'HistogramPlotController',
      link: {
        post: postLink
      }
    };

});