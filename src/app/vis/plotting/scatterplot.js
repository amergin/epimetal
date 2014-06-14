var visu = angular.module('plotter.vis.plotting.scatterplot', ['plotter.vis.plotting']);
visu.controller('ScatterPlotController', ['$scope', 'DatasetFactory', 'DimensionService', 'constants',
  function($scope, DatasetFactory, DimensionService, constants) {

    $scope.dimension = DimensionService.getXYDimension($scope.window.variables);

    $scope.resetFilter = function() {
      $scope.scatterplot.filterAll();
      //dc.redrawAll();
    };

    $scope.showResetBtn = false;

    $scope.headerText = $scope.window.variables.x + ", " + $scope.window.variables.y;

    var _calcCanvasAttributes = function() {
      $scope.reduced = DimensionService.getReduceScatterplot($scope.dimension.group());

      $scope.sets = DatasetFactory.activeSets();
      // min&max for all active datasets
      $scope.xExtent = d3.extent($scope.reduced.top(Infinity), function(d) {
        return d.key.x;
      });
      $scope.yExtent = d3.extent($scope.reduced.top(Infinity), function(d) {
        return d.key.y;
      });

      $scope.xRange = [$scope.margins[3], $scope.width - $scope.margins[1]];
      $scope.yRange = [$scope.height - $scope.margins[2], $scope.margins[0]];
      console.log("extents:", $scope.xExtent, $scope.yExtent);
    };

    $scope._createCanvas = function(set, zIndex) {
      var name = set.getName();
      var data = $scope.reduced.all().filter(function(d) {
        return d.value.dataset === name;
      });
      var color = $scope.window.variables.pooled ? 'black' : set.getColor();
      var canvas = $scope.createCanvas(
        $scope.element,
        $scope.width,
        $scope.height,
        $scope.margins,
        $scope.xExtent,
        $scope.yExtent,
        $scope.xRange,
        $scope.yRange,
        zIndex,
        $scope.window.variables.x,
        $scope.window.variables.y,
        data,
        //$scope.reduced.top(Infinity),
        name,
        color
      );
      $scope.canvases[set.getName()] = {
        'zindex': zIndex,
        'canvas': canvas
      };
    };

    $scope.redrawAll = function() {
      console.log("redraw scatter plot");
      _calcCanvasAttributes();

      _.each($scope.sets, function(set, ind) {
        $scope._createCanvas(set, ind);
      });

      // create the axes last and place them on top of other canvases
      var axesCanvas = $scope.createAxisCanvas(
        $scope.element,
        $scope.width,
        $scope.height,
        $scope.margins,
        $scope.xExtent,
        $scope.yExtent,
        $scope.xRange,
        $scope.yRange,
        100,
        $scope.window.variables.x,
        $scope.window.variables.y
      );
      $scope.canvases['axes'] = {
        'zindex': 100,
        'canvas': axesCanvas
      };
    };

    $scope.canvases = {};

    $scope.margins = [10, 10, 45, 55];
    $scope.width = 490;
    $scope.height = 345;
    $scope.zIndexCount = 0;
    _calcCanvasAttributes();


    $scope.$onRootScope('scatterplot.redraw', function(event, dset, action) {
      if (action === 'disabled') {
        $scope.disable(dset);
      } else if (action === 'enabled') {

        var canvas = $scope.canvases[dset.getName()];
        if (_.isUndefined(canvas)) {
          // new, not drawn before

          // refresh calculations
          _calcCanvasAttributes();
          // add canvas as 'layer'
          $scope._createCanvas(dset, ++$scope.zIndexCount);
        } else {
          $scope.enable(dset);
        }

      }
    });

    $scope.$onRootScope('scatterplot.redrawAll', function(event) {
      $scope.redrawAll();
    });



    $scope.disable = function(set) {
      var ctx = $scope.canvases[set.getName()].canvas;
      ctx.canvas.style.display = 'none';
    };

    $scope.enable = function(set) {
      var ctx = $scope.canvases[set.getName()].canvas;
      ctx.canvas.style.display = '';
    };


    $scope.createAxisCanvas = function(element, w, h, m, xExtent, yExtent, xRange, yRange, zIndex, varX, varY) {
      var xscale = d3.scale.linear(), // x scale
        yscale = d3.scale.linear(); // yscale

      var X_TICK_FORMAT = constants.tickFormat; //d3.format(".2s");
      var Y_TICK_FORMAT = constants.tickFormat; //d3.format(".2s");

      // create canvas element
      var c = document.createElement('canvas');
      c.setAttribute('id', 'axes');
      $(element).append(c);

      // adjust canvas size
      var canvas = d3.select(element[0]).select("#axes")
        .attr("width", w + "px")
        .attr("height", h + "px")
        .style('z-index', zIndex);

      // rendering context
      ctx = canvas[0][0].getContext('2d');
      // set opacity for the canvas
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      //ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.lineWidth = "1.5";

      console.log("extents:", xExtent, yExtent);

      // create scales
      xscale.domain(xExtent).range(xRange);
      yscale.domain(yExtent).range(yRange);

      addAxes();
      return ctx;

      function addAxes() {
        function drawLine(start, end) {
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
          ctx.font = "12px sans-serif";
          ctx.fillText(text, start.x, start.y);
          ctx.restore();
        }

        function addVerticalAxisTicks(origin) {
          function addTickText(coord, text) {
            ctx.fillStyle = "black";
            ctx.textBaseline = "middle";
            ctx.font = "9px sans-serif";
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
        addLabelText(varY, {
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
        addLabelText(varX, {
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

      // create canvas element
      var c = document.createElement('canvas');
      c.setAttribute('id', dataset);
      $(element).append(c);

      // adjust canvas size
      var canvas = d3.select(element[0]).select("#" + dataset) //'canvas')
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



  }

]);

visu.directive('scatterplot', [

  function() {

    var linkFn = function($scope, ele, iAttrs) {
      $scope.redrawAll();
    };

    return {
      scope: false,
      // scope: {},
      restrict: 'C',
      require: '^?window',
      replace: true,
      controller: 'ScatterPlotController',
      transclude: true,
      link: linkFn
    };
  }
]);