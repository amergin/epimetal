var visu = angular.module('plotter.vis.plotting.profile-histogram', 
  [
  'ui.router',
  'services.dimensions',
  'services.dataset',
  'services.som',
  'services.window'
  ]);
visu.controller('ProfileHistogramPlotController', ['$scope', '$rootScope', 'DimensionService', 'DatasetFactory', 'constants', '$state', '$injector', '$timeout', 'FilterService',
  function ProfileHistogramPlotController($scope, $rootScope, DimensionService, DatasetFactory, constants, $state, $injector, $timeout, FilterService) {

    $scope.dimensionService = $scope.$parent.window.handler.getDimensionService();
    $scope.colorScale = FilterService.getSOMFilterColors();

    $scope.redraw = function() {
      // only redraw if the dashboard is visible
      if( $state.current.name === $scope.window.handler.getName() ) {
        $scope.compute();
        $scope.histogram.redraw();
      }
    };

    $scope.dimension = $scope.dimensionService.getVariableBMUDimension();
    $scope.groups = {};

    $scope.compute = function() {
      // notice that you CANNOT use SOMDimension here! it will not apply the filter on its dimension
      // to restrict out to proper amount of samples!


      _.each( $scope.window.variables.x, function(variable) {

        var group = $scope.dimension.group( function(d) {
          return {
            variable: variable,
            circles: function() {
              return FilterService.inWhatCircles(d.bmu);
            },
            valueOf: function() {
              return d.valueOf() + String(this.circles());
            }
          };
        });

          // var group = $scope.dimension.group( function(d) {
          //   // console.log("GROUP receives = ", JSON.stringify(d.bmu));
          //   return {
          //     variable: variable,
          //     circles: FilterService.inWhatCircles(d.bmu),
          //     // circles: function() {
          //     //   return FilterService.inWhatCircles(d.bmu);
          //     // },
          //     valueOf: function() { return String(this.circles); }
          //   };
          // });

        // var group = $scope.dimension.group( function(d) {
        //   return {
        //     variable: variable,
        //     circles: d.circles,
        //     valueOf: function() { return this.circles; }
        //   };
          // return {
          //   variable: variable,
          //   circles: d.circles, //d.circles(),
          //   valueOf: function() { return this.circles(); } //return d.valueOf(); }
          // };
        // console.log( "GROUPING variable = ", variable, "circles = ", JSON.stringify( _.map(group.all(), function(g) { return [g.key.circles(), "N = ", g.value]; }) ) );
        $scope.groups[variable] = $scope.dimensionService.getReducedMean(group, variable);
        // console.log("AFTER REDUCING ", JSON.stringify( _.map($scope.groups[variable].all(), function(g) { return [g.key.circles, g.value.n]; } ) ) );
      });

$scope.totalDimension = DimensionService.getPrimary().getSampleDimension();
$scope.totalGroup = $scope.totalDimension.groupAll();
$scope.totalReduced = DimensionService.getPrimary().getReducedSTD( $scope.totalGroup, $scope.window.variables.x );

      // _.each($scope.barCharts, function(chart, variable) {
      //   var group = $scope.groups[variable];
      //   chart.group($scope.filterOnSet(group, variable), variable);
      // });
};

$scope.compute();

    // individual charts that are part of the composite chart
    $scope.barCharts = {};

    // see https://github.com/dc-js/dc.js/wiki/FAQ#filter-the-data-before-its-charted
    // this used to filter to only the one set & limit out NaN's
    $scope.filterOnSet = function(group, name) {
      return {
        'all': function() {

          var lookup = {},
          ret = [];

          // form lookup
          _.chain(group.all())
          .reject(function(g) { return g.value.n === 0 || g.key.circles().length === 0; })
          .each( function(grp) {
            _.each(grp.key.circles(), function(circle) {
              if( !lookup[circle] ) { lookup[circle] = []; }
              lookup[circle].push( grp );
            });
          }).value();

          // resolve lookup to ready groups that dc.js understands
          ret = _.chain(lookup).map( function(groups, circleId) {
            var obj = { 
              key: { variable: name, circle: FilterService.getSOMFilter(circleId) }, 
              value: { mean: 0, n: 0 } 
            };
            _.each(groups, function(grp) {
              // actually a sum
              obj.value.mean += (grp.value.mean * grp.value.n);
              obj.value.n += grp.value.n;
            });
            // form actual mean
            obj.value.mean = obj.value.mean / obj.value.n;
            return obj;
          }).value();

          return ret;
        }
      };
    };

  }
  ]);

visu.directive('profileHistogram', ['constants', '$timeout', '$rootScope', '$injector', 'FilterService',

  function(constants, $timeout, $rootScope, $injector, FilterService) {

    var PlotService = $injector.get('PlotService');

    var createSVG = function($scope, config) {
      // check css window rules before touching these
      var _width = 470;
      var _height = 345;
      var _xBarWidth = 50;
      var _poolingColor = '#000000';

      // collect charts here
      var charts = [];

      // work-around, weird scope issue on filters ?!
      $scope.FilterService = $injector.get('FilterService');

      var getLabel = function(variable, circle) {
        return variable + " (" + circle.name() + ")";
      };

      var getLabels = function() {
        var ret = [];
        _.each(config.groups, function(group, name) {
          _.each( $scope.filterOnSet(group, name).all(), function(obj) {
            var circle = obj.key.circle;
            ret.push( getLabel(obj.key.variable, circle) );
          });
        });
        return ret;
      };

      var onClick = function(d, xCoord, yCoord) {
        var variable = d.data.key.variable;
        var config = {
          variables: { x: d.data.key.variable },
          pooled: false,
          somSpecial: true
        };

        // remove the old histogram window, if any
        $scope.window.handler.removeByType('histogram');
        // draw a new one
        PlotService.drawHistogram( config, $scope.window.handler );

        // remove this instance and create a new one
        // this is to combat rescaling issues, FIXME
        $scope.window.handler.remove( $scope.window._winid );
        PlotService.drawProfileHistogram({ variables: $scope.window.variables }, $scope.window.handler);

      };

        var labels = getLabels();

      // 1. create composite chart
      $scope.histogram = dc.compositeChart(config.element[0]) //, constants.groups.histogram)
                        .dimension(config.dimension)
                        .width(null)
                        .height(null)
                        .shareColors(true)
                        .elasticY(true)
                        .elasticX(true)
                        .brushOn(false)
                        .renderTitle(false)
                        .colors(config.colorScale)
                        .title(function(d) {
                          var variable = d.key.variable;
                          var totalVal = config.totalReduced.value()[variable];
                          var value = d.value.valueOf();
                          var totalStd = d3.round(totalVal.valueOf().stddev, 3);
                          var circle = d.key.circle;
                          return [
                          'Circle filter: ' + circle.name(),
                          'Variable: ' + variable,
                          'Mean of ' + variable + ": " + d3.round(value.mean, 3),
                          'STD (all samples): ' + totalStd,
                          'Sample count: ' + d.value.n || 0
                          ].join("\n");
                        })
                        .x( d3.scale.ordinal().domain(labels) )
                        .xUnits(dc.units.ordinal)
                        .margins({
                          top: 10,
                          right: 10,
                          bottom: 90,
                          left: 40
                        })
                        .renderlet( function(chart) {
          // rotate labels
          chart.selectAll('g.x text')
          .attr('transform', "rotate(-65)")
          .style("text-anchor", "end")
          .attr('dx', "-1em");

          chart.selectAll('rect').on("click", onClick);
        });

        // hide y axis
        // $scope.histogram.yAxis().ticks(0); //.tickFormat( function(v) { return ''; } );

      // 2. for each of the additional stacks, create a child chart
      _.each(config.groups, function(group, variable) {
        var chart = dc.barChart($scope.histogram)
        .centerBar(false)
        .xUnits(dc.units.ordinal)
        .x( d3.scale.ordinal().domain(labels))
        .barPadding(0.15)
        .colorAccessor( function(d) {
          return d.key.circle.id();
        })
        .brushOn(false)
        .dimension(config.dimension)
        .group(config.filter(group, variable), variable)
          .valueAccessor(function(d) { // is y direction
            // console.log("N=", d.value.n, JSON.stringify(d), " in group = ", getLabel(d.key.variable, d.key.circle) );
            var mean = d.value.mean;
            var constant = 100;
            var totalVal = config.totalReduced.value()[variable];
            var totalStd = totalVal.valueOf().stddev;
            var totalMean = totalVal.valueOf().mean;
            return ( mean - totalMean ) / totalStd * constant; 
          })
          .keyAccessor(function(d) {
            var circle = d.key.circle,
            variable = d.key.variable;
            return getLabel(variable, circle);
          });

          $scope.barCharts[variable] = chart;
          charts.push(chart);

        });

      // 3. compose & render the composite chart
      $scope.histogram.compose(charts);
      $scope.histogram.render();

    };

    function postLink($scope, ele, attrs, ctrl) {

      $scope.$parent.element = ele;

      var config = {
        dimension: $scope.dimension,
        element: ele,
        groups: $scope.groups,
        groupNames: $scope.window.variables.x,
        colorScale: $scope.colorScale,
        filter: $scope.filterOnSet,
        filterEnabled: $scope.window.filterEnabled,
        totalReduced: $scope.totalReduced
      };

      $timeout( function() {
        createSVG($scope, config);
      });


      $scope.deregisters = [];

      var reRenderUnbind = $rootScope.$on('window-handler.rerender', function(event, winHandler, config) {
        if( winHandler == $scope.window.handler ) {
          if( config.omit == 'histogram' ) { return; }
          $timeout( function() {
            if(config.compute) {
              $scope.redraw();
            }
            else {
              if( $scope.histogram ) {
                $scope.histogram.redraw();
              }
            //$scope.histogram.render();
          }
        });
        }
      });

      var redrawUnbind =  $rootScope.$on('window-handler.redraw', function(event, winHandler) {
        if( winHandler == $scope.window.handler ) {
          $timeout( function() {
            $scope.histogram.redraw();
          });
        }
      });

      $scope.deregisters.push(reRenderUnbind, redrawUnbind);

      $scope.$on('$destroy', function() {
        _.each($scope.deregisters, function(unbindFn) {
          unbindFn();
        });
      });

      ele.on('$destroy', function() {
        $scope.$destroy();
      });

    }

    return {
      scope: false,
      restrict: 'C',
      controller: 'ProfileHistogramPlotController',
      link: {
        post: postLink
      }
    };
  }
  ]);