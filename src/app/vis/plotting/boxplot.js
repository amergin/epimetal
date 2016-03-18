angular.module('plotter.vis.plotting.boxplot', 
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

.controller('BoxplotController', function BoxplotController($scope,  $injector, $timeout, 
  DimensionService, DatasetFactory, FilterService,
  GRID_WINDOW_PADDING, constants, 
  d3, dc, _) {

  $scope.dimensionService = $scope.window.handler().getDimensionService();

  $scope.isSpecial = function() {
    return $scope.window.extra().somSpecial;
  };

  function getTotalCount() {
    return _.sum($scope.totalGroup.all(), function(d) { return d.value.valueOf(); });
  }

  function initDefault() {
    $scope.dimensionInst = $scope.dimensionService.getDatasetDimension();
    $scope.dimension = $scope.dimensionInst.get();
    $scope.groupInst = $scope.dimensionInst.groupDefault();
    $scope.dimensionService.getReducedBoxplot($scope.groupInst, $scope.window.variables());
    $scope.reduced = $scope.groupInst.get();

    $scope.colorScale = DatasetFactory.getColorScale();
  }

    if( $scope.isSpecial() ) {
    } else {
      initDefault();
    }

    $scope.window.resetFn(function() {
      // pass
    });

    // share information with the plot window
    $scope.window.headerText(['', $scope.window.variables().labelName(), '']);

    $scope.filterDefault = function(group) {
      return {
        'all': function() {
          var datasets = DatasetFactory.getSets();
          return group.all().filter(function(d) {
            return datasets[d.key].active();
          });
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
        // .x(d3.scale.linear().domain(config.extent))
        .renderLabel(true)
        .dimension(config.dimension)
        .group(config.reduced)
        //.group(config.filter(config.reduced))
        .valueAccessor(function(d) {
          return d.value.count;
        })
        .colors(config.colorScale.scale())
        .colorAccessor(function(d) {
          var type = d.value.type;
          if(type == 'circle') {
            return d.value.circle.name();
          } else {
            return '9';
          }
        })
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

      function plainchart() {
        $scope.chart = dc.boxPlot(config.element[0], config.chartGroup)
        // .gap(10)
        .margins({
          top: 25,
          right: 10,
          bottom: 20,
          left: 40
        })
        .yAxisLabel(config.variable.axisLabel())
        .elasticX(true)
        .elasticY(false)
        .width($scope.getWidth(config.element))
        .height($scope.getHeight(config.element))
        .renderLabel(true)
        .dimension(config.dimension)
        .colorAccessor(function(d) {
          return d.key.dataset;
        })
        .group(config.filter(config.reduced))
        // .keyAccessor(function(d) {
        //   return d.key;
        // })
        // .valueAccessor(function(d) {
        //   return d.value;
        // })
        .colors(config.colorScale.scale())
        .colorAccessor(function(d) {
          return config.colorScale.getAccessor(d.key);
        })
        .tickFormat(constants.tickFormat);
        // .on("postRender", resizeSVG)
        // .on("postRedraw", resizeSVG)

        $scope.chart.filter = function() {};

        $scope.chart.yAxis().tickFormat(constants.tickFormat);

      }

    plainchart();

  };

})

.directive('plBoxplot', function plBoxplot(constants, $timeout, $rootScope, $injector, CLASSED_BARCHART_SIZE, GRID_WINDOW_PADDING, _) {
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
        // extent: $scope.extent,
        filter: $scope.filterSOMSpecial,
        colorScale: $scope.colorScale,
        dimension: $scope.dimension,
        reduced: $scope.reduced,
        chartGroup: constants.groups.histogram.nonInteractive,
        variable: $scope.window.variables()
      };

    } else {
      config = {
        element: $scope.element,
        // extent: $scope.extent,
        filter: $scope.filterDefault,
        colorScale: $scope.colorScale,
        dimension: $scope.dimension,
        reduced: $scope.reduced,
        chartGroup: constants.groups.histogram.nonInteractive,
        variable: $scope.window.variables(),
        callback: $scope.initExistingFilters
      };
      drawFunction = $scope.drawDefault;
    }

    $scope.element.ready(function() {
      $timeout(function() {
        drawFunction(config);
        $scope.chart.render();
        if(config.callback) {
          config.callback($scope.chart);
        }
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
      $scope.chart.redraw();
      // $scope.chart.render();

      setSize();
    }

    function setRerender() {
      var reRenderUnbind = $rootScope.$on('window-handler.rerender', function(event, winHandler, config) {
        if( winHandler == $scope.window.handler() ) {

          $timeout(function() {
            if($scope.isSpecial()) {
              // $scope.chart.group($scope.filterSOMSpecial($scope.reduced));
            } else {
              // $scope.chart.group($scope.reduced);
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

    setResize();
    setRerender();
    setRedraw();
    setResizeElement();

    $scope.$on('$destroy', function() {
      console.log("destroying boxplot for", $scope.window.variables().name());
      _.each($scope.deregisters, function(unbindFn) {
        unbindFn();
      });

      // remove chart
      dc.deregisterChart($scope.chart, constants.groups.histogram.nonInteractive);
      $scope.chart.resetSvg();

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
    controller: 'BoxplotController',
    link: {
      post: postLink
    }
  };

});