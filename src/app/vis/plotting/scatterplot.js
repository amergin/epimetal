angular.module('plotter.vis.plotting.scatterplot', [
  'services.dimensions',
  'services.dataset',
  'ext.d3',
  'ext.lodash'
])

.constant('SCATTERPLOT_POOLING_COLOR', 'black')

.controller('ScatterPlotController', function ScatterPlotController($scope, 
  DatasetFactory, DimensionService, 
  constants, SCATTERPLOT_POOLING_COLOR, GRID_WINDOW_PADDING, 
  d3, _) {

  $scope.dimensionService = $scope.window.handler().getDimensionService();
  $scope.dimensionInst = $scope.dimensionService.getXYDimension(
    $scope.window.variables().x, 
    $scope.window.variables().y
  );
  $scope.dimension = $scope.dimensionInst.get();

  $scope.initGroup = function() {
    if ($scope.groupInst) {
      $scope.groupInst.decrement();
    }
    $scope.groupInst = $scope.dimensionService.getReduceScatterplot($scope.dimensionInst.groupDefault());
    $scope.group = $scope.groupInst.get();
  };

  $scope.initGroup();

  $scope.window.headerText(['Scatter plot of', $scope.window.variables().x.labelName() + ", " + $scope.window.variables().y.labelName()]);
  $scope.window.resetButton(false);

  $scope._calcCanvasAttributes = function() {
    $scope.sets = DatasetFactory.activeSets();
    // min&max for all active datasets
    $scope.xExtent = d3.extent($scope.group.top(Infinity), function(d) {
          var x = d.key.x,
          notNaN = (x !== constants.nanValue),
          hasCount = _.chain(d.value.counts)
          .values()
          .some()
          .value();

          if(notNaN && hasCount) {
            return x;
          } else {
            return null;
          }
    });

    $scope.yExtent = d3.extent($scope.group.top(Infinity), function(d) {
          var y = d.key.y,
          notNaN = (y !== constants.nanValue),
          hasCount = _.chain(d.value.counts)
          .values()
          .some()
          .value();

          if(notNaN && hasCount) {
            return y;
          } else {
            return null;
          }
    });

    $scope.xRange = [$scope.margins[3], $scope.width - $scope.margins[1]];
    $scope.yRange = [$scope.height - $scope.margins[2], $scope.margins[0]];
    console.log("extents:", $scope.xExtent, $scope.yExtent);
  };

  $scope._createCanvas = function(set, zIndex) {

    // spaces to underscores
    var name = set.name();
    var data = $scope.group.all().filter(function(d) {
      return (d.value.counts[name] > 0) && d.key.valueOf() !== constants.nanValue;
    });
    var color = $scope.window.pooled() ? SCATTERPLOT_POOLING_COLOR : set.color();
    var canvas = $scope.createCanvas(
      // $scope.element,
      $scope.wrapper,
      $scope.width,
      $scope.height,
      $scope.margins,
      $scope.xExtent,
      $scope.yExtent,
      $scope.xRange,
      $scope.yRange,
      zIndex,
      $scope.window.variables().x.labelName(),
      $scope.window.variables().y.labelName(),
      data,
      name,
      color
    );
    $scope.canvases[set.name()] = {
      'zindex': zIndex,
      'canvas': canvas
    };
  };

  $scope.removeCanvas = function(stored) {
    $(stored.canvas.canvas).remove();
  };

  $scope.$watch(function() {
    return $scope.window.pooled();
  }, function() {
    $scope.redrawAll();
  });

  $scope.redrawAll = function() {
    console.log("redraw scatter plot");
    $scope._calcCanvasAttributes();

    _.each($scope.canvases, function(canvas, name) {
      $scope.removeCanvas(canvas);
    });

    if (!_.isUndefined($scope.canvases['axes'])) {
      // delete old axes canvas, if any
      $scope.removeCanvas($scope.canvases['axes']);
    }

    $scope.canvases = {};

    _.each($scope.sets, function(set, ind) {
      $scope._createCanvas(set, ++$scope.zIndexCount);
    });

    // create the axes last and place them on top of other canvases
    var axesCanvas = $scope.createAxisCanvas(
      $scope.wrapper,
      $scope.width,
      $scope.height,
      $scope.margins,
      $scope.xExtent,
      $scope.yExtent,
      $scope.xRange,
      $scope.yRange,
      100,
      $scope.window.variables().x,
      $scope.window.variables().y
    );
    $scope.canvases['axes'] = {
      'zindex': 100,
      'canvas': axesCanvas
    };
  };

  $scope.canvases = {};

  // margins = top, right, bottom, left
  $scope.margins = [10, 10, 45, 55];
  $scope.zIndexCount = 1;

  $scope.disable = function(set) {
    var ctx = $scope.canvases[set.name()].canvas;
    ctx.canvas.style.display = 'none';
  };

  $scope.enable = function(set) {
    var ctx = $scope.canvases[set.name()].canvas;
    ctx.canvas.style.display = '';
  };


  $scope.createAxisCanvas = function(element, w, h, m, xExtent, yExtent, xRange, yRange, zIndex, varX, varY) {
    function drawLine(start, end) {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.lineWidth = "1.0";
      ctx.strokeStyle = "black";
      ctx.stroke();
    }

    function addLabelText(text, start, trans, rotate, align) {
      ctx.textAlign = "center";
      ctx.textBaseline = align;
      ctx.save();
      ctx.translate(trans.x, trans.y);
      ctx.rotate(rotate);
      ctx.fillStyle = "black";
      ctx.font = "11px sans-serif";
      ctx.fillText(text, start.x, start.y);
      ctx.restore();
    }

    var xscale = d3.scale.linear(), // x scale
      yscale = d3.scale.linear(); // yscale

    var X_TICK_FORMAT = constants.tickFormat;
    var Y_TICK_FORMAT = constants.tickFormat;

    var varXLabel = varX.axisLabel(),
    varYLabel = varY.axisLabel();

    // create canvas element
    var c = document.createElement('canvas');
    c.setAttribute('id', 'axes');
    $(element).append(c);

    // adjust canvas size
    var canvas = d3.select(element[0]).select("#axes")
      .attr("width", w + "px")
      .attr("height", h + "px")
      .style('z-index', zIndex);

    canvas[0][0].width = w;
    canvas[0][0].height = h;

    // rendering context
    var ctx = canvas[0][0].getContext('2d');
    // set opacity for the canvas
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    //ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.lineWidth = "1.5";

    console.log("extents:", xExtent, yExtent);

    // create scales
    xscale.domain(xExtent).range(xRange);
    yscale.domain(yExtent).range(yRange);

    addAxes();
    addRegressionLine();
    return ctx;

    function addRegressionLine() {
      function mapData() {
        var samples = $scope.dimension.top(Infinity),
        data = _.chain(samples)
        .filter(function(d) {
          var xVal = d.variables[varX.id],
          yVal = d.variables[varY.id];
          return (!isNaN(+xVal) && !isNaN(+yVal)) && 
          (xVal !== constants.nanValue && yVal !== constants.nanValue);
        })
        .map(function(d) {
          return [d.variables[varX.id], d.variables[varY.id]];
        })
        .value();

        return data;
      }

      function point(coord) {
        return {
          x: xscale(coord[0]), y: yscale(coord[1])
        };
      }

      var data = mapData();

      if(!data.length) { return; }

      var regressionLine = regression('linear', data);

      if(!regressionLine.equation.length) { return; }

      var y1 = regressionLine.equation[0] * xExtent[0] + regressionLine.equation[1],
      y2 = regressionLine.equation[0] * xExtent[1] + regressionLine.equation[1],
      clippedY1 = (y1 < yExtent[0]) ? yExtent[0] : y1,
      clippedY2 = (y2 > yExtent[1]) ? yExtent[1] : y2,
      startPoint = point([xExtent[0], clippedY1]),
      endPoint = point([xExtent[1], clippedY2]),
      label = regressionLine.string;

      drawLine(startPoint, endPoint);

      addLabelText(label,
        { x: 0, y: 0},
        { x: w - m[3] - m[1] - 10, y: m[0] }, 
        0, 'middle');
    }

    function addAxes() {
      function addVerticalAxisTicks(origin) {
        function addTickText(coord, text) {
          ctx.fillStyle = "black";
          ctx.textBaseline = "middle";
          ctx.font = "11px sans-serif";
          ctx.fillText(text, coord.x, coord.y);
        }


        var NUM_VERTICAL_TICKS = 8;
        var TICK_WIDTH = 5;
        var TICK_TEXT_SPACING = 12;
        var VERTICAL_TICK_SPACING = (yRange[0] - yRange[1]) / NUM_VERTICAL_TICKS;

        for (var i = 1; i <= NUM_VERTICAL_TICKS; ++i) {
          ctx.beginPath();
          ctx.moveTo(origin.x - TICK_WIDTH / 2, origin.y - i * VERTICAL_TICK_SPACING);
          ctx.lineTo(origin.x + TICK_WIDTH / 2, origin.y - i * VERTICAL_TICK_SPACING);
          ctx.stroke();
          addTickText({
              x: origin.x - TICK_WIDTH / 2 - TICK_TEXT_SPACING,
              y: origin.y - i * VERTICAL_TICK_SPACING
            },
            Y_TICK_FORMAT(yscale.invert(origin.y - i * VERTICAL_TICK_SPACING))
          );
        }
      }

      function addHorizontalAxisTicks(origin) {
        function addTickText(coord, text) {
          ctx.fillStyle = "black";
          ctx.font = "9px sans-serif";
          ctx.fillText(text, coord.x, coord.y);
        }

        var NUM_HORIZONTAL_TICKS = 7;
        var TICK_WIDTH = 5;
        var HORIZONTAL_TICK_SPACING = (xRange[1] - xRange[0]) / NUM_HORIZONTAL_TICKS;
        var TICK_TEXT_SPACING = 8;

        for (var i = 1; i <= NUM_HORIZONTAL_TICKS; ++i) {
          ctx.beginPath();
          ctx.moveTo(origin.x + i * HORIZONTAL_TICK_SPACING, origin.y - TICK_WIDTH / 2);
          ctx.lineTo(origin.x + i * HORIZONTAL_TICK_SPACING, origin.y + TICK_WIDTH / 2);
          ctx.stroke();
          addTickText({
              x: origin.x + i * HORIZONTAL_TICK_SPACING,
              y: origin.y - TICK_WIDTH / 2 + TICK_TEXT_SPACING
            },
            X_TICK_FORMAT(xscale.invert(origin.x + i * HORIZONTAL_TICK_SPACING))
          );
        }
      }

      var origin = {
        x: d3.round(0.9 * m[3]),
        y: h - d3.round(0.9 * m[2])
      };

      // draw y axis / label / ticks
      drawLine({
        x: origin.x,
        y: d3.round(0.75 * m[0])
      }, {
        x: origin.x,
        y: origin.y
      });
      addLabelText(varYLabel, {
        x: 0,
        y: 0
      }, {
        x: d3.round(m[3] / 2) - 8,
        y: (h - d3.round(m[0] / 2) - d3.round(m[2] / 2)) / 2
      }, -Math.PI / 2, "bottom");
      addVerticalAxisTicks(origin);

      // x axis / label / ticks
      drawLine({
          x: origin.x,
          y: origin.y
        }, //h - d3.round(0.75 * m[2])}, 
        {
          x: w - d3.round(0.5 * m[1]),
          y: origin.y
        } //y: h - d3.round(0.75 * m[2])}
      );
      addLabelText(varXLabel, {
          x: 0,
          y: 4
        }, {
          x: (w - d3.round(m[1] / 2) - d3.round(m[3] / 2)) / 2,
          y: h - d3.round(m[2] / 2)
        },
        0, "top");
      addHorizontalAxisTicks(origin);
    }
  };

  $scope.createCanvas = function(element, w, h, m, xExtent,
    yExtent, xRange, yRange, zIndex, varX,
    varY, data, dataset, datasetColor) {
    // top-right-bottom-left
    var last = [], // last [x,y,color] pairs
      xscale = d3.scale.linear(), // x scale
      yscale = d3.scale.linear(); // yscale

    // sanitize name and use it as an id
    var identifier = dataset.replace(/\s/g, '_');

    // create canvas element
    var c = document.createElement('canvas');
    c.setAttribute('id', "ds" + identifier);
    $(element).append(c);



    // adjust canvas size
    var canvas = d3.select(element[0]).select("#" + "ds" + identifier)
      .attr("width", w + "px")
      .attr("height", h + "px")
      .style('z-index', zIndex);

    // rendering context
    ctx = canvas[0][0].getContext('2d');
    // set opacity for the canvas
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    //ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.lineWidth = "1.5";

    // create scales
    xscale.domain(xExtent).range(xRange);
    yscale.domain(yExtent).range(yRange);

    // render initial data points
    last = data.map(position);
    // add circle points for this dataset grouping
    last.forEach(circle);
    return ctx;

    // clear canvas
    function clear() {
      ctx.clearRect(0, 0, w, h);
    }

    // from data point, return [x,y,color]
    function position(d) {
      var x = xscale(d.key.x);
      var y = yscale(d.key.y);

      // what to do if there are NaN's:
      if (_.isUndefined(x) || _.isUndefined(y)) {
        return [];
      }
      return [x, y, datasetColor];
    }

    // render circle [x,y,color]
    function circle(pos) {
      if (_.isEmpty(pos)) {
        return;
      }

      ctx.fillStyle = pos[2];
      ctx.beginPath();
      ctx.arc(pos[0], pos[1], 2, 0, 2 * Math.PI);
      //ctx.stroke();
      ctx.fill();
    }
  };


  $scope.getHeight = function(ele) {
    return ele.height() - GRID_WINDOW_PADDING - 10;
  };

  $scope.getWidth = function(ele) {
    return ele.width();
  };

})

.directive('plScatterplot', function plScatterplot($timeout, $rootScope, NotifyService, $injector) {

  var linkFn = function($scope, ele, iAttrs) {
    $scope.element = ele;

    var wrapper = angular.element('<div/>').addClass('pl-scatterplot-wrapper');
    $scope.element.append(wrapper);
    $scope.wrapper = wrapper;

    function initDropdown() {
      var selector = _.template('#<%= id %> .<%= cl %>'),
        id = $scope.element.parent().attr('id');
      $scope.window.addDropdown({
        type: "export:png",
        selector: selector({
          id: id,
          cl: 'pl-scatterplot-wrapper'
        }),
        scope: $scope,
        source: 'canvas',
        window: $scope.window
      });

      $scope.window.addDropdown({
        type: "pooling",
        window: $scope.window
      });
    }

    $scope.element.ready(function() {
      $timeout(function() {
        $scope.width = $scope.getWidth($scope.element);
        $scope.height = $scope.getHeight($scope.element);
        $scope.redrawAll();
        initDropdown();
      });
    });

    NotifyService.addTransient('Scatter plot added',
      'Scatter plot for ' + '(' + $scope.window.variables().x.labelName() + ", " + $scope.window.variables().y.labelName() + ') has been added',
      'success');

    $scope.deregisters = [];

    var derivedAddUnbind = $rootScope.$on('dataset:derived:add', function(eve, set) {
      $scope.initGroup();
    });

    var derivedRemoveUnbind = $rootScope.$on('dataset:derived:remove', function(eve, set) {
      $scope.removeCanvas($scope.canvases[set.name()]);
      $scope.initGroup();
    });

    function renderWithNewDimensions() {
      function setSize() {
        $scope.size = angular.copy($scope.window.size());
      }

      $scope.width = $scope.getWidth($scope.element);
      $scope.height = $scope.getHeight($scope.element);
      if (!_($scope.canvases).isEmpty()) {
        $scope.redrawAll();
      }
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
        if (!gridSizeSame()) {
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
      }, 150, {
        leading: false,
        trailing: true
      });

      var resizeUnbind = $scope.$on('gridster-resized', function(sizes, gridster) {
        var isVisible = _.contains($injector.get('WindowHandler').getVisible(), $scope.window.handler());
        if (!isVisible) {
          return;
        }
        renderThr();
      });
    }

    setResizeElement();

    var redrawUnbind = $rootScope.$on('window-handler.redraw', function(event, winHandler) {
      if (winHandler == $scope.window.handler()) {
        //   $timeout( function() {
        //   // nothing to do
        // });
      }
    });

    var reRenderUnbind = $rootScope.$on('window-handler.rerender', function(event, winHandler, config) {
      if (winHandler == $scope.window.handler()) {
        $timeout(function() {
          var action = config.action,
            dset = config.dset,
            compute = config.compute;

          if (action == 'filter:add' || action == 'filter:reset' || compute) {
            $scope.redrawAll();
          } else if (action == 'dataset:disabled') {
            $scope.disable(dset);
          } else if (action == 'dataset:enabled') {
            var canvas = $scope.canvases[dset.name()];
            if (_.isUndefined(canvas)) {
              // new, not drawn before

              // refresh calculations
              $scope._calcCanvasAttributes();
              // add canvas as 'layer'
              $scope._createCanvas(dset, ++$scope.zIndexCount);
            } else {
              $scope.enable(dset);
            }
          }
        });
      }
    });

    $scope.deregisters.push(reRenderUnbind, redrawUnbind, derivedAddUnbind, derivedRemoveUnbind);

    $scope.$on('$destroy', function() {
      _.each($scope.deregisters, function(unbindFn) {
        unbindFn();
      });

      $scope.groupInst.decrement();
      $scope.dimensionInst.decrement();
    });

    ele.on('$destroy', function() {
      $scope.$destroy();
    });

  };

  return {
    restrict: 'C',
    require: '^?window',
    replace: true,
    controller: 'ScatterPlotController',
    transclude: true,
    link: linkFn
  };

});