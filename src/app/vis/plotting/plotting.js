var visu = angular.module('plotter.vis.plotting', ['services.dimensions', 'services.dataset']);

// handles crossfilter.js dimensions/groupings and keeps them up-to-date
visu.service('PlotService', ['$injector', 'DimensionService', 'DatasetFactory',
  function($injector, DimensionService, DatasetFactory) {

    // var config = { dimension: sth, reducedGroup: sth, varX: sth, varY: sth, pooled: false|true };
    this.drawScatter = function(config) {
      // emit signal to create a new window:
      $rootScope = $injector.get('$rootScope');
      $rootScope.$emit('packery.add', config, 'scatterplot');
    };

    // var config = { dimension: sth, reducedGroup: sth, varX: sth, pooled: false|true };
    this.drawHistogram = function(config) {
      // emit signal to create a new window:
      $rootScope = $injector.get('$rootScope');
      $rootScope.$emit('packery.add', config, 'histogram');
    };

    this.drawHeatmap = function(config) {
      // emit signal to create a new window:
      console.log(config);
      $rootScope = $injector.get('$rootScope');
      $rootScope.$emit('packery.add', config, 'heatmap');
    };


  }
]);


visu.controller('HistogramPlotController', ['$scope', '$rootScope', 'DimensionService', 'DatasetFactory', 'constants',
  function HistogramPlotController($scope, $rootScope, DimensionService, DatasetFactory, constants) {

    $scope.dimension = DimensionService.getDimension($scope.window.variables);

    $scope.$onRootScope('histogram.redraw', function(event, dset, action) {
      $scope.computeExtent();
      $scope.histogram.x(d3.scale.linear().domain($scope.extent).range([0, $scope.noBins]));
      $scope.histogram.render();

    });

    $scope.headerText = $scope.window.variables.x;

    $scope.computeExtent = function() {
      // var allValues = $scope.dimension.group().all();
      // if( _.first( allValues ).key === constants.nanValue  ) {
      //   allValues = allValues.slice(1);
      // }
      // $scope.extent = d3.extent( allValues, function(d) { return d.key; } );
      var allValues = $scope.dimension.group().all().filter(function(d) {
        return d.value > 0 && d.key != constants.nanValue;
      });
      $scope.extent = d3.extent(allValues, function(d) {
        return d.key;
      });

      $scope.noBins = _.max([_.min([Math.floor($scope.dimension.group().all().length / 20), 50]), 20]);
      $scope.binWidth = ($scope.extent[1] - $scope.extent[0]) / $scope.noBins;
      $scope.group = $scope.dimension.group(function(d) {
        return Math.floor(d / $scope.binWidth) * $scope.binWidth;
      });

      $scope.reduced = DimensionService.getReducedGroupHisto($scope.group, $scope.window.variables.x);

      // update individual charts to the newest info about the bins
      _.each($scope.barCharts, function(chart, name) {
        chart.group($scope.filterOnSet($scope.reduced, name), name);
      });

      console.log("histogram extent is ", $scope.extent);
    };

    $scope.computeExtent();

    // individual charts that are part of the composite chart
    $scope.barCharts = {};

    $scope.datasetNames = DatasetFactory.getSetNames();
    $scope.colorScale = DatasetFactory.getColorScale();

    $scope.resetFilter = function() {
      $scope.histogram.filterAll();
      dc.redrawAll();
    };

    // $scope.toggleBrush = function() {
    //   $scope.histogram.brushOn( !$scope.histogram.brushOn() );
    //   $scope.histogram.render();
    // };

    // see https://github.com/dc-js/dc.js/wiki/FAQ#filter-the-data-before-its-charted
    // this used to filter to only the one set & limit out NaN's
    $scope.filterOnSet = function(group, name) {
      return {
        'all': function() {
          return group.all().filter(function(d) {
            return (d.value.counts[name] > 0) && (d.key >= constants.legalMinValue);
          });
        }
      };
    };

  }
]);

visu.directive('histogram', ['constants',

  function(constants) {

    var createSVG = function($scope, config) {
      // check css window rules before touching these
      var _width = 470;
      var _height = 345;
      var _xBarWidth = 50;
      var _poolingColor = 'black';

      // collect charts here
      var charts = [];

      //var tickFormat = d3.format(".2s");

      // 1. create composite chart
      $scope.histogram = dc.compositeChart(config.element[0])
        .dimension(config.dimension)
        .width(_width)
        .height(_height)
        .shareColors(true)
        .elasticY(true)
        .elasticX(false)
        .renderTitle(false)
        .title(function(d) {
          return 'Value: ' + constants.tickFormat(d.key) +
            "\n" +
            "Dataset: " + d.value.dataset +
            "\n" +
            "Count: " + d.value.counts[d.value.dataset];
        })
        .x(d3.scale.linear().domain(config.extent).range([0, config.noBins]))
        .xUnits(function() {
          return _xBarWidth;
        })
        .margins({
          top: 15,
          right: 10,
          bottom: 30,
          left: 40
        })
        .xAxisLabel(config.variableX)
        .on("filtered", function(chart, filter) {
          //console.log("filter trigger", chart, filter);
          $rootScope.$emit('scatterplot.redrawAll');
        });

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
      _.each(config.datasetNames, function(name, ind) {

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

      // 3. compose & render the composite chart
      $scope.histogram.compose(charts);
      $scope.histogram.render();

      // if pooling is in place, override global css opacity rules for these
      // stacks
      if (config.pooled) {
        d3.select($scope.histogram.g()[0][0])
          .selectAll("g.stack > rect.bar")
          .each(function(d) {
            d3.select(this).style('opacity', 1);
          });
      }

    };

    var linkFn = function($scope, ele, iAttrs) {
      var config = {
        dimension: $scope.dimension,
        element: ele,
        variableX: $scope.window.variables.x,
        noBins: $scope.noBins,
        extent: $scope.extent,
        binWidth: $scope.binWidth,
        groups: $scope.groups,
        reduced: $scope.reduced,
        datasetNames: $scope.datasetNames,
        colorScale: $scope.colorScale,
        pooled: $scope.window.variables.pooled || false,
        filter: $scope.filterOnSet
      };
      createSVG($scope, config);

    };
    linkFn.$inject = ['$scope', 'ele', 'iAttrs'];

    return {
      scope: false,
      restrict: 'C',
      require: '^?window',
      replace: true,
      controller: 'HistogramPlotController',
      transclude: true,
      link: linkFn
    };
  }
]);



visu.controller('ScatterPlotController', ['$scope', 'DatasetFactory', 'DimensionService', 'constants',
  function($scope, DatasetFactory, DimensionService, constants) {

    $scope.dimension = DimensionService.getXYDimension($scope.window.variables);

    $scope.resetFilter = function() {
      $scope.scatterplot.filterAll();
      dc.redrawAll();
    };

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


visu.controller('HeatmapController', ['$scope', 'DatasetFactory', 'DimensionService', 'constants',
  function($scope, DatasetFactory, DimensionService, constants) {

    $scope.resetFilter = function() {
      $scope.heatmap.filterAll();
      dc.redrawAll();
    };

    $scope.headerText = $scope.window.variables.x.length + " variables";

    $scope.drawHeatmap = function(element, dimension, group) {
      $scope.heatmap = dc.heatMap(element[0]);
      var width = 470;
      var height = 345;
      // var noRows = Math.floor( height / variables.length );
      // var noCols = Math.floor( width / variables.length );

      var colorScale = d3.scale.linear()
        .domain([-1, 0, 1])
        .range(['blue', 'white', 'red']);

      $scope.heatmap
        .width(width)
        .height(height)
        .margins({
          top: 15,
          right: 10,
          bottom: 30,
          left: 40
        })
        .dimension(dimension)
        .group(group)
        .keyAccessor(function(d) {
          return d.key[0];
        })
        .valueAccessor(function(d) {
          return d.key[1];
        })
        .title(function(d) {
          return "Horizontal variable:  " +
            d.key[0] + "\n" +
            "Vertical variable:  " +
            d.key[1] + "\n" +
            "Correlation:  " + constants.tickFormat(d.value);
        })
        .colorAccessor(function(d) {
          //console.log("color", d);
          return d.value;
        })
        .colors(colorScale);

      $scope.heatmap.render();
    };

    $scope.computeVariables = function() {
      // calculate coordinates
      var coordinates = [];

      // var test = [{ variables: { 'a': 1, 'b': 4}}, { variables: { 'a': 2, 'b': 5}}, { variables: { 'a': 3, 'b': 6}}];
      // var tmeanA = d3.mean( test, function(d) { return +d.variables['a']; } );
      // var tmeanB = d3.mean( test, function(d) { return +d.variables['b']; } );
      // var tstdA = stDeviation( test, tmeanA, 'a' );
      // var tstdB = stDeviation( test, tmeanB, 'b' );
      // var corr = sampleCorrelation( test, 'a', tmeanA, tstdA, 'b', tmeanB, tstdB );
      // console.log("testvars:", tmeanA, tmeanB, tstdA, tstdB, corr); // corr should be 1.0


      $scope.dimension = DimensionService.getSampleDimension();
      $scope.samples = $scope.dimension.top(Infinity);

      var variables = $scope.window.variables.x;
      var correlations = {};

      _.each(variables, function(varA, indX) {
        _.each(variables, function(varB, indY) {
          var coord = {
            x: varA,
            y: varB
          };
          if (varA == varB) {
            // diagonal -> always 1
            coord['corr'] = 1;
          } else if (indX > indY) {
            coordinates.push({
              x: varA,
              y: varB,
              corr: correlations[[varB, varA]]
            });
            return;
          } else {
            // compute mean and st. deviation for varA & varB
            var meanA = d3.mean($scope.samples, function(d) {
              return +d.variables[varA];
            });
            var stdA = stDeviation($scope.samples, meanA, varA);
            var meanB = d3.mean($scope.samples, function(d) {
              return +d.variables[varB];
            });
            var stdB = stDeviation($scope.samples, meanB, varB);
            // compute correlation
            coord['corr'] = sampleCorrelation($scope.samples, varA, meanA, stdA, varB, meanB, stdB);
            correlations[[varA, varB]] = coord['corr'];
          }
          coordinates.push(coord);
        });
      });

      // create a tiny crossfilt. instance for heatmap
      $scope.crossfilter = crossfilter(coordinates);
      $scope.coordDim = $scope.crossfilter.dimension(function(d) {
        return [d.x, d.y];
      });
      $scope.coordGroup = $scope.coordDim.group().reduceSum(function(d) {
        return d.corr;
      });
    };

    var stDeviation = function(array, mean, variable) {
      var dev = array.map(function(item) {
        var val = +item.variables[variable];
        return (val - mean) * (val - mean);
      });

      return Math.sqrt(dev.reduce(function(a, b) {
        return a + b;
      }) / (array.length - 1));
    };

    var sampleCorrelation = function(samples, varA, meanA, stdA, varB, meanB, stdB) {
      var val = 0;
      _.each(samples, function(samp) {
        var valA = +samp.variables[varA];
        var valB = +samp.variables[varB];
        if (_.isUndefined(valA) || _.isUndefined(valB)) {
          return;
        }
        val += (valA - meanA) * (valB - meanB);
      });
      return val / (stdA * stdB * (samples.length - 1));
    };

    $scope.computeVariables();
    $scope.drawHeatmap($scope.element, $scope.coordDim, $scope.coordGroup);


    $scope.$onRootScope('heatmap.redraw', function(event, dset, action) {

      $scope.computeVariables();

      // update the chart and redraw
      $scope.heatmap.dimension( $scope.dimension );
      $scope.heatmap.group( $scope.coordGroup );
      $scope.heatmap.render();

    });


  }
]);



visu.directive('heatmap', [

  function() {

    var linkFn = function($scope, ele, iAttrs) {
      $scope.element = ele;
    };

    return {
      scope: false,
      // scope: {},
      restrict: 'C',
      require: '^?window',
      replace: true,
      controller: 'HeatmapController',
      transclude: true,
      link: linkFn
    };
  }
]);