angular.module('plotter.vis.plotting.classedbarchart', 
  [
  'ui.router',
  'services.dimensions',
  'services.dataset',
  'services.som',
  'services.window',
  'ext.d3',
  'ext.dc'  
  ])

.constant('CLASSED_BARCHART_SIZE', {
  height: 375,
  width: 450,
  aspectRatio: 'stretch'
})

.controller('ClassedBarChartPlotController', ['$scope', 'DimensionService', 'DatasetFactory', 'constants', '$injector', '$timeout', 'FilterService', 'GRID_WINDOW_PADDING', 'd3', 'dc',
  function ClassedBarChartPlotController($scope, DimensionService, DatasetFactory, constants, $injector, $timeout, FilterService, GRID_WINDOW_PADDING, d3, dc) {

    $scope.dimensionService = $scope.window.handler().getDimensionService();

    $scope.isSpecial = function() {
      return $scope.window.extra().somSpecial;
    };

    $scope.filterButton = function(x) {
      $timeout(function() {
        $scope.window.resetButton(x);
      });
    };

    $scope.$watch(function() {
      return FilterService.getFiltersByType('classed');
    }, function(newVal, oldVal) {
      if(newVal != oldVal) {
        if(newVal.length === 0) {
          $scope.window.resetButton(false);
        }
      }
    }, true);

    function initSOMSpecial() {
      $scope.primary = DimensionService.getPrimary();
      $scope.totalDimensionInst = $scope.primary.getDimension($scope.window.variables());
      $scope.totalDimension = $scope.totalDimensionInst.get();
      $scope.dimensionInst = $scope.dimensionService.getDimension($scope.window.variables());
      $scope.dimension = $scope.dimensionInst.get();
      $scope.groupInst = $scope.dimensionInst.groupDefault();

      $scope.dimensionService.getReducedGroupHistoDistributions($scope.groupInst, $scope.window.variables().x);
      $scope.reduced = $scope.groupInst.get();
      // total will always have largest count
      $scope.extent = [0, $scope.totalDimensionInst.groupAll().get().reduceCount().value()];

      $scope.colorScale = $injector.get('FilterService').getSOMFilterColors();
    }

    function initDefault() {
      $scope.dimensionInst = $scope.dimensionService.classHistogramDimension($scope.window.variables().x);
      $scope.dimension = $scope.dimensionInst.get();
      $scope.groupInst = $scope.dimensionInst.groupDefault();
      $scope.dimensionService.getReducedGroupHisto($scope.groupInst, $scope.window.variables().x);
      $scope.reduced = $scope.groupInst.get();
      $scope.extent = [0, d3.max($scope.dimension.group().all(), function(d) { return d.value; } )];

      $scope.colorScale = DatasetFactory.getColorScale();
    }

    if( $scope.isSpecial() ) {
      initSOMSpecial();
    } else {
      initDefault();
    }

    $scope.window.resetFn(function() {
      $scope.chart.filterAll();
      $injector.get('WindowHandler').reRenderVisible({ compute: true, omit: 'histogram' });
      $scope.filterButton(false);
    });

    // share information with the plot window
    $scope.window.headerText(['Histogram of', $scope.window.variables().x, '']);
    $scope.filterButton(false);

    // see https://github.com/dc-js/dc.js/wiki/FAQ#filter-the-data-before-its-charted
    // this used to filter to only the one set & limit out NaN's
    $scope.filterSOMSpecial = function(group) {
      var FilterService = $injector.get('FilterService'),
      info = DatasetFactory.getVariable($scope.window.variables().x);

      function getCircleLookup(grp) {
        var lookup = {};
        // for each bmu coordinate
        _.each(grp.value.counts, function(countObj, id) {
          if( id == 'total' ) { return; } // continue
          var circles = FilterService.inWhatCircles(countObj.bmu);

          // that may exist in many circle filters
          _.each(circles, function(circleId) {
            if( !lookup[circleId] ) { 
              lookup[circleId] = {
                count: 0,
                circle: FilterService.getSOMFilter(circleId)
              };
            }
            // add the amount info
            lookup[circleId].count = lookup[circleId].count + countObj.count;
          });

        });
        return lookup;
      }

      function getReturnObj(group, name, valObj) {
        return {
          key: {
            classed: group.key,
            name: info.unit[Number(group.key).toString()]
          }, 
          value: {
            type: 'circle',
            circle: valObj.circle,
            count: valObj.count
          }
        };
      }

      function getTotalObj() {
        return {
          key: {
            classed: NaN,
            name: 'Total'
          },
          value: {
            type: 'total',
            count: $scope.totalDimension.groupAll().value()
          }
        };
      }

      return {
        all: function() {
          var ret = [];

          _.chain(group.all())
          .reject(function(grp) { return grp.key < constants.legalMinValue; })
          .each(function(grp) {
            var lookup = getCircleLookup(grp);
            _.each(lookup, function(val, key, obj) {
              ret.push(getReturnObj(grp, key, val));
            });
          })
          .value();

          // add total
          ret.push(getTotalObj());

          return ret;  
        }
      };
    };

    $scope.filterDefault = function(group) {
      return {
        'all': function() {
            var legalGroups = group.all().filter(function(d) {
              return (d.value.counts[d.key.dataset] > 0) && (d.key.valueOf() !== constants.nanValue);
            }),
            info = DatasetFactory.getVariable($scope.window.variables().x),
            ret = [];

            _.each(legalGroups, function(group) {
              ret.push({
                key: _.extend(group.key, { name: info.unit[Number(group.key.classed).toString()] }),
                value: group.value
              });
            });
            return ret;
        }
      };
    };

    $scope.getHeight = function(ele) {
      return ele.height() - GRID_WINDOW_PADDING;
    };

    $scope.getWidth = function(ele) {
      return ele.width();
    };

    $scope.drawSOMSpecial = function(config) {
      var resizeSVG = function(chart) {
        var ratio = config.size.aspectRatio === 'stretch' ? 'none' : 'xMinYMin';
        chart.select("svg")
        .attr("viewBox", "0 0 " + [config.size.width, config.size.height].join(" ") )
        .attr("preserveAspectRatio", ratio)
        .attr("width", "100%")
        .attr("height", "100%");
      };

      var plainchart = function() {
        $scope.chart = dc.rowChart(config.element[0], config.chartGroup)
        .margins({
          top: 0,
          right: 20,
          bottom: 40,
          left: 20
        })
        .elasticX(true)
        .label(function(d) {
          var name = _.capitalize(d.key.name),
          arr = [name, ", count: ", d.value.count],
          label = d.value.type == 'total' ? undefined : " (circle " + d.value.circle.name() + ")";
          arr.push(label);
          return arr.join("");
        })
        .title(function(d) {
          var label = d.value.type == 'total' ? undefined : 'Circle: ' + d.value.circle.name(),
          arr = [label,
          'Category: ' + d.key.name,
          'Count: ' + d.value.count];
          return arr.join("\n");
        })
        .renderTitleLabel(false)
        .titleLabelOffsetX(5)
        .width($scope.getWidth(config.element))
        .height($scope.getHeight(config.element))
        // .width(config.size.width)
        // .height(config.size.height)
        .x(d3.scale.linear().domain(config.extent))
        .renderLabel(true)
        .dimension(config.dimension)
        .colorAccessor(function(d) {
          return d.value.type == 'total' ? 'total' : d.value.circle.id();
        })
        .group(config.filter(config.reduced))
        .valueAccessor(function(d) {
          return d.value.count;
        })
        .colors(config.colorScale)
        // .on("postRender", resizeSVG)
        // .on("postRedraw", resizeSVG)
        .ordering(function(d) {
          return d.value.type == 'total' ? 'total|' : d.value.circle.id() + "|" + d.key.name;
        });

        // disable filtering
        $scope.chart.onClick = function() {};

      };

      plainchart();

    };


    $scope.drawDefault = function(config) {
      var resizeSVG = function(chart) {
        var ratio = config.size.aspectRatio === 'stretch' ? 'none' : 'xMinYMin';
        chart.select("svg")
        .attr("viewBox", "0 0 " + [config.size.width, config.size.height].join(" ") )
        .attr("preserveAspectRatio", ratio)
        .attr("width", "100%")
        .attr("height", "100%");
      };

      var plainchart = function() {
        $scope.chart = dc.rowChart(config.element[0], config.chartGroup)
        // .gap(10)
        .margins({
          top: 0,
          right: 20,
          bottom: 40,
          left: 20
        })
        .elasticX(true)
        .label(function(d) {
          var name = _.capitalize(d.key.name);
          return [name, ", count: ", d.value.counts[d.key.dataset]].join("");
        })
        .title(function(d) {
          return ['Dataset: ' + d.key.dataset,
          'Category: ' + d.key.name
          ].join("\n");
        })
        .renderTitleLabel(false)
        .titleLabelOffsetX(5)
        .width($scope.getWidth(config.element))
        .height($scope.getHeight(config.element))
        // .width(config.size.width)
        // .height(config.size.height)
        .x(d3.scale.linear().domain(config.extent))
        .renderLabel(true)
        .dimension(config.dimension)
        .colorAccessor(function(d) {
          return d.key.dataset;
        })
        .group(config.filter(config.reduced))
        .valueAccessor(function(d) {
          return d.value.counts[d.key.dataset];
        })
        .colors(config.colorScale)
        // .on("postRender", resizeSVG)
        // .on("postRedraw", resizeSVG)
        .addFilterHandler(function(filters, filter) {
          function defaultFn(filters, filter) {
            filters.push(filter);
            return filters;
          }

          function custom(filters, filter) {
            $timeout(function() {
              var instance = new ClassedBarChartFilter()
              .chart($scope.chart)
              .variable($scope.window.variables().x)
              .windowid($scope.window.id())
              .payload(filter);

              $injector.get('FilterService').addFilter(instance);
              $injector.get('WindowHandler').reRenderVisible({ omit: 'histogram', compute: true });
              $scope.filterButton(true);
            });
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
            $timeout(function() {
              $injector.get('FilterService').removeFilterByPayload(filter);
              var hideButton = $scope.chart.filters().length === 0;
              if(hideButton) {
                $scope.filterButton(false);
              }
              $injector.get('WindowHandler').reRenderVisible({ omit: 'histogram', compute: true });
            });
          }

          custom.apply(this, arguments);
          return defaultFn.apply(this, arguments);
        })
        .resetFilterHandler(function(filters) {
          _.each(filters, function(filter) {
            $injector.get('FilterService').removeFilterByPayload(filter);
          });
          return [];
        });

      };

      plainchart();
    };



}])

.directive('plClassedBarChart', ['constants', '$timeout', '$rootScope', '$injector', 'CLASSED_BARCHART_SIZE', 'GRID_WINDOW_PADDING',

  function(constants, $timeout, $rootScope, $injector, CLASSED_BARCHART_SIZE, GRID_WINDOW_PADDING) {
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
          selector: selector({ id: id, element: 'svg' }),
          scope: $scope,
          source: 'svg',
          window: $scope.window
        });
      }

      $scope.element = ele;

      var drawFunction = null,
      config;

      if($scope.isSpecial()) {
        drawFunction = $scope.drawSOMSpecial;
        config = {
          element: $scope.element,
          size: CLASSED_BARCHART_SIZE,
          extent: $scope.extent,
          filter: $scope.filterSOMSpecial,
          colorScale: $scope.colorScale,
          dimension: $scope.dimension,
          reduced: $scope.reduced,
          chartGroup: constants.groups.histogram.nonInteractive,
          variable: $scope.window.variables().x
        };

      } else {
        config = {
          element: $scope.element,
          size: CLASSED_BARCHART_SIZE,
          extent: $scope.extent,
          filter: $scope.filterDefault,
          colorScale: $scope.colorScale,
          dimension: $scope.dimension,
          reduced: $scope.reduced,
          chartGroup: constants.groups.histogram.interactive,
          variable: $scope.window.variables().x
        };
        drawFunction = $scope.drawDefault;
      }

      $scope.element.ready(function() {
        $timeout(function() {
          drawFunction(config);
          $scope.chart.render();
          initDropdown();
        });
      });

      $scope.deregisters = [];

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

      function renderWithNewDimensions() {
        function setSize() {
          $scope.size = angular.copy($scope.window.size()); 
        }
        var width = $scope.getWidth($scope.element),
        height = $scope.getHeight($scope.element);

        $scope.chart.width(width);
        $scope.chart.height(height);
        $scope.chart.render();

        setSize();
      }

      function setRerender() {
        var reRenderUnbind = $rootScope.$on('window-handler.rerender', function(event, winHandler, config) {
          if( winHandler == $scope.window.handler() ) {

            $timeout(function() {
              if($scope.isSpecial()) {
                $scope.chart.group($scope.filterSOMSpecial($scope.reduced));
              } else {
                $scope.chart.group($scope.filterDefault($scope.reduced));
              }
              $scope.chart.redraw();
            });
          }
        });
        $scope.deregisters.push(reRenderUnbind);
      }

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

      function setRedraw() {
        var redrawUnbind = $rootScope.$on('window-handler.redraw', function(event, winHandler) {
          if( winHandler == $scope.window.handler() ) {
            $timeout( function() {
              $scope.chart.redraw();
            });
          }
        });
        $scope.deregisters.push(redrawUnbind);
      }

      function setState() {
        var gatherStateUnbind =  $rootScope.$on('UrlHandler:getState', function(event, callback) {
        });

        $scope.deregisters.push(gatherStateUnbind);
      }

      setResize();
      setRerender();
      setRedraw();
      setState();
      setResizeElement();

      $scope.$on('$destroy', function() {
        console.log("destroying histogram for", $scope.window.variables.x);
        _.each($scope.deregisters, function(unbindFn) {
          unbindFn();
        });

        $scope.groupInst.decrement();
        if($scope.isSpecial()) { 
          $scope.totalDimensionInst.decrement();
        }
        $scope.dimensionInst.decrement();
      });

      ele.on('$destroy', function() {
        $scope.$destroy();
      });

    }

    return {
      scope: false,
      restrict: 'C',
      controller: 'ClassedBarChartPlotController',
      link: {
        post: postLink
      }
    };

}]);