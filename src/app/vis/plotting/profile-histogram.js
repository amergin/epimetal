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
        $scope.histogram.render();
      }
    };

    $rootScope.$on('window-handler.rerender', function(event, winHandler, config) {
      if( winHandler == $scope.window.handler ) {
        if( config.omit == 'histogram' ) { return; }
        $timeout( function() {
          if(config.compute) {
            $scope.compute();
            $scope.histogram.redraw();
            // $scope.redraw();
          }
          else {
            $scope.histogram.redraw();
            //$scope.histogram.render();
          }
        });
      }
    });

    $rootScope.$on('window-handler.redraw', function(event, winHandler) {
      if( winHandler == $scope.window.handler ) {
        $timeout( function() {
          $scope.histogram.redraw();
        });
      }
    });

    $scope.compute = function() {
      var inWhatCircles = function(d) {
        if( !_.isUndefined(d.bmu) ) {
          var ret = [];
          _.each( FilterService.getSOMFilters(), function(circle) {
            if( circle.contains(d.bmu) ) {
              ret.push(circle.id());
            }
          });
          return ret;
        } else {
          return [];
        }
      };

      $scope.dimension = $scope.dimensionService.getVariableBMUDimension();

      var groups = {};
      _.each( $scope.window.variables.x, function(variable) {
        var group = $scope.dimension.group( function(d) {
          return {
            variable: variable,
            circles: d.circles(),
            valueOf: function() { return d.valueOf(); }
          };
        });
        // var group = $scope.dimension.group( function(d) {
        //   // return variable + "|" + String(inWhatCircles(d));
        //   return {
        //     variable: variable,
        //     circles: function() {
        //       var cir =  inWhatCircles(d);
        //       // console.log("inWhatCircles = ", cir, "in BMU = ", JSON.stringify(d.bmu));
        //       return cir;
        //     },
        //     valueOf: function() {
        //       return variable + this.circles(); //String(this.circles());
        //       // return variable + "|" + circles.join(",");
        //     }
        //   };
        // });

        groups[variable] = $scope.dimensionService.getReducedMean(group, variable);
      });
      
      $scope.groups = angular.copy(groups);

      $scope.totalDimension = DimensionService.getPrimary().getSampleDimension();
      $scope.totalGroup = $scope.totalDimension.groupAll();
      $scope.totalReduced = DimensionService.getPrimary().getReducedSTD( $scope.totalGroup, $scope.window.variables.x );
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
          .reject(function(g) { return g.value.n === 0 || g.key.circles.length === 0; })
          .each( function(grp) {
            _.each(grp.key.circles, function(circle) {
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
          'STD (all samples): ' + totalStd
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
          chart.selectAll('g.x text')
          .attr('transform', "rotate(-65)")
          .style("text-anchor", "end")
          .attr('dx', "-1em");
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
            console.log("N=", d.value.n, JSON.stringify(d), " in group = ", getLabel(d.key.variable, d.key.circle) );
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
        reduced: $scope.reduced,
        groupNames: $scope.window.variables.x,
        colorScale: $scope.colorScale,
        filter: $scope.filterOnSet,
        filterEnabled: $scope.window.filterEnabled,
        totalReduced: $scope.totalReduced
      };

      $timeout( function() {
        createSVG($scope, config);
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