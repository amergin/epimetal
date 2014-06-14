var visu = angular.module('plotter.vis.plotting.heatmap', ['plotter.vis.plotting']);
visu.controller('HeatmapController', ['$scope', 'DatasetFactory', 'DimensionService', 'constants', '$injector',
  function($scope, DatasetFactory, DimensionService, constants, $injector) {

    $scope.resetFilter = function() {
      $scope.heatmap.filterAll();
      dc.redrawAll(constants.groups.heatmap);
    };

    $scope.headerText = $scope.window.variables.x.length + " variables";
    $scope.window.showResetBtn = false;

    // create anchor for heatmap
    $scope.heatmapAnchor = d3.select($scope.element[0])
      .append('div')
      .attr('class', 'heatmap-chart-anchor')[0];

    $scope.colorbarAnchor = d3.select($scope.element[0])
      .append('div')
      .attr('class', 'heatmap-legend-anchor')[0][0];


    $scope.width = 420;
    $scope.height = 350;
    $scope.margins = {
          top: 10,
          right: 10,
          bottom: 60,
          left: 80
        };

    if( $scope.window.size == 'double' ) {
      $scope.width = $scope.width * 2.2;
      $scope.height = $scope.height * 2;
      _.object( _.map( $scope.margins, function(val,key) { return [key, val*2]; } ) );
    }

    $scope.drawHeatmap = function(element, dimension, group, margins, width, height) {

      var _drawLegend = function(element, scale, height) {
        var svg = d3.select(element).append('svg');
        //height = height - 80;
        var width = 60;
        // var height = 320;
        // var width = 60;

        svg
          .attr("width", width)
          .attr("height", height)
        //.attr("class", "heatmap-legend pull-right")
        .style('vertical-align', 'top')
          .style('padding-right', '10px');
        var g = svg.append("g").attr("transform", "translate(10,10)").classed("colorbar", true);
        var cb = colorBar()
          .color(scale)
          .size(height - 20)
          .lineWidth(width - 30)
          .precision(4);
        //.tickFormat(constants.tickFormat);
        g.call(cb);
        return cb;
      };

      // var width = 400;
      // var height = 325;
      $scope.heatmap = dc.heatMap(element[0], constants.groups.heatmap);
      // var noRows = Math.floor( height / variables.length );
      // var noCols = Math.floor( width / variables.length );

      var colorScale = d3.scale.linear()
        .domain([-1, 0, 1])
        .range(['blue', 'white', 'red']);

      $scope.heatmap
        .width(width)
        .height(height)
        .margins(margins)
        .turnOffControls()
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
          return d.value;
        })
        .colors(colorScale)
        .on('filtered', function(chart, filter) {
          // reset button clicked or selection is removed
          if (_.isNull(filter) || _.isNull(chart.filter())) {
            $scope.window.showResetBtn = false;
          }
          else {
            $scope.window.showResetBtn = true;
            $injector.get('PlotService').drawScatter({
              x: filter[0],
              y: filter[1]
            });
          }
          $rootScope.$apply();
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

          // set background on mouseover
          //chart.selectAll('rect').on("mouseover", function(d) { console.log("mouse", d, this); } )

          // remove rounded edges
          chart.selectAll("g.box-group > rect")
            .attr("rx", null)
            .attr("ry", null);
        })
        .on('preRender', function(chart) {
          // try to hide flickering from renderlet
          chart.transitionDuration(0);
        })
        .on('postRender', function(chart) {
          chart.transitionDuration(500);
        });

      $scope.heatmap.render();
      $scope.legend = _drawLegend($scope.colorbarAnchor, colorScale, height);

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


      $scope.sampDimension = DimensionService.getSampleDimension();
      $scope.samples = $scope.sampDimension.top(Infinity);

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
            var stdA = Utils.stDeviation($scope.samples, meanA, varA);
            var meanB = d3.mean($scope.samples, function(d) {
              return +d.variables[varB];
            });
            var stdB = Utils.stDeviation($scope.samples, meanB, varB);
            // compute correlation
            coord['corr'] = Utils.sampleCorrelation($scope.samples, varA, meanA, stdA, varB, meanB, stdB);
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

    $scope.computeVariables();
    $scope.drawHeatmap($scope.heatmapAnchor, $scope.coordDim, $scope.coordGroup, $scope.margins, $scope.width, $scope.height);


    $scope.$onRootScope('heatmap.redraw', function(event, dset, action) {

      $scope.computeVariables();

      // update the chart and redraw
      $scope.heatmap.dimension($scope.coordDim);
      $scope.heatmap.group($scope.coordGroup);

      // remember to clear any filters that may have been applied
      $scope.heatmap.filterAll();
      $scope.heatmap.render();

    });


  }
]);



visu.directive('heatmap', [

  function() {

    var linkFn = function($scope, ele, iAttrs) {
      //$scope.element = ele;
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