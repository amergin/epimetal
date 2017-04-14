angular.module('plotter.vis.plotting.heatmap', 
  [
  'ui.router',
  'services.dimensions',
  'services.variable',
  'services.correlation.ww',
  'services.tab',
  'ext.d3',
  'ext.dc',
  'ext.lodash'
  ])

.constant('HEATMAP_WIDTH', 420)
.constant('HEATMAP_HEIGHT', 350)
.constant('HEATMAP_COLORBAR_WIDTH', 60)
.constant('HEATMAP_UNDEFINED_COLOR', '#FFFFFF')
.constant('HEATMAP_STRETCH_COLOR_SCALE_THRESHOLD', 0.25)
.constant('HEATMAP_MARGINS', { 
  top: 0,
  right: 0,
  bottom: 60,
  left: 95
})

.controller('HeatmapController', function($scope, $log, constants, $injector, $timeout, CorrelationService, VariableService, 
  HEATMAP_UNDEFINED_COLOR, GRID_WINDOW_PADDING, 
  HEATMAP_COLORBAR_WIDTH, HEATMAP_STRETCH_COLOR_SCALE_THRESHOLD, d3, dc, _) {

  $scope.resetFilter = function() {
    $scope.heatmap.filterAll();
    dc.redrawAll(constants.groups.heatmap);
  };

  function initHeader() {
    var text;

    if($scope.window.extra().separate === true) {
      text = ['Correlation heatmap of', $scope.window.variables().length + " variables", "(" + $scope.window.extra().dataset.name() + ")"];
    } else {
      text = ['Correlation heatmap of', $scope.window.variables().length + " variables"];
    }
    $scope.window.headerText(text);
  }

  function initCrossfilter() {
    $scope.crossfilter = crossfilter([]);
    $scope.coordDim = $scope.crossfilter.dimension(function(d) {
      return _.extend(d, { 'valueOf': function() { return d.x + "|" + d.y; } });
    });
    $scope.coordGroup = $scope.coordDim.group().reduceSum(function(d) {
      return d.corr;
    });
  }

  function initColorScale() {
    $scope.window.extra()['colorScaleMode'] = 'stretch';

    $log.debug("Color scale mode is ", $scope.window.extra()['colorScaleMode']);

    $scope.colorScale = {
      stretch: {
        scale: new CustomScale()
        .lower(-1)
        .middle(0)
        .upper(1)
        .threshold(HEATMAP_STRETCH_COLOR_SCALE_THRESHOLD)
        .undefinedColor(HEATMAP_UNDEFINED_COLOR),

        calculator: function(d) {
          if($scope.isFiltered()) {
            if( !_.isUndefined(d.key.pvalue) && d.key.pvalue > $scope.limit ) {
              return d3.rgb('white');
            }
          }
          return $scope.colorScale.stretch.scale.color(d.key);
        },
          initial: null // override later
        },

        linear: {
          scale: d3.scale.linear()
          .domain([-1, 0, 1])
          .range(['blue', 'white', 'red']),

          accessor: function(d) {
            if($scope.isFiltered()) {
              if( !_.isUndefined(d.key.pvalue) && d.key.pvalue > $scope.limit ) {
                return 0;
              }
            }
            return d.value;
          },
          initial: null // override
        }
      };
    }

    initHeader();
    initColorScale();
    initCrossfilter();

    $scope.isFiltered = function() {
      return $scope.window.extra().filtered;
    };

    $scope.window.resetButton(false);

    $scope.format = d3.format('.2g');
    $scope.limitDisp = null;

    $scope.window.extra().filtered = false;

    $scope.$watch(function() {
      return $scope.window.extra().filtered;
    }, function(newVal, oldVal) {
      if( newVal != oldVal ) {
        $scope.updateHeader();
        $scope.heatmap.render();
      }
    });

  // $scope.variablesLookup = {};

  $scope.updateHeader = function() {
    var header = $scope.window.headerText(),
    contains = _.contains(header[header.length-1], 'p < ');
    if(contains) {
      header.splice(-1);
    }
    if($scope.isFiltered()) {
      header.push('p < ' + $scope.limitDisp);
    } else {
      //nothing
    }
    $scope.window.headerText(header);
  };

  function getVarGroupOrder(name) {
    return VariableService.getVariable(name).group().order;
  }

  function getVarNameOrder(name) {
    return VariableService.getVariable(name).nameOrder();
  }

  $scope.drawLegend = function(height, width) {
    function removeExisting(anchor) {
      anchor.select('svg').remove();
    }

    function drawLinear() {
      var linearScale = d3.scale.linear()
      .domain([-1, 0, 1])
      .range(['blue', 'white', 'red']);

      var svg = anchor
      .append('svg')
      .attr("viewBox", "0 0 " + width + " " + height)
      .attr("preserveAspectRatio", "xMaxYMid meet")
      .attr("width", "100%")
      .attr("height", "100%");

      svg
      .style('vertical-align', 'top')
      .style('padding-right', '10px');
      var g = svg.append("g")
      .attr("transform", "translate(10,10)")
      .classed("colorbar", true);

      var cb = colorBar()
      .color(linearScale)
      .size(height - 40)
      .lineWidth(width - 30)
      .precision(4);
      g.call(cb);
    }

    function drawStretch() {
      var linearScale = d3.scale.linear()
      .domain([-1, 0, 1])
      .range(['blue', 'white', 'red']);

      var correlationScale = $scope.colorScale.stretch.scale,
      corrLowerExtent = correlationScale.lowerExtent(),
      corrUpperExtent = correlationScale.upperExtent(),
      lowerThrColor = linearScale(-HEATMAP_STRETCH_COLOR_SCALE_THRESHOLD),
      upperThrColor = linearScale(HEATMAP_STRETCH_COLOR_SCALE_THRESHOLD);

      var colorbar = new PolylinearColorBar()
      .width(30)
      .height(height -100)
      .orient('vertical')
      .domain([corrLowerExtent.min, corrLowerExtent.max, 0, corrUpperExtent.min, corrUpperExtent.max])
      .range(['blue', lowerThrColor, 'white', upperThrColor, 'red']);

      colorbar.init(anchor);
    }

    var element = $scope.element,
    anchor = d3.select(element[0]).select('.heatmap-legend-anchor'),
    mode = $scope.window.extra().colorScaleMode;

    removeExisting(anchor);

    if(mode == 'linear') {
      drawLinear();
    }
    else if(mode == 'stretch') {
      drawStretch();
    }

  };

  $scope.drawHeatmap = function(element, baseElement, dimension, group, margins, colorBarWidth) {

    $scope.heatmap = dc.heatMap(element[0], constants.groups.heatmap);

    var width = $scope.getWidth(baseElement),
    height = $scope.getHeight(baseElement);

    function labelOrdering(a, b) {
      var grpA = getVarGroupOrder(a),
      grpB = getVarGroupOrder(b),
      varA = getVarNameOrder(a),
      varB = getVarNameOrder(b);
      return d3.descending( grpA * 10 + varA, grpB * 10 + varB);
    }

    $scope.heatmap
    .width(width)
    .height(height)
    // .width(null)
    // .height(null)
    .transitionDuration(0)
    .margins(margins)
    .turnOffControls()
    .dimension(dimension)
    .group(group)
    .xBorderRadius(0)
    .yBorderRadius(0)
    .keyAccessor(function(d) {
      return d.key.x;
    })
    .valueAccessor(function(d) {
      return d.key.y;
    })
    .rowsLabel(function(d) {
      return VariableService.getVariable(d).labelName();
    })
    .colsLabel(function(d) {
      return VariableService.getVariable(d).labelName();
    })
    .rowOrdering(function(a,b) {
      var grpA = getVarGroupOrder(a),
      grpB = getVarGroupOrder(b),
      varA = getVarNameOrder(a),
      varB = getVarNameOrder(b);
      return d3.descending( grpA * 100 + varA, grpB * 100 + varB);
    })
    .colOrdering(function(a,b) {
      var grpA = getVarGroupOrder(a),
      grpB = getVarGroupOrder(b),
      varA = getVarNameOrder(a),
      varB = getVarNameOrder(b);
      return d3.ascending( grpA * 100 + varA, grpB * 100 + varB);
    })
    .title(function(d) {
      return "Horizontal variable:  " +
      VariableService.getVariable(d.key.x).labelName() + "\n" +
      "Vertical variable:  " +
      VariableService.getVariable(d.key.y).labelName() + "\n" +
      "Correlation:  " + 
      constants.tickFormat(d.value) + "\n" + 
      "P-value:   " + 
      ( _(d.key.pvalue).isNaN() || _(d.key.pvalue).isUndefined() ? "(not available)" : $scope.format(d.key.pvalue) );
    })
    .renderlet(function(chart) {
        // rotate labels
        chart.selectAll('g.cols > text')
        .attr('transform', function(d) {
          var ele = d3.select(this);
          return 'rotate(-90,' + ele.attr('x') + "," + ele.attr('y') + ")";
        })
        .style("text-anchor", "end")
        .attr("dy", function(d) {
          return +d3.select(this).attr('dy') / 2;
        });
      })
    // .on('preRender', function(chart) {
    //     // try to hide flickering from renderlet
    //     chart.transitionDuration(0);
    //   })
    // .on('postRender', function(chart) {
    //   chart.transitionDuration(500);
    // })
    // override default click actions
    .xAxisOnClick( function() {} )
    .yAxisOnClick( function() {} )
    .boxOnClick( function(cell) {
      $timeout( function() {
        $injector.get('PlotService').drawScatter({
          variables: {
            x: VariableService.getVariable(cell.key.x),
            y: VariableService.getVariable(cell.key.y)
          }
        }, $scope.window.handler() );
      });
    });

    $scope.colorScale.stretch['initial'] = $scope.heatmap.getColor;
    $scope.colorScale.linear['initial'] = $scope.heatmap.colorAccessor;
    $scope.doStretch();
    $scope.heatmap.render();
    $timeout(function() {
      $scope.legend = $scope.drawLegend(height, colorBarWidth);
    }, 500);

  };

  $scope.computeVariables = function(callback) {
    var variables = _.map($scope.window.variables(), function(v) { return v.name(); });

    // get coordinates in a separate worker
    CorrelationService.compute( { 
      variables: variables, 
      separate: $scope.window.extra().separate, 
      dataset: $scope.window.extra().dataset 
    }, $scope.window )
    .then(function succFn(coordinates) {
      $scope.applyColorScale(coordinates);

      // compute Bonferroni correction
      var bonferroni = 0.5 * variables.length * (variables.length - 1);
      $scope.limit = 0.05 / bonferroni;
      $scope.limitDisp = $scope.format($scope.limit);
      $scope.window.modifyDropdown('correlation', 'limit', $scope.limitDisp, $scope.limitDisp);
      $scope.updateHeader();

      // create a tiny crossfilt. instance for heatmap. so tiny that it's outside of dimension
      // service reach.
      $scope.crossfilter.remove();
      $scope.crossfilter.add(coordinates);
      callback();
    }).finally(function() {
      // $scope.window.spin(false);
    });
  };

  $scope.applyColorScale = function(coordinates) {
    var mode = $scope.window.extra().colorScaleMode;

    if(mode == 'stretch') {
      $scope.colorScale.stretch.scale
      .coordinates(coordinates)
      .init();
    }
    else if(mode == 'linear') {
      // do nothing
    }
  };

  $scope.doLinear = function() {
    $scope.heatmap.colorCalculator($scope.colorScale.stretch.initial);
    $scope.heatmap.colors($scope.colorScale.linear.scale);
    $scope.heatmap.colorAccessor($scope.colorScale.linear.accessor);
    return 'linear';
  };

  $scope.doStretch = function() {
    $scope.heatmap.colorAccessor($scope.colorScale.linear.initial);
    $scope.heatmap.colorCalculator($scope.colorScale.stretch.calculator);
    return 'stretch';
  };

  var callback = function() {
    // update the chart and redraw
    $scope.heatmap.dimension($scope.coordDim);
    $scope.heatmap.group($scope.coordGroup);

    $scope.heatmap.render();
  };

  $scope.redraw = _.debounce(function() {
    $scope.computeVariables(callback);
  }, 0, { maxWait: 600, trailing: true });

  $scope.getHeight = function(ele) {
    return ele.parent().height() - GRID_WINDOW_PADDING;
  };

  $scope.getWidth = function(ele) {
    return ele.parent().width() - Math.ceil( 1.1 * HEATMAP_COLORBAR_WIDTH );
  };


})

.directive('plHeatmap', function($injector, $log, $rootScope, $timeout, DatasetFactory, VariableService, HEATMAP_MARGINS, HEATMAP_COLORBAR_WIDTH, _) {

  var linkFn = function($scope, ele, iAttrs) {

    function initDropdown() {
      var selector = _.template('#<%= id %> .<%= cls %> <%= element %>'),
      id = $scope.element.parent().attr('id');

      // empty the dropdown just in case
      $scope.window.dropdown([]);

      $scope.window.addDropdown({
        type: "correlation",
        limit: $scope.limitDisp,
        window: $scope.window
      });

      $scope.window.addDropdown({
        type: "colorscale",
        scope: $scope,
        callback: function() {
          var mode = $scope.window.extra().colorScaleMode;
          $scope.window.extra()['colorScaleMode'] = (mode == 'linear') ? $scope.doStretch() : $scope.doLinear();
          $log.debug("Color scale is now ", $scope.window.extra()['colorScaleMode']);
          $scope.heatmap.render();

          $scope.drawLegend($scope.getHeight($scope.element), HEATMAP_COLORBAR_WIDTH);
        }
      });

      $scope.window.addDropdown({
        type: "export:svg",
        selector: selector({ id: id, cls: 'heatmap-chart-anchor', element: 'svg' }),
        scope: $scope,
        source: 'svg',
        window: $scope.window
      });

      $scope.window.addDropdown({
        type: "export:png",
        selector: selector({ id: id, cls: 'heatmap-chart-anchor', element: 'svg' }),
        scope: $scope,
        source: 'svg',
        window: $scope.window
      });
    }

    $scope.element = ele;

    $scope.heatmapAnchor = d3.select(ele[0])
    .append('div')
    .attr('class', 'heatmap-chart-anchor')[0];


    $scope.colorbarAnchor = d3.select(ele[0])
    .append('div')
    .attr('class', 'heatmap-legend-anchor')[0][0];

    function draw() {
      $scope.drawHeatmap(
        $scope.heatmapAnchor,
        $scope.element,
        $scope.coordDim, 
        $scope.coordGroup,
        HEATMAP_MARGINS,
        HEATMAP_COLORBAR_WIDTH
        );
    }

      // do init if not done
      VariableService.getVariables().then(function(variables) {
        initDropdown();
        $scope.computeVariables(function() {
          draw();
        });        
      });

      $scope.deregisters = [];

      function renderWithNewDimensions() {
        function setSize() {
          $scope.size = angular.copy($scope.window.size()); 
        }

        $scope.heatmap.width($scope.getWidth($scope.element));
        $scope.heatmap.height($scope.getHeight($scope.element));
        $scope.heatmap.redraw();
        setSize();
      }

      function setResize() {
        function setSize() {
          $scope.size = angular.copy($scope.window.size()); 
        }

        function redrawLegend() {
          $scope.drawLegend($scope.getHeight($scope.element), HEATMAP_COLORBAR_WIDTH);
        }

        var resizeUnbind = $scope.$on('gridster-item-transition-end', function(item) {
          function gridSizeSame() {
            return _.isEqual($scope.size, $scope.window.size());
          }

          if(!gridSizeSame()) {
            renderWithNewDimensions();
          }

          redrawLegend();
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

      var reRenderUnbind =  $rootScope.$on('window-handler.rerender', function(event, winHandler, config) {
        function doRedraw() {
          $timeout( function() {
            if(config.compute) {
              $scope.redraw();
            }
            else {
              $scope.heatmap.render();
            }
          });
        }

        if( winHandler == $scope.window.handler() ) {
          var filtered = _.startsWith(config.action, 'filter');

          if($scope.window.extra().separate) {
            if(filtered) {
              doRedraw();
            }
          } else {
            doRedraw();
          }

        }
      });

      var redrawUnbind =  $rootScope.$on('window-handler.redraw', function(event, winHandler) {
        if( winHandler == $scope.window.handler() ) {
          $timeout( function() {
            $scope.heatmap.redraw();
          });
        }
      });

      $scope.deregisters.push(reRenderUnbind, redrawUnbind);

      $scope.$on('$destroy', function() {
        _.each($scope.deregisters, function(unbindFn) {
          unbindFn();
        });
        $scope.coordGroup.dispose();
        $scope.coordDim.dispose();
      });

      ele.on('$destroy', function() {
        $scope.$destroy();
      });

    };

    return {
      scope: false,
      restrict: 'C',
      replace: true,
      link: linkFn,
      controller: 'HeatmapController',
      transclude: true
    };

  });


function CustomScale() {
  var obj = {},
  priv = {
    coordinates: [],
    interpolated: {},
    lower: {
      min: null,
      max: null
    },
    upper: {
      min: null,
      max: null
    },
    constant: {
      lower: null,
      middle: null,
      upper: null,
      threshold: 0.3,
      undefinedColor: '#FFFFFF'
    }
  };

  function getName(coord, reverse) {
    if(reverse) {
      return [coord.y, coord.x].join("|");
    } else {
      return [coord.x, coord.y].join("|");
    }
  }

  function computeInterpolated() {
    var thre = priv.constant.threshold,
    correlation;
    _.each(priv.coordinates, function(coord) {
      correlation = coord.corr;
      if(correlation > 0) {
        if(priv.upper.min == priv.upper.max) {
          // only one number in the upper -> full color -> interp = 1
          priv.interpolated[getName(coord)] = 1;
        }
        else {
          priv.interpolated[getName(coord)] = (thre) + (1-thre) * ( correlation - priv.upper.min ) / (priv.upper.max - priv.upper.min);
        }
      } 
      else if(correlation < 0) {
        if(priv.upper.min == priv.upper.max) {
          // only one number in the lower -> full color -> interp = 0
          priv.interpolated[getName(coord)] = -1;
        } else {
          priv.interpolated[getName(coord)] = -(thre) + (1-thre) * ( correlation - priv.lower.max ) / (priv.lower.max - priv.lower.min);
        }
      }
    });
  }

  function computeMaxMin() {
    var lowerExtent = d3.extent(priv.coordinates, function(d) {
      if(d.corr > 0) { return undefined; }
      return d.corr;
    });
    var upperExtent = d3.extent(priv.coordinates, function(d) {
      if(d.corr < 0) { return undefined; }
      return d.corr;
    });

    priv.lower.min = _.isUndefined(lowerExtent[0]) ? priv.constant.lower : lowerExtent[0];
    priv.lower.max = _.isUndefined(lowerExtent[1]) ? priv.constant.upper : lowerExtent[1];
    priv.upper.min = upperExtent[0];
    priv.upper.max = upperExtent[1];

    console.log("Heatmap lower extent: [", priv.lower.min, priv.lower.max, "], upper extent: [", priv.upper.min, ",", priv.upper.max, "]");
  }

  obj.lower = function(x) {
    if(!arguments.length) { return priv.constant.lower; }
    priv.constant.lower = x;
    return obj;
  };

  obj.middle = function(x) {
    if(!arguments.length) { return priv.constant.middle; }
    priv.constant.middle = x;
    return obj;
  };

  obj.upper = function(x) {
    if(!arguments.length) { return priv.constant.upper; }
    priv.constant.upper = x;
    return obj;
  };

  obj.threshold = function(x) {
    if(!arguments.length) { return priv.constant.threshold; }
    priv.constant.threshold = x;
    return obj;
  };

  obj.undefinedColor = function(x) {
    if(!arguments.length) { return priv.constant.undefinedColor; }
    priv.constant.undefinedColor = x;
    return obj;
  };

  // get color value
  obj.color = function(obj) {
    function datumIsNaN() {
      return _.isNaN(obj.corr);
    }

    if(datumIsNaN()) { return priv.constant.undefinedColor; }

    var red, green, blue,
    interp = priv.interpolated[getName(obj)];
    interp = _.isUndefined(interp) ? priv.interpolated[getName(obj, true)] : interp;

    if(interp > 0) {
      // upper, red
      red = 255;
      green = 255 * (1 - interp);
      blue = 255 * (1 - interp);
    } else {
      // lower, blue
      red = 255 * (1 + interp);
      green = 255 * (1 + interp);
      blue = 255;
    }
    return d3.rgb(red, green, blue).toString();
  };

  obj.coordinates = function(x) {
    if(!arguments.length) { return priv.coordinates; }
    priv.coordinates = x;
    return obj;
  };

  obj.init = function() {
    computeMaxMin();
    computeInterpolated();
    return obj;    
  };

  // only get
  obj.lowerExtent = function() {
    return _.clone(priv.lower);
  };

  obj.upperExtent = function() {
    return _.clone(priv.upper);
  };

  return obj;
}