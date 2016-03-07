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

.controller('HistogramPlotController', function HistogramPlotController($scope, $rootScope, DatasetFactory, constants, $state, $injector, $timeout, $log, HISTOGRAM_POOLING_COLOR, GRID_WINDOW_PADDING, d3, dc, _) {

    $scope.isSpecial = function() {
      return $scope.window.extra().somSpecial || false;
    };

    // $scope.poolFigure = function poolFigure() {
    //   $log.info("Pooling requested");

    //   // empty composite chart contents
    //   $scope.histogram.resetSvg();

    //   var dcGroup = $scope.isSpecial() ? constants.groups.histogram.nonInteractive : constants.groups.histogram.interactive,
    //   element = $scope.element,
    //   colorScale = $scope.colorScale;

    //   // create a separate bar chart
    //   $scope.stacked = dc.barChart(element[0], dcGroup)
    //   .width( $scope.getWidth(element) )
    //   .height( $scope.getHeight(element) )
    //   .centerBar(true)
    //   .barPadding(0.15)
    //   .brushOn(true)
    //   .dimension($scope.dimension)
    //   .linearColors([HISTOGRAM_POOLING_COLOR])
    //   .x(d3.scale.linear().domain($scope.extent).range([0, $scope.noBins]))
    //   .elasticY(true)
    //   .elasticX(false)
    //   .renderTitle(false)
    //   .xUnits(function(low, high) {
    //     var width = $scope.getWidth(element);
    //     return Math.round($scope.xUnitsScale(width));
    //   })
    //   .margins({
    //     top: 15,
    //     right: 10,
    //     bottom: 30,
    //     left: 40
    //   })
    //   .xAxisLabel($scope.window.variables().axisLabel())
    //   .addFilterHandler(function(filters, filter) {
    //     function defaultFn(filters, filter) {
    //       filters.push(filter);
    //       console.log("filters after appending = ", filters);
    //       return filters;
    //     }

    //     function custom(filters, filter) {
    //       // adding a filter may be actually shifting it to another position
    //       var current = _.find($injector.get('FilterService').getFilters(), function(filt) {
    //         return filt.type() == 'range' && filt.chart() == $scope.histogram;
    //       });

    //       console.log("current = ", current);

    //       if(current) {
    //         // shifted
    //         console.log("shifted", current);
    //         current.payload(filter);
    //       } else {
    //         // new
    //         var filt = new HistogramFilter()
    //         .chart($scope.histogram)
    //         .variable($scope.window.variables())
    //         .windowid($scope.window.id())
    //         .payload(filter);

    //         var added = $injector.get('FilterService').addFilter(filt);
    //         console.log("new filter", added, filt);
    //       }
    //       $scope.resetButton(true);
    //       $injector.get('WindowHandler').reRenderVisible({ compute: true, action: 'filter:add', omit: 'histogram' });
    //     }

    //     console.log("called addFilter, ", filters.length, arguments);
    //     custom.apply(this, arguments);
    //     return defaultFn.apply(this, arguments);
    //   })
    //   .removeFilterHandler(function(filters, filter) {
    //     function defaultFn(filters, filter) {
    //       for (var i = 0; i < filters.length; i++) {
    //         if (filters[i] <= filter && filters[i] >= filter) {
    //           filters.splice(i, 1);
    //           break;
    //         }
    //       }
    //       return filters;
    //     }

    //     function custom(filters, filter) {
    //       $injector.get('FilterService').removeFilter(filt);
    //       $injector.get('WindowHandler').reRenderVisible({ compute: true, action: 'filter:remove', omit: 'histogram' });
    //       $scope.resetButton(false);
    //     }

    //     console.log("removeFilterHandler called", arguments);
    //     custom.apply(this, arguments);
    //     return defaultFn.apply(this, arguments);
    //   })
    //   .resetFilterHandler(function(filters) {
    //     console.log("resetFilterHandler called", arguments);
    //     _.each(filters, function(filter) {
    //       $injector.get('FilterService').removeFilterByPayload(filter);
    //     });
    //     $injector.get('WindowHandler').reRenderVisible({ compute: true, action: 'filter:reset', omit: 'histogram' });
    //     $scope.resetButton(false);
    //     return [];
    //   })
    //   // .on('renderlet', function(chart) {
    //   //   if( $scope.window.pooled() ) {
    //   //     d3.selectAll( $(config.element).find('rect.bar:not(.deselected)') )
    //   //     .attr("class", 'bar pooled')
    //   //     .attr("fill", HISTOGRAM_POOLING_COLOR);
    //   //   }
    //   // })
    //   .on('preRedraw', function(chart) {
    //     chart.rescale();
    //   })
    //   .on('preRender', function(chart) {
    //     chart.rescale();
    //   });

    //   // set x axis format
    //   $scope.stacked
    //   .xAxis()
    //   .ticks(7)
    //   .tickFormat(constants.tickFormat);


    //   var first = true;

    //   _.each($scope.groups, function(instance, groupName) {
    //       var name = instance.name(),
    //       valueAccessor = instance.type() == 'circle' ? instance.id() : instance.name(),
    //       filteredGroup = $scope.filterOnSet($scope.reduced, name, true);

    //       if(first) {
    //         // first stack must be group
    //         $scope.stacked
    //         .group(filteredGroup, name)
    //         // and it must have an accessor
    //         .valueAccessor(function(d) {
    //           return d.value.counts[groupName];
    //         });

    //         first = false;
    //       } else {
    //         $scope.stacked.stack(filteredGroup, name, function(d) {
    //           return d.value.counts[groupName];
    //         });
    //       }

    //   });

    //   $scope.stacked.render();
    // };

    $scope.renderFigure = function() {
      $scope.updateChartSize($scope.histogram);
      $scope.histogram.render();
      // if($scope.window.pooled()) {
      //   if(!$scope.stacked) {
      //     $scope.poolFigure();
      //   } else {
      //     $scope.updateChartSize($scope.stacked);
      //     $scope.stacked.render();
      //   }
      // } else {
      //   $scope.updateChartSize($scope.histogram);
      //   $scope.histogram.render();        
      // }
    };

    $scope.updateChartSize = function updateSize(chart) {
      var width = $scope.getWidth($scope.element),
      height = $scope.getHeight($scope.element);
      chart.width(width);
      chart.height(height);
    };

    $scope.redrawFigure = function() {
      var chart;
      if($scope.window.pooled()) {
        chart = $scope.stacked;
      } else {
        chart = $scope.histogram;
      }
      $scope.updateChartSize(chart);
      chart.redraw();
    };


    $scope.$watch(function() {
      return $scope.window.pooled();
    }, function(newVal, oldVal) {
      if( newVal !== oldVal) {
        if(newVal) {
          $scope.updateChartSize($scope.stacked);
          $scope.stacked.render();
          // if(!$scope.stacked) {
          //   $scope.poolFigure();
          // } else {
          //   $scope.updateChartSize($scope.stacked);
          //   $scope.stacked.render();
          // }
        } else {
          $scope.updateChartSize($scope.histogram);
          $scope.histogram.render();
        }
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

    $scope.initExistingFilters = function(chart) {
      // query from the service if filters have been applied to this win before init:
      // e.g. have the page been loaded from state.
      var existing = _.filter($injector.get('FilterService').getFilters(), function(filter) {
        var exists = filter.type() !== 'circle' && filter.windowid() == $scope.window.id();
        if(exists) {
          console.log("exists", exists);
          filter.chart(chart);
        }
        return exists;
      });

      if(existing.length) {
        chart.filter(existing[0].payload());
      }
    };

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
      if( _.startsWith($state.current.name, $scope.window.handler().getName()) ) {
        $scope.computeExtent();
        $scope.histogram.render();
      }
    };

    // share information with the plot window
    $scope.window.headerText(['Histogram of', $scope.window.variables().labelName()]);

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

      $scope.noBins = _.max([_.min([Math.floor($scope.dimension.groupAll().value() / 20), 50]), 20]);
      $scope.binWidth = ($scope.extent[1] - $scope.extent[0]) / $scope.noBins;
      $scope.groupInst = $scope.dimensionInst.group(function(d) {
        return Math.floor(d / $scope.binWidth) * $scope.binWidth;
      });

      // these depend on bin size -> need to be updated whenever bin is touched
      var range = $scope.isSpecial() ? [$scope.noBins*2, 18] : [$scope.noBins-5, 18];
      $scope.xUnitsScale = d3.scale.linear().domain([250, 900]).range(range).clamp(true);      

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
      $scope.groups = $injector.get('FilterService').getSOMFilters();
      $scope.colorScale = $injector.get('FilterService').getSOMColorScale();

    } else {
      $scope.groups = DatasetFactory.getSets();
      $scope.colorScale = DatasetFactory.getColorScale();      
    }

    // see https://github.com/dc-js/dc.js/wiki/FAQ#filter-the-data-before-its-charted
    // this used to filter to only the one set & limit out NaN's
    $scope.filterOnSet = function(group, name, pooled) {
      return {
        'all': function() {
          if( $scope.isSpecial() && name != 'total' ) {
            var ret = _.chain(group.all())
            .reject(function(grp) { return grp.key == constants.nanValue; })
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
            .reject(function(grp) { 
              if(pooled === true) {
                return false;
              } else {
                return grp.value.counts[name] === 0;
              }
            })
            .value();

            return ret;
          } else {
            // normal histograms or total
            return group.all().filter(function(d) {
              var notNaN = (Math.ceil(d.key) != constants.nanValue);
              if(pooled === true) {
                return notNaN && (d.value.counts[name] >= 0);
              } else {
                return notNaN && (d.value.counts[name] > 0);
              }
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

.directive('plHistogram', function plHistogram(constants, $timeout, $rootScope, $injector, 
  HISTOGRAM_WIDTH, HISTOGRAM_HEIGHT, HISTOGRAM_POOLING_COLOR, HISTOGRAM_SOM_TOTAL_COLOR, 
  DatasetFactory,
  _, dc) {

    function createSVG($scope, config) {
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

      var dcGroup = $scope.isSpecial() ? constants.groups.histogram.nonInteractive : constants.groups.histogram.interactive;

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
        return Math.round($scope.xUnitsScale(width));
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
          console.log("filters after appending = ", filters);
          return filters;
        }

        function custom(filters, filter) {
          // adding a filter may be actually shifting it to another position
          var current = _.find($injector.get('FilterService').getFilters(), function(filt) {
            return filt.type() == 'range' && filt.chart() == $scope.histogram;
          });

          console.log("current = ", current);

          if(current) {
            // shifted
            console.log("shifted", current);
            current.payload(filter);
          } else {
            // new
            var filt = new HistogramFilter()
            .chart($scope.histogram)
            .variable($scope.window.variables())
            .windowid($scope.window.id())
            .payload(filter);

            var added = $injector.get('FilterService').addFilter(filt);
            console.log("new filter", added, filt);
          }
          $scope.resetButton(true);
          $injector.get('WindowHandler').reRenderVisible({ compute: true, action: 'filter:add', omit: 'histogram' });
        }

        console.log("called addFilter, ", filters.length, arguments);
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

        console.log("removeFilterHandler called", arguments);
        custom.apply(this, arguments);
        return defaultFn.apply(this, arguments);
      })
      .resetFilterHandler(function(filters) {
        console.log("resetFilterHandler called", arguments);
        _.each(filters, function(filter) {
          $injector.get('FilterService').removeFilterByPayload(filter);
        });
        $injector.get('WindowHandler').reRenderVisible({ compute: true, action: 'filter:reset', omit: 'histogram' });
        $scope.resetButton(false);
        return [];
      })
      // .on('renderlet', function(chart) {
      //   if( $scope.window.pooled() ) {
      //     d3.selectAll( $(config.element).find('rect.bar:not(.deselected)') )
      //     .attr("class", 'bar pooled')
      //     .attr("fill", HISTOGRAM_POOLING_COLOR);
      //   }
      // })
      .on('preRedraw', function(chart) {
        chart.rescale();
      })
      .on('preRender', function(chart) {
        chart.rescale();
      });

      // set x axis format
      $scope.histogram
      .xAxis().ticks(7).tickFormat(constants.tickFormat);

      // set colors
      // if ( $scope.window.pooled() ) {
      //   $scope.histogram.linearColors([HISTOGRAM_POOLING_COLOR]);
      // } else {
      //   $scope.histogram.colors(config.colorScale.scale());
      // }
      $scope.histogram.colors(config.colorScale.scale());

      // 2. for each of the additional stacks, create a child chart
      _.each(config.groups, function(instance, ind) {

        var name = instance.name(),
        valueAccessor = instance.type() == 'circle' ? instance.id() : instance.name(); 

        var chart = dc.barChart($scope.histogram)
        .centerBar(true)
        .barPadding(0.15)
        .brushOn(true)
        .dimension(config.dimension)
        .group(config.filter(config.reduced, name), name)
        .valueAccessor(function(d) { // is y direction
          return d.value.counts[valueAccessor];
        })
        .colorAccessor(function(d) {
          return config.colorScale.getAccessor(name);
        });

        /* chart.getColor = function(d) {
          console.log("d", d);
          return DatasetFactory.getSet(name).color();
        }; */


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
        .colorAccessor(function(d) {
          return 9;
        })
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
      config.callback($scope.histogram);
      $scope.histogram.render();


    }

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

        // $scope.window.addDropdown({
        //   type: "pooling",
        //   window: $scope.window
        // });
      }

      $scope.element = ele;

      var config = {
        dimension: $scope.dimension,
        element: ele,
        xLabel: $scope.window.variables().axisLabel(),
        noBins: $scope.noBins,
        extent: $scope.extent,
        binWidth: $scope.binWidth,
        reduced: $scope.reduced,
        groups: $scope.groups,
        colorScale: $scope.colorScale,
        filter: $scope.filterOnSet,
        filterEnabled: $scope.window.extra().filterEnabled,
        callback: $scope.initExistingFilters
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
          var chart = dc.barChart($scope.histogram)
          .centerBar(true)
          .barPadding(0.15)
          .brushOn(true)
          .dimension($scope.dimension)
          .group($scope.filterOnSet($scope.reduced, filter.id()), filter.name())
          .valueAccessor(function(d) { // is y direction
            return d.value.counts[filter.id()];
          })
          .colorAccessor(function(d) {
            return $scope.colorScale.getAccessor(filter.name());
          }),
          currentChildren = $scope.histogram.children();

          $scope.barCharts[filter.name()] = chart;
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
          name = filter.name(),
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
        function addNormalChart() {
          var name = set.name(),
          chart = dc.barChart($scope.histogram)
          .centerBar(true)
          .barPadding(0.15)
          .brushOn(true)
          .dimension($scope.dimension)
          .group($scope.filterOnSet($scope.reduced, name), name)
          .valueAccessor(function(d) { // is y direction
            return d.value.counts[name];
          })
          .colorAccessor(function(d) {
            return config.colorScale.getAccessor(name);
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
          // if($scope.window.pooled()) {
          //   $scope.poolFigure();
          // } else {
          //   addNormalChart();
          // }
          addNormalChart();
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
        var chart = $scope.histogram;
        // var chart = $scope.window.pooled() ? $scope.stacked : $scope.histogram;

        chart.width(width);
        chart.height(height);
        chart.render();

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
              if(!$scope.isSpecial()) {
                $scope.computeExtent();
                $scope.renderFigure();
              }
            }
            else {
              $scope.redrawFigure();
            }
          });
        }
      });

      var redrawUnbind = $rootScope.$on('window-handler.redraw', function(event, winHandler) {
        if( winHandler == $scope.window.handler() ) {
          $timeout( function() {
            $scope.redrawFigure();
          });
        }
      });

      $scope.deregisters.push(reRenderUnbind, redrawUnbind, derivedAddUnbind, derivedRemoveUnbind, somFilterRemovedUnbind, somFilterAddedUnbind);

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