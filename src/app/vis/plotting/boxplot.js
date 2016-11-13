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

  function initSOMSpecial() {
    $scope.primary = $injector.get('DimensionService').getPrimary();
    $scope.totalDimensionInst = $scope.primary.getDimension($scope.window.variables());
    $scope.totalDimension = $scope.totalDimensionInst.get();
    $scope.dimensionInst = $scope.dimensionService.getSOMDimension($scope.window.variables());
    $scope.dimension = $scope.dimensionInst.get();

    $scope.colorScale = $injector.get('FilterService').getSOMColorScale();

    $scope.groupInst = $scope.dimensionInst.groupDefault();
    $scope.dimensionService.getReducedBoxplotBMU($scope.groupInst, $scope.window.variables());
    $scope.reduced = $scope.groupInst.get();
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
      initSOMSpecial();
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

    $scope.filterSOM = function(group) {
      return {
        'all': function() {
          var lookup = {},
          isInsideFilter = false,
          id;
          _.each(group.all(), function(grp) {
            _.forEach(FilterService.getSOMFilters(), function(filter) {
              id = filter.name();
              isInsideFilter = filter.contains(grp.key);
              if(isInsideFilter) {
                if(!lookup[id]) { lookup[id] = []; }
                lookup[id] = lookup[id].concat(grp.value.values);
              }
            });
          });

          return _.map(lookup, function(array, name) {
            return {
              'key': name,
              'value': array
            };
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

      function plainchart() {
        $scope.chart = dc.boxPlot(config.element[0], config.chartGroup)
        .margins({
          top: 25,
          right: 10,
          bottom: 20,
          left: 40
        })
        .yAxisLabel(config.variable.axisLabel())
        .elasticX(true)
        .elasticY(true)
        .yAxisPadding('15%')
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
        .margins({
          top: 25,
          right: 10,
          bottom: 20,
          left: 40
        })
        .yAxisLabel(config.variable.axisLabel())
        .elasticX(true)
        .elasticY(true)
        .yAxisPadding('10%')
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
        filter: $scope.filterSOM,
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
      // $scope.chart.redraw();
      $scope.chart.render();

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

    function setGridRedraw() {
      var redrawUnbind = $rootScope.$on('grid-window.redraw', function(event, gridWindow) {
        if(gridWindow === $scope.window) {
          $timeout(function() {
            $scope.chart.height($scope.getHeight($scope.element));
            $scope.chart.width($scope.getWidth($scope.element));
            $scope.chart.redraw();
          });
        }
      });
      $scope.deregisters.push(redrawUnbind);
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

    function setDerivedAdd() {
      var derivedAddUnbind = $rootScope.$on('dataset:derived:add', function(eve, set) {
        $scope.chart.render();
      });

      $scope.deregisters.push(derivedAddUnbind);
    }

    function setDerivedRemove() {
      var derivedRemoveUnbind = $rootScope.$on('dataset:derived:remove', function(eve, set) {
        $scope.chart.render();
      });

      $scope.deregisters.push(derivedRemoveUnbind);
    }

    setResize();
    setRerender();
    setRedraw();
    setGridRedraw();
    setResizeElement();
    setDerivedAdd();
    setDerivedRemove();

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