var visu = angular.module('plotter.vis.plotting.heatmap', []);
visu.controller('HeatmapController', ['$scope', 'DatasetFactory', 'DimensionService', 'constants', '$injector', '$timeout',
  function($scope, DatasetFactory, DimensionService, constants, $injector, $timeout) {

    $scope.resetFilter = function() {
      $scope.heatmap.filterAll();
      dc.redrawAll(constants.groups.heatmap);
    };

    $scope.headerText = ['Correlation heatmap of', $scope.window.variables.x.length + " variables", ''];
    $scope.window.showResetBtn = false;
    $scope.format = d3.format('.2g');
    $scope.filtered = true; // p-value limiting

    // .html('Hide correlations with p > {{limitDisp}}');

    // create anchor for heatmap
    // $scope.heatmapAnchor = d3.select($scope.element[0])
    //   .append('div')
    //   .attr('class', 'heatmap-chart-anchor')[0];

    // $scope.colorbarAnchor = d3.select($scope.element[0])
    //   .append('div')
    //   .attr('class', 'heatmap-legend-anchor')[0][0];


    $scope.width = 420;
    $scope.height = 350;
    $scope.margins = {
      top: 0,
      right: 0,
      bottom: 60,
      left: 80
    };

    if ($scope.window.size == 'double') {
      $scope.width = $scope.width * 2.2;
      $scope.height = $scope.height * 2;
      _.object(_.map($scope.margins, function(val, key) {
        return [key, val * 2];
      }));
    }

    $scope.drawHeatmap = function(element, dimension, group, margins, width, height) {

      var _drawLegend = function(element, scale, height) {
        var width = 60;
        var svg = d3.select(element)
        .append('svg')
        .attr("viewBox", "0 0 " + width + " " + height)
        .attr("preserveAspectRatio", "xMaxYMid meet")
        .attr("width", "100%")
        .attr("height", "100%");

        svg
        // .attr("width", width)
        // .attr("height", height)
        .style('vertical-align', 'top')
          .style('padding-right', '10px');
        var g = svg.append("g").attr("transform", "translate(10,10)").classed("colorbar", true);
        var cb = colorBar()
          .color(scale)
          .size(height - 20)
          .lineWidth(width - 30)
          .precision(4);
        g.call(cb);
        return cb;
      };

      $scope.heatmap = dc.heatMap(element[0], constants.groups.heatmap);

      var colorScale = d3.scale.linear()
        .domain([-1, 0, 1])
        .range(['blue', 'white', 'red']);

      $scope.heatmap
        .width(null)
        .height(null)
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
        .title(function(d) {
          return "Horizontal variable:  " +
            d.key.x + "\n" +
            "Vertical variable:  " +
            d.key.y + "\n" +
            "Correlation:  " + 
            constants.tickFormat(d.value) + "\n" + 
            "P-value:   " + 
            ( _(d.key.pvalue).isNaN() || _(d.key.pvalue).isUndefined() ? "(not available)" : $scope.format(d.key.pvalue) );
        })
        .colorAccessor(function(d) {
          if($scope.filtered) {
            if( !_.isUndefined(d.key.pvalue) && d.key.pvalue > $scope.limit ) {
              return 0;
            }
          }
          return d.value;
        })
        .colors(colorScale)
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
        .on('preRender', function(chart) {
          // try to hide flickering from renderlet
          chart.transitionDuration(0);
        })
        .on('postRender', function(chart) {
          chart.transitionDuration(500);
        })
        // override default click actions
        .xAxisOnClick( function() {} )
        .yAxisOnClick( function() {} )
        .boxOnClick( function(cell) {
          $timeout( function() {
            $injector.get('PlotService').drawScatter({
              variables: {
                x: cell.key.x,
                y: cell.key.y
              }
            });
          });
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
      var samples = $scope.sampDimension.top(Infinity);

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
              corr: correlations[[varB, varA]]['corr'],
              pvalue: correlations[[varB, varA]]['pvalue']
            });
            return;
          } else {
            // compute mean and st. deviation for varA & varB
            var meanA = d3.mean(samples, function(d) {
              return +d.variables[varA];
            });
            var stdA = Utils.stDeviation(samples, meanA, varA);
            var meanB = d3.mean(samples, function(d) {
              return +d.variables[varB];
            });
            var stdB = Utils.stDeviation(samples, meanB, varB);
            // compute correlation
            coord['corr'] = Utils.sampleCorrelation(samples, varA, meanA, stdA, varB, meanB, stdB);
            // compute p-value
            coord['pvalue'] = Utils.calcPForPearsonR( coord['corr'], samples.length);
            correlations[[varA, varB]] = coord;//coord['corr'];
          }
          coordinates.push(coord);
        });
      });

      // compute Bonferroni correction
      var bonferroni = 0.5 * variables.length * (variables.length - 1);
      $scope.limit = 0.05 / bonferroni;
      $scope.limitDisp = $scope.format($scope.limit);

      // create a tiny crossfilt. instance for heatmap
      $scope.crossfilter = crossfilter(coordinates);
      $scope.coordDim = $scope.crossfilter.dimension(function(d) {
        return _.extend(d, { 'valueOf': function() { return d.x + "|" + d.y; } });
        // console.log(d);
        // return [d.x, d.y];
      });
      $scope.coordGroup = $scope.coordDim.group().reduceSum(function(d) {
        return d.corr;
      });
    };

    $scope.computeVariables();

    $scope.settingsDropdown.push({
      'text': '<i class="fa fa-sliders"></i> Show correlations with p > <b>' + $scope.limitDisp + '</b>',
      'click': "filter()"
    });

    $scope.$watch('filtered', function(filt) {
      var entry = _.last($scope.settingsDropdown).text;
      if(filt) { 
        $scope.headerText[2] = '(p < ' + $scope.limitDisp + ')';
        _.last($scope.settingsDropdown).text = entry.replace(/Hide/, 'Show');
      } else {
        $scope.headerText[2] = '';
        _.last($scope.settingsDropdown).text = entry.replace(/Show/, 'Hide');
      }
    });

    $scope.$onRootScope('heatmap.redraw', function(event, dset, action) {
      $scope.computeVariables();

      // update the chart and redraw
      $scope.heatmap.dimension($scope.coordDim);
      $scope.heatmap.group($scope.coordGroup);

      // remember to clear any filters that may have been applied
      $scope.heatmap.filterAll();
      $scope.heatmap.render();
    });

    $scope.filter = function() {
      $scope.filtered = !$scope.filtered;
      $scope.heatmap.render();
    };

  }
]);



visu.directive('heatmap', ['$compile',

  function($compile) {

    var linkFn = function($scope, ele, iAttrs) {

      // $scope.heatmapAnchor = ele;
      $scope.heatmapAnchor = d3.select(ele[0])
        .append('div')
        .attr('class', 'heatmap-chart-anchor')[0];


    $scope.colorbarAnchor = d3.select(ele[0])
      .append('div')
      .attr('class', 'heatmap-legend-anchor')[0][0];

      $scope.drawHeatmap(
        $scope.heatmapAnchor, 
        $scope.coordDim, 
        $scope.coordGroup, 
        $scope.margins, 
        $scope.width, 
        $scope.height );


      // redraw on window resize
      ele.parent().on('resize', function() {
        if( !_.isUndefined( $scope.heatmap ) ) {
          $scope.heatmap.render();
          window.heatmap = $scope.heatmap;
        }
      });


    };

    return {
      scope: false,
      // scope: {},
      restrict: 'C',
      //require: '^?window',
      replace: true,
      link: linkFn,
      controller: 'HeatmapController',
      transclude: true
    };
  }
]);