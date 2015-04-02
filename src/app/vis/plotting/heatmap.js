var visu = angular.module('plotter.vis.plotting.heatmap', 
  [
  'ui.router',
  'services.dimensions',
  'services.correlation',
  'services.tab'
  ]);
visu.controller('HeatmapController', ['$scope', 'DatasetFactory', 'DimensionService', 'constants', '$injector', '$timeout', '$rootScope', 'CorrelationService', 'TabService',
  function($scope, DatasetFactory, DimensionService, constants, $injector, $timeout, $rootScope, CorrelationService, TabService) {

    $scope.resetFilter = function() {
      $scope.heatmap.filterAll();
      dc.redrawAll(constants.groups.heatmap);
    };

    $scope.$parent.headerText = ['Correlation heatmap of', $scope.window.variables.x.length + " variables", ''];
    $scope.$parent.showResetBtn = false;

    $scope.format = d3.format('.2g');
    $scope.filtered = true; // p-value limiting

    $scope.width = 420;
    $scope.height = 350;
    $scope.margins = {
      top: 0,
      right: 0,
      bottom: 60,
      left: 80
    };

    $scope.variablesLookup = {};

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
        .style('vertical-align', 'top')
        .style('padding-right', '10px');
        var g = svg.append("g").attr("transform", "translate(10,10)").classed("colorbar", true);
        var cb = colorBar()
        .color(scale)
        .size(height - 40)
        .lineWidth(width - 30)
        .precision(4);
        g.call(cb);
        return cb;
      };

      $scope.heatmap = dc.heatMap(element[0], constants.groups.heatmap);

      var colorScale = d3.scale.linear()
      .domain([-1, 0, 1])
      .range(['blue', 'white', 'red']);

      function labelOrdering(a, b) {
        var grpA = $scope.variablesLookup[a].group.order,
        grpB = $scope.variablesLookup[b].group.order,
        varA = $scope.variablesLookup[a].name_order,
        varB = $scope.variablesLookup[b].name_order;
        return d3.descending( grpA * 10 + varA, grpB * 10 + varB);
      }

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
      .rowOrdering(function(a,b) {
        var grpA = $scope.variablesLookup[a].group.order,
        grpB = $scope.variablesLookup[b].group.order,
        varA = $scope.variablesLookup[a].name_order,
        varB = $scope.variablesLookup[b].name_order;
        return d3.descending( grpA * 10 + varA, grpB * 10 + varB);
      })
      .colOrdering(function(a,b) {
        var grpA = $scope.variablesLookup[a].group.order,
        grpB = $scope.variablesLookup[b].group.order,
        varA = $scope.variablesLookup[a].name_order,
        varB = $scope.variablesLookup[b].name_order;
        return d3.ascending( grpA * 10 + varA, grpB * 10 + varB);
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
            }, $scope.window.handler );
          });
        });

        $scope.heatmap.render();
        $scope.legend = _drawLegend($scope.colorbarAnchor, colorScale, height);

      };

      $scope.dimensionService = $scope.$parent.window.handler.getDimensionService();
      $scope.sampDimensionInst = $scope.dimensionService.getSampleDimension();
      $scope.sampDimension = $scope.sampDimensionInst.get();
      $scope.crossfilter = crossfilter([]);
      $scope.coordDim = $scope.crossfilter.dimension(function(d) {
        return _.extend(d, { 'valueOf': function() { return d.x + "|" + d.y; } });
      });
      $scope.coordGroup = $scope.coordDim.group().reduceSum(function(d) {
        return d.corr;
      });

      $scope.computeVariables = function(callback) {
        var variables = $scope.window.variables.x;
        $scope.$parent.startSpin();

        // lock tab switching
        TabService.lock(true);
        // get coordinates in a separate worker
        CorrelationService.compute({ variables: variables }, $scope.$parent.window.handler)
        .then(function succFn(coordinates) {

          // compute Bonferroni correction
          var bonferroni = 0.5 * variables.length * (variables.length - 1);
          $scope.limit = 0.05 / bonferroni;
          $scope.limitDisp = $scope.format($scope.limit);

          // create a tiny crossfilt. instance for heatmap. so tiny that it's outside of dimension
          // service reach.
          $scope.crossfilter.remove();
          $scope.crossfilter.add(coordinates);
          callback();
        }).finally(function() {
          // unlock tabs
          TabService.lock(false);
          $scope.$parent.stopSpin();
        });

      };

      function addLimit() {
        $scope.$parent.settingsDropdown.push({
          'text': '<i class="fa fa-sliders"></i> Show correlations with p > <b>' + $scope.limitDisp + '</b>',
          'type': 'correlations',
          'click': function() {
            var entry = _.last($scope.$parent.settingsDropdown).text;
            $scope.filtered = !$scope.filtered;
            if($scope.filtered) { 
              $scope.$parent.headerText[2] = '(p < ' + $scope.limitDisp + ')';
              _.last($scope.$parent.settingsDropdown).text = entry.replace(/Hide/, 'Show');
            } else {
              $scope.$parent.headerText[2] = '';
              _.last($scope.$parent.settingsDropdown).text = entry.replace(/Show/, 'Hide');
            }
            $scope.heatmap.render();
          }
        });
      }

      _.once(function() {
        addLimit();
      });

      $scope.$watch('limitDisp', function(value) {
        if(!value) { return; }
        var index = Utils.indexOf($scope.$parent.settingsDropdown, function(drop) {
          return drop.type == 'correlations';
        });

        if(index != -1) {
          $scope.$parent.settingsDropdown.splice(index, 1);
        }
        addLimit();
      });

      // $scope.$watch('limitDisp', function(val) {
      //   if(!val) { return; }

      //   $scope.$parent.settingsDropdown.push({
      //     'text': '<i class="fa fa-sliders"></i> Show correlations with p > <b>' + $scope.limitDisp + '</b>',
      //     'click': function() {
      //       var entry = _.last($scope.$parent.settingsDropdown).text;
      //       $scope.filtered = !$scope.filtered;
      //       if($scope.filtered) { 
      //         $scope.$parent.headerText[2] = '(p < ' + $scope.limitDisp + ')';
      //         _.last($scope.$parent.settingsDropdown).text = entry.replace(/Hide/, 'Show');
      //       } else {
      //         $scope.$parent.headerText[2] = '';
      //         _.last($scope.$parent.settingsDropdown).text = entry.replace(/Show/, 'Hide');
      //       }
      //       $scope.heatmap.render();
      //     }
      //   });

      // });

      var callback = function() {
        // update the chart and redraw
        $scope.heatmap.dimension($scope.coordDim);
        $scope.heatmap.group($scope.coordGroup);

        // remember to clear any filters that may have been applied
        //$scope.heatmap.filterAll();
        $scope.heatmap.render();
      };

      $scope.throttled = _.debounce(function() {
        $scope.computeVariables(callback);
      }, 300, { maxWait: 600, trailing: true });

      $scope.redraw = function() {
      $scope.throttled();
    };

    $scope.filter = function() {
      $scope.filtered = !$scope.filtered;
      $scope.heatmap.render();
    };

  }]);



visu.directive('heatmap', ['$compile', '$rootScope', '$timeout', 'DatasetFactory',

  function($compile, $rootScope, $timeout, DatasetFactory) {

    var linkFn = function($scope, ele, iAttrs) {

      $scope.$parent.element = ele;

      $scope.heatmapAnchor = d3.select(ele[0])
      .append('div')
      .attr('class', 'heatmap-chart-anchor')[0];


      $scope.colorbarAnchor = d3.select(ele[0])
      .append('div')
      .attr('class', 'heatmap-legend-anchor')[0][0];

      function draw() {
        $scope.drawHeatmap(
          $scope.heatmapAnchor, 
          $scope.coordDim, 
          $scope.coordGroup, 
          $scope.margins, 
          $scope.width, 
          $scope.height );        
      }

      DatasetFactory.getVariables().then(function(variables) {
        $scope.variablesLookup = _.chain(variables).map(function(d) { return [d.name, d]; }).object().value();

        // load previous state provided by url routing
        if($scope.window.coordinates && $scope.window.coordinates.length > 0) {
          var bonferroni = 0.5 * variables.length * (variables.length - 1);
          $scope.limit = 0.05 / bonferroni;
          $scope.limitDisp = $scope.format($scope.limit);
          
          $scope.crossfilter.add($scope.window.coordinates);
          $timeout(function() {
            draw();
          });
        } else {
          // default route to do things
          $scope.computeVariables(function() {
            draw();
          });
        }
      });

      $scope.deregisters = [];

      var resizeUnbind = $rootScope.$on('gridster.resize', function(event,$element) {
        if( $element.is( $scope.$parent.element.parent() ) ) {
          $scope.heatmap.render();
        }
      });

      var reRenderUnbind =  $rootScope.$on('window-handler.rerender', function(event, winHandler, config) {
        if( winHandler == $scope.window.handler ) {
          $timeout( function() {
            if(config.compute) {
              $scope.redraw();
            }
            else {
              $scope.heatmap.render();
            }
          });
        }
      });

      var redrawUnbind =  $rootScope.$on('window-handler.redraw', function(event, winHandler) {
        if( winHandler == $scope.window.handler ) {
          $timeout( function() {
            $scope.heatmap.redraw();
          });
        }
      });

      var gatherStateUnbind =  $rootScope.$on('UrlHandler:getState', function(event, callback) {
        var retObj = _.chain($scope.window)
        .pick(['type', 'grid', 'handler', 'variables', 'handler', 'limit'])
        .clone()
        .extend({ coordinates: $scope.coordDim.top(Infinity) })
        .value();

        callback(retObj);
      });

      $scope.deregisters.push(resizeUnbind, reRenderUnbind, redrawUnbind, gatherStateUnbind);

      $scope.$on('$destroy', function() {
        _.each($scope.deregisters, function(unbindFn) {
          unbindFn();
        });
        $scope.sampDimensionInst.decrement();
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
  }
  ]);