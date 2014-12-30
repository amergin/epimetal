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
      $scope.totalDimension = DimensionService.getPrimary().getSampleDimension();
      $scope.totalReduced = {};

      // notice that you CANNOT use SOMDimension here! it will not apply the filter on its dimension
      // to restrict out to proper amount of samples!
      _.each( $scope.window.variables.x, function(variable) {

        var group = $scope.dimension.group( function(d) {
          return {
            variable: variable,
            bmu: d.bmu,
            valueOf: function() {
              return d.valueOf();
            }
          };
        });
        $scope.groups[variable] = $scope.dimensionService.getReducedMean(group, variable);
        $scope.totalReduced[variable] = DimensionService.getPrimary().getReducedSTD( $scope.totalDimension.groupAll(), variable );
      });

      // $scope.totalDimension = DimensionService.getPrimary().getSampleDimension();
      // $scope.totalReduced = DimensionService.getPrimary().getReducedSTD( $scope.totalDimension.groupAll(), $scope.window.variables.x );
    };

    $scope.compute();

    // individual charts that are part of the composite chart
    $scope.barCharts = {};

    // see https://github.com/dc-js/dc.js/wiki/FAQ#filter-the-data-before-its-charted
    // this used to filter to only the one set & limit out NaN's
    $scope.filterOnSet = function(group, name) {
      return {
        'all': function() {

          var circleLookup = {},
          ret = [];

          // regroup based on circles which they are in, a lookup
          _.chain(group.all())
          .map(function(grp) {
            return {
              circles: FilterService.inWhatCircles(grp.key.bmu),
              group: grp
            };
          })
          .reject(function(grp) { return grp.group.value.n === 0 || grp.circles.length === 0; })
          .each(function(grp) {
            _.each(grp.circles, function(circle) {
             if( !circleLookup[circle] ) { circleLookup[circle] = []; }
             circleLookup[circle].push(grp);
           });
          }).value();

          // resolve lookup to ready groups for dc.js
          ret = _.chain(circleLookup)
          .map(function(groups, circleId) {
            var obj = { 
              key: { variable: name, circle: FilterService.getSOMFilter(circleId) }, 
              value: { mean: 0, n: 0 },
              // for later sorting
              valueOf: function() { return this.key.variable; }
            };
            _.each(groups, function(grp) {
              // actually a sum
              obj.value.mean += (grp.group.value.mean * grp.group.value.n);
              obj.value.n += grp.group.value.n;
            });
            // form the actual mean
            obj.value.mean = obj.value.mean / obj.value.n;
            return obj;
          }).value();

          return ret;
        }
      };
    };

    $scope.formGroups = function(groups) {
      return {
        'all': function() { 
          return _.chain(groups)
          .map(function(group, variable) {
            return $scope.filterOnSet(group, variable).all();
          })
          .flatten()
          .value();
        }
      };
    };

  }
  ]);

visu.directive('profileHistogram', ['constants', '$timeout', '$rootScope', '$injector',

  function(constants, $timeout, $rootScope, $injector) {

    var PlotService = $injector.get('PlotService');

    var createSVG = function($scope, config) {
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
      };

      var resizeSVG = function(chart) {
        var ratio = config.size.aspectRatio === 'stretch' ? 'none' : 'xMinYMin';
          chart.select("svg")
              .attr("viewBox", "0 0 " + [config.size.width, config.size.height].join(" ") )
              .attr("preserveAspectRatio", ratio)
              .attr("width", "100%")
              .attr("height", "100%");
          // chart.redraw();
      };

      // var sortByLowerCase = function(a,b) {
      //   var aLower = a.valueOf().toLowerCase(),
      //   bLower = b.valueOf().toLowerCase();
      //   if( aLower < bLower ) { 
      //     console.log (aLower, " < ", bLower);
      //     return -1; }
      //   if( aLower > bLower ) { 
      //     console.log (aLower, " > ", bLower);          
      //     return 1; 
      //   }
      //   console.log(aLower, " = ", bLower);
      //   return 0;
      // };

      // var sortByLabel = function(a,b) {
      //   var aLabel = getLabel(a.key.variable, a.key.circle);
      //   var bLabel = getLabel(b.key.variable, b.key.circle);
      //   if( aLabel < bLabel ) { return -1; }
      //   if( aLabel > bLabel ) { return 1; }
      //   return 0;
      // };

      // 1. create composite chart
      $scope.histogram = dc.seriesChart(config.element[0], constants.groups.histogram.nonInteractive)
      .chart(dc.barChart)
      .dimension(config.dimension)
      .group(config.filter(config.groups))
      .seriesAccessor( function(d) {
        return d.key.variable;
      })
      .seriesSort(function(a,b) {
        return d3.ascending(a.toLowerCase(), b.toLowerCase());
      }) //sortByLowerCase)
      .valueSort(function(a,b) {
        var aLabel = getLabel(a.key.variable, a.key.circle);
        var bLabel = getLabel(b.key.variable, b.key.circle);
        return d3.ascending(aLabel.toLowerCase(), bLabel.toLowerCase());
      }) //sortByLabel)
      .width(config.size.width)
      .height(config.size.height)
      .elasticY(true)
      .elasticX(true)
      .brushOn(false)
      .renderTitle(false)
      .colors(config.colorScale)
      .title(function(d) {
        var variable = d.key.variable;
        var totalVal = config.totalReduced[variable].value();
        // var totalVal = config.totalReduced.value()[variable];
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
      .x( d3.scale.ordinal().domain(config.groupNames) )
      .xUnits(dc.units.ordinal)
      // .y(d3.scale.linear().domain([-110,110]))
      .margins({
        top: 10,
        right: 10,
        bottom: 90,
        left: 40
      })
      .childOptions({
        colorAccessor: function(d) {
          return d.key.circle.id();
        },
        barPadding: 0.30,
        gap: 5
      })
      .valueAccessor(function(d) { // is y direction
        var variable = d.key.variable;
        var mean = d.value.mean;
        var constant = 100;
        // var totalVal = config.totalReduced.value()[variable];
        var totalVal = config.totalReduced[variable].value();
        var totalStd = totalVal.valueOf().stddev;
        var totalMean = totalVal.valueOf().mean;
        console.log(variable, "totalMean = ", totalMean, "totalStd = ", totalStd, totalVal);
        return ( mean - totalMean ) / totalStd * constant; 
      })
      .keyAccessor(function(d) {
        var circle = d.key.circle,
        variable = d.key.variable;
        return getLabel(variable, circle);
      })
      .renderlet( function(chart) {
          // rotate labels
          chart.selectAll('g.x text')
          .attr('transform', "rotate(-65)")
          .style("text-anchor", "end")
          .attr('dx', "-1em");

          chart.selectAll('rect').on("click", onClick);
        })
      .on("postRender", resizeSVG)
      .on("postRedraw", resizeSVG);


      // hide y axis
      // $scope.histogram.yAxis().ticks(0); //.tickFormat( function(v) { return ''; } );

      $scope.histogram.render();
    };

    function postLink($scope, ele, attrs, ctrl) {

      $scope.$parent.element = ele;

      $scope.config = {
        dimension: $scope.dimension,
        element: ele,
        size: $scope.window.size,
        groups: $scope.groups,
        groupNames: $scope.window.variables.x.sort(),
        colorScale: $scope.colorScale,
        filter: $scope.formGroups,
        filterEnabled: $scope.window.filterEnabled,
        totalReduced: $scope.totalReduced
      };

      $timeout( function() {
        createSVG($scope, $scope.config);
      });


      $scope.deregisters = [];

      var reRenderUnbind = $rootScope.$on('window-handler.rerender', function(event, winHandler, config) {
        if( winHandler == $scope.window.handler ) {
          if( config.omit == 'histogram' ) { return; }
          $timeout( function() {
            if(config.compute) {
              if($scope.histogram) {
                $scope.histogram.resetSvg();
                $scope.$parent.element.find('svg').remove();
                $scope.compute();
                createSVG($scope, $scope.config);
              }
              else {
                $scope.redraw();
              }
            }
            else {
              if( $scope.histogram ) {
                $scope.histogram.redraw();
              }
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