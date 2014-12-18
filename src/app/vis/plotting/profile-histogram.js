var visu = angular.module('plotter.vis.plotting.profile-histogram', 
  [
  'ui.router',
  'services.dimensions',
  'services.dataset',
  'services.som',
  'services.window'
  ]);
visu.controller('ProfileHistogramPlotController', ['$scope', '$rootScope', 'DimensionService', 'DatasetFactory', 'constants', '$state', '$injector', '$timeout',
  function ProfileHistogramPlotController($scope, $rootScope, DimensionService, DatasetFactory, constants, $state, $injector, $timeout) {

    $scope.dimensionService = $scope.$parent.window.handler.getDimensionService();

    $scope.redraw = function() {
      // only redraw if the dashboard is visible
      if( $state.current.name === $scope.window.handler.getName() ) {
        $scope.computeExtent();
        $scope.histogram.x(d3.scale.linear().domain($scope.extent).range([0, $scope.noBins]));
        $scope.histogram.render();
      }
    };

    $rootScope.$on('window-handler.rerender', function(event, winHandler, config) {
      if( winHandler == $scope.window.handler ) {
        if( config.omit == 'histogram' ) { return; }
        $timeout( function() {
          if(config.compute) {
            $scope.redraw();
          }
          else {
            $scope.histogram.render();
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

    // $scope.getGroupNames = function() {
    //   return _.chain($scope.groups).values().map( function(d) { return d.valueOf(); } ).value();
    // };

    $scope.compute = function() {
      $scope.somDimension = $scope.dimensionService.getSOMDimension();
      // $scope.bmuLookupGroup = $scope.somDimension.groupAll();
      $scope.bmuLookup = $scope.dimensionService.getReducedBMUinCircle( $scope.somDimension.groupAll() );
      $scope.bmuLookupObj = $scope.bmuLookup.value();

      var getBMUstr = function(bmu) {
        return bmu.x + "|" + bmu.y;
      };

      // optimize this!
      var inWhatCircles = function(d) {
        if( !_.isUndefined(d.bmu) ) {
          var id = getBMUstr(d.bmu);
          var lookup = $scope.bmuLookupObj.bmus[id];
          if( !lookup ) {
            return [];
          } else {
            return lookup;
          }
        } else {
          return [];
        }
      };

      $scope.dimension = $scope.dimensionService.getVariableBMUDimension();

      $scope.groups = {};
      _.each( $scope.window.variables.x, function(variable) {
        var group = $scope.dimension.group( function(d) {
          var circles = inWhatCircles(d);
          return {
            variable: variable,
            circles: circles,
            valueOf: function() {
              return variable + "|" + circles.join(",");
            }
          };
        });

        $scope.groups[variable] = $scope.dimensionService.getReducedMean(group, variable);
      });

      // var variable = _.first($scope.window.variables.x);
      // // var group = $scope.dimension.group();
      // var group = $scope.dimension.group( function(d) {
      //   return variable + "|" + String(inWhatCircles(d));
      //   // var circles = inWhatCircles(d);
      //   // return {
      //   //   variable: variable,
      //   //   circles: circles,
      //   //   valueOf: function() {
      //   //     return variable + "|" + circles.join(",");
      //   //   }
      //   // };
      // });
      // $scope.groups[variable] = $scope.dimensionService.getReducedMean(group, variable);

      // console.log("ALL=", $scope.groups[variable].all());


      $scope.totalDimension = DimensionService.getPrimary().getSampleDimension();
      $scope.totalGroup = $scope.totalDimension.groupAll(); //( function(d) { return true; } );
      $scope.totalReduced = DimensionService.getPrimary().getReducedSTD( $scope.totalGroup, $scope.window.variables.x );
      // console.log("reduced=", $scope.totalReduced.value() );
    };

    $scope.compute();

    // individual charts that are part of the composite chart
    $scope.barCharts = {};

    // see https://github.com/dc-js/dc.js/wiki/FAQ#filter-the-data-before-its-charted
    // this used to filter to only the one set & limit out NaN's
    $scope.filterOnSet = function(group, name) {
      return {
        'all': function() {
          return group.all().filter(function(d) {
            return (d.key.variable == name ) && d.key.circles.length > 0;
          });
        }
      };
    };

  }
]);

visu.directive('profileHistogram', ['constants', '$timeout', '$rootScope', '$injector',

  function(constants, $timeout, $rootScope, $injector) {

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

      // 1. create composite chart
      $scope.histogram = dc.compositeChart(config.element[0]) //, constants.groups.histogram)
        .dimension(config.dimension)
        .width(null)
        .height(null)
        .shareColors(true)
        .elasticY(true)
        .elasticX(false)
        .brushOn(false)
        .renderTitle(false)
        // .title(function(d) {
        //   return ['Value: ' + constants.tickFormat(d.key),
        //    'Total count: ' + d.value.counts.total || 0
        //   ].join("\n");
        // })
        .x( d3.scale.ordinal().domain(config.groupNames) )
        .xUnits(dc.units.ordinal)
        .margins({
          top: 15,
          right: 10,
          bottom: 30,
          left: 40
        });

        // .xAxisLabel('label')

      // 2. for each of the additional stacks, create a child chart
      _.chain(config.groups).each( function(group, variable) {
        var chart = dc.barChart($scope.histogram)
          .centerBar(false)
          .barPadding(0.15)
          .brushOn(false)
          .dimension(config.dimension)
          .group(config.filter(group, variable), variable)
          .valueAccessor(function(d) { // is y direction
            var mean = d.value.mean;
            var constant = 100;
            var totalVal = config.totalReduced.value()[variable];
            var totalStd = totalVal.valueOf().stddev;
            var totalMean = totalVal.valueOf().mean; 
            return ( mean - totalMean ) / totalStd * constant;
          })
          .keyAccessor(function(d) {
            return d.key.variable;
          });

        $scope.barCharts[name] = chart;
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