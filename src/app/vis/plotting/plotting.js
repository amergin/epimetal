var visu = angular.module('plotter.vis.plotting', ['services.dimensions']);


// handles crossfilter.js dimensions/groupings and keeps them up-to-date
visu.service('PlotService', ['$injector', 'DimensionService',
  function($injector, DimensionService) {

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

  }
]);


visu.controller('HistogramPlotController', ['$scope', '$rootScope', 'DimensionService', 'DatasetFactory',
  function HistogramPlotController($scope, $rootScope, DimensionService, DatasetFactory) {

    $scope.dimension = DimensionService.getDimension($scope.window.variables);

    $scope.extent = d3.extent($scope.dimension.group().all(), function(sample) {
      return sample.key;
    });
    $scope.noBins = _.max([_.min([Math.floor($scope.dimension.group().all().length / 20), 50]), 20]);
    $scope.binWidth = ($scope.extent[1] - $scope.extent[0]) / $scope.noBins;
    $scope.group = $scope.dimension.group(function(d) {
      return Math.floor(d / $scope.binWidth) * $scope.binWidth;
    });
    $scope.reduced = DimensionService.getReducedGroupHisto($scope.group, $scope.window.variables.x);
    $scope.datasetNames = DatasetFactory.getSetNames();
    $scope.colorScale = DatasetFactory.getColorScale();

    $scope.resetFilter = function() {
      $scope.histogram.filterAll();
      dc.redrawAll();
    };

  }
]);

visu.directive('histogram', [

  function() {

    // var config = { dimension: sth, bins: sth, binWidth: sth, reducedGroup: sth, datasetNames: sth, colorScale: sth, pooled: true|false }
    var createSVG = function($scope, config) {
      // check css window rules before touching these
      var _width = 470;
      var _height = 345;
      var _xBarWidth = 50;
      var _poolingColor = 'black';

      // collect charts here
      var charts = [];

      // 1. create composite chart
      $scope.histogram = dc.compositeChart(config.element[0])
        .width(_width)
        .height(_height)
        .title("test")
        .shareColors(true)
        .brushOn(true)
        .mouseZoomable(true)
        .elasticY(true)
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
        .xAxisLabel(config.variableX);

      // set x axis format
      $scope.histogram
        .xAxis().ticks(7).tickFormat(d3.format(".2s"));

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
          .dimension(config.dimension)
          .group(config.reducedGroup, name)
        // .data( function(group) { 
        //   return group.top(5);
        //   // return group.all().filter( function(kv) { 
        //   //   // drop the 0-group == NaN from plot
        //   //   ++window._counter;
        //   //   console.log("kv=", kv);
        //   //   return true;
        //   //   //return kv.key > 0 || true;
        //   // });
        // })
        // .keyAccessor( function(d) {
        //   if( name !== d.value.dataset ) { 
        //     return undefined; 
        //   }
        //   return d.key;
        // })
        .valueAccessor(function(d) { // is y direction
          // if( name !== d.value.dataset ) { 
          //   return 0; 
          // }
          return d.value.counts[name];
        });

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
        bins: $scope.noBins,
        extent: $scope.extent,
        binWidth: $scope.binWidth,
        reducedGroup: $scope.reduced,
        datasetNames: $scope.datasetNames,
        colorScale: $scope.colorScale,
        pooled: $scope.window.variables.pooled || false
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



visu.controller('ScatterPlotController', ['$scope', 'DatasetFactory', 'DimensionService',
  function($scope, DatasetFactory, DimensionService) {

    $scope.dimension = DimensionService.getXYDimension($scope.window.variables);
    $scope.reduced = DimensionService.getReduceScatterplot($scope.dimension.group());
    $scope.datasetNames = DatasetFactory.getSetNames();
    $scope.xExtent = d3.extent($scope.reduced.top(Infinity), function(d) {
      return d.key.x;
    });
    $scope.colorScale = DatasetFactory.getColorScale();

    $scope.resetFilter = function() {
      $scope.scatterplot.filterAll();
      dc.redrawAll();
    };

    $scope.canvases = {};


  }
]);



visu.directive('scatterplot', [

  function() {

    var createSVG = function($scope, config) {

      // check css window rules before touching these
      var _width = 470;
      var _height = 345;
      var _poolingColor = 'black';

      // collect charts here
      var charts = [];


      // 1. create composite chart
      $scope.scatterplot = dc.compositeChart(config.element[0])
        .width(_width)
        .height(_height)
        .brushOn(true)
        .x(d3.scale.linear().domain(config.xExtent))
        .colors(d3.scale.category20())
        .shareColors(true)
        .xAxisLabel(config.variableX)
        .yAxisLabel(config.variableY)
        .brushOn(false)
        .elasticY(true)
        .margins({
          top: 15,
          right: 10,
          bottom: 45,
          left: 50
        });


      // set x axis format
      $scope.scatterplot
        .xAxis().ticks(7).tickFormat(d3.format(".2s"));

      // set colors
      if (config.pooled) {
        $scope.scatterplot.linearColors([_poolingColor]);
      } else {
        $scope.scatterplot.colors(config.colorScale);
      }


      // 2. for each of the additional stacks, create a child chart
      _.each(config.datasetNames, function(name, ind) {

        var chart = dc.scatterPlot($scope.scatterplot)
          .dimension(config.dimension)
          .group(config.reducedGroup, name)
          .symbol(d3.svg.symbol().type('circle'))
          .symbolSize(2)
          .highlightedSize(4)
          .brushOn(false)
          .data(function(group) {
            return group.all().filter(function(d) {
              return !_.isUndefined(d.value.dataset);
            });
          })
          .valueAccessor(function(d) {
            if (_.isUndefined(d.value.dataset)) {
              return 0;
            }
            return d.value.counts[name];
          })
          .keyAccessor(function(d) {
            //if( _.isUndefined( d.value.dataset ) ) { return null; }
            return d.key.x;
          })
          .valueAccessor(function(d) {
            //if( _.isUndefined( d.value.dataset ) ) { return null; }      
            return d.key.y;
          });

        charts.push(chart);
      });

      // 3. compose & render the composite chart
      $scope.scatterplot.compose(charts);
      $scope.scatterplot.render();

    }; // createSVG


    var createCanvas = function(element, zIndex, varX, varY, data, dataset, datasetColor, $scope) {

      // select svg canvas
      // top-right-bottom-left
      var m = [10, 10, 45, 65], // margins
        w = 490, // width
        h = 345, // height
        dimensions = [], // quantitative dimensions
        //xcol = 0, // active x column
        //ycol = 1, // active y column
        last = [], // last [x,y,color] pairs

        //transition_count = 0, // used to cancel old transitions
        xscale = d3.scale.linear(), // x scale
        yscale = d3.scale.linear(); // yscale

      var X_TICK_FORMAT = d3.format(".2s");
      var Y_TICK_FORMAT = d3.format(".2s");


      // create canvas element
      var c = document.createElement('canvas');
      c.setAttribute('id', 'chart');
      $(element).append(c);

      // adjust canvas size
      var canvas = d3.select( element[0] ).select('canvas')
        .attr("width", w + "px")
        .attr("height", h + "px")
        .style('z-index', zIndex);

      // rendering context
      ctx = canvas[0][0].getContext('2d');
      // set opacity for the canvas
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      //ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.lineWidth = "1.5";

      // extents for each dimension
      var xExtent = d3.extent(data, function(d) {
        return d.key.x;
      });

      var yExtent = d3.extent(data, function(d) {
        return d.key.y;
      });

      var xRange = [m[3], w - m[1]];
      var yRange = [h - m[2], m[0]];
      console.log("extents:", xExtent, yExtent);

      // create scales
      xscale.domain(xExtent).range(xRange);
      yscale.domain(yExtent).range(yRange);
      var yscale2 = d3.scale.linear().domain(yExtent).range([ yRange[1], yRange[0] ]);

      addLegends();

      // render initial data points
      last = data.map(position);
      // add circle points for this dataset grouping
      last.forEach(circle);

      // clear canvas
      function clear() {
        ctx.clearRect(0, 0, w, h);
      }

      function addLegends() {
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
          ctx.translate( trans.x, trans.y );
          ctx.rotate(rotate);
          ctx.fillStyle = "black";
          ctx.font = "12px sans-serif";
          ctx.fillText(text, start.x, start.y);
          ctx.restore();
        }

        function addVerticalAxisTicks(origin) {
            function addTickText(coord, text) {
              ctx.fillStyle = "black";
              ctx.font = "9px sans-serif";
              ctx.fillText(text, coord.x, coord.y);
            }


            var NUM_VERTICAL_TICKS = 8;
            var TICK_WIDTH = 5;
            var TICK_TEXT_SPACING = 12;
            var VERTICAL_TICK_SPACING = (yRange[0] - yRange[1]) / NUM_VERTICAL_TICKS;

            for (var i=1; i <= NUM_VERTICAL_TICKS; ++i) {
              ctx.beginPath();
              ctx.moveTo(origin.x - TICK_WIDTH/2, origin.y - i * VERTICAL_TICK_SPACING);
              ctx.lineTo(origin.x + TICK_WIDTH/2, origin.y - i * VERTICAL_TICK_SPACING);
              ctx.stroke();
              addTickText(
                { x : origin.x - TICK_WIDTH/2 - TICK_TEXT_SPACING, 
                  y: origin.y - i * VERTICAL_TICK_SPACING },
                  Y_TICK_FORMAT( yscale.invert( origin.y - i * VERTICAL_TICK_SPACING ) )
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

            for (var i=1; i <= NUM_HORIZONTAL_TICKS; ++i) {
              ctx.beginPath();
              ctx.moveTo(origin.x + i * HORIZONTAL_TICK_SPACING, origin.y - TICK_WIDTH/2);
              ctx.lineTo(origin.x + i * HORIZONTAL_TICK_SPACING, origin.y + TICK_WIDTH/2);
              ctx.stroke();          
              addTickText(
                { x : origin.x + i * HORIZONTAL_TICK_SPACING,
                  y: origin.y - TICK_WIDTH/2 + TICK_TEXT_SPACING },
                  X_TICK_FORMAT( xscale.invert( origin.x + i * HORIZONTAL_TICK_SPACING ) )
                  );
            }
        }

        var origin = { x: d3.round(0.75 * m[3]), y: h - d3.round(0.75 * m[2]) };

        // y axis
        drawLine(
          { x: d3.round(0.75 * m[3]), y: d3.round(0.75 * m[0])}, 
          { x: d3.round(0.75 * m[3]), y: h - d3.round(0.75 * m[2])}
        );
        addLabelText( varY, 
          { x: 0, y: 0 },
          { x: d3.round(m[3]/2) - 12, y: (h - d3.round(m[0]/2) - d3.round(m[2]/2))/2 }, 
          -Math.PI/2, "bottom" );
        addVerticalAxisTicks(origin);

        // x axis
        drawLine(
          { x: d3.round(0.75 * m[3]), y: h - d3.round(0.75 * m[2])}, 
          { x: w - d3.round(0.75 * m[1]), y: h - d3.round(0.75 * m[2])}
        );
        addLabelText( varX, 
          { x: 0, y: 7 },
          { x: (w - d3.round(m[1]/2) - d3.round(m[3]/2))/2, y: h - d3.round(m[2]/2) },
          0, "top" );
        addHorizontalAxisTicks(origin);
      }

      // from data point, return [x,y,color]
      function position(d) {
        var x = xscale(d.key.x); //d[dimensions[xcol]]);
        var y = yscale(d.key.y); //d[dimensions[ycol]]);
        return [x, y, datasetColor]; //color[d.group]];
      }

      // render circle [x,y,color]
      function circle(pos) {
        ctx.fillStyle = pos[2];
        ctx.beginPath();
        ctx.arc(pos[0], pos[1], 2, 0, 2 * Math.PI);
        //ctx.stroke();
        ctx.fill();
      }

      $scope.canvases[zIndex] = ctx;

    };

    var linkFn = function($scope, ele, iAttrs) {

      var config = {
        dimension: $scope.dimension,
        element: ele,
        variableX: $scope.window.variables.x,
        variableY: $scope.window.variables.y,
        xExtent: $scope.xExtent,
        datasetNames: $scope.datasetNames,
        colorScale: $scope.colorScale,
        reducedGroup: $scope.reduced,
        pooled: $scope.window.variables.pooled || false
      };
      //createSVG($scope, config);
      //element, zIndex, varX, varY, data, dataset, datasetColor, $scope) {
      createCanvas( 
        ele,
        1,
        $scope.window.variables.x,
        $scope.window.variables.y,
        $scope.reduced.top(Infinity),
        'ALSPACM1',
        '#e377c2',
        $scope);

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