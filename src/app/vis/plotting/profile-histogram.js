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

    $scope.dimensionInst = $scope.dimensionService.getVariableBMUDimension();
    $scope.dimension = $scope.dimensionInst.get();
    $scope.totalDimensionInst = DimensionService.getPrimary().getSampleDimension();
    $scope.totalDimension = $scope.totalDimensionInst.get();
    $scope.groups = {};
    $scope.groupsInst = {};
    $scope.totalReduced = {};
    $scope.totalReducedInst = {};

    _.each( $scope.window.variables.x, function(variable) {

      var groupInst = $scope.dimensionInst.group( function(d) {
        return {
          variable: variable,
          bmu: d.bmu,
          valueOf: function() {
            return d.valueOf();
          }
        };
      }, true );
      $scope.groupsInst[variable] = groupInst;
      $scope.groups[variable] = $scope.dimensionService.getReducedMean(groupInst, variable).get();
      var groupAll = $scope.totalDimensionInst.groupAll();
      $scope.totalReducedInst[variable] = groupAll;
      $scope.totalReduced[variable] = DimensionService.getPrimary().getReducedSTD( groupAll, variable ).get();
    });

    $scope.filterOnSet = function(group, variable, totalReduced) {
      var circleLookup = {},
      groups;

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

      groups = _.chain(circleLookup)
      .map(function(groups, circleId) {
        var circle = FilterService.getSOMFilter(circleId);
        var constant = 100;
        var obj = {
          name: circle.name(),
          value: 0,
          custom: {
            variable: variable,
            circle: circle,
            sum: 0,
            mean: 0,
            n: 0,
            total: {
              std: 0,
              mean: 0
            }
          }
        };

        _.each(groups, function(grp) {
          obj.custom.sum += (grp.group.value.mean * grp.group.value.n);
          obj.custom.n += grp.group.value.n;
        });
        obj.custom.mean = obj.custom.sum / obj.custom.n;
        var totalVal = totalReduced.value();
        obj.custom.total.std = totalVal.valueOf().stddev;
        obj.custom.total.mean = totalVal.valueOf().mean;
        obj.value = ( obj.custom.mean - obj.custom.total.mean ) / ( obj.custom.total.std * constant );
        return obj;
      })
      .value();

      return groups;
    };

    $scope.formGroups = function(groups) {
      var ret = _.chain(groups)
      .map(function(group, variable) {
        return {
          name: variable,
          groups: $scope.filterOnSet(group, variable, $scope.totalReduced[variable])
        };
      })
      .value();

      return ret;
    };


  }
  ]);

visu.directive('profileHistogram', ['constants', '$timeout', '$rootScope', '$injector',
  function(constants, $timeout, $rootScope, $injector) {

    var PlotService = $injector.get('PlotService');

    var createChart = function($scope, config) {
      var tooltip = function(d) {
        return [
        "<strong>Variable</strong>: " + "<span class='tooltip-val'>" + d.custom.variable + "</span>",
        "<strong>Circle filter</strong>: " + "<span class='tooltip-val'>" + d.name + "</span>",
        "<strong>Mean of " + d.custom.variable + "</strong>: " + "<span class='tooltip-val'>" + d3.round(d.custom.mean,3) + "</span>",
        "<strong>STD (all samples)</strong>: " + "<span class='tooltip-val'>" + d3.round(d.custom.total.std, 3) + "</span>",
        "<strong>Sample count</strong>: " + "<span class='tooltip-val'>" + d.custom.n + "</span>"
        ].join("<br>");
      };
      $scope.histogram = new GroupedBarChart($scope.$parent.element[0], config.size.width, config.size.height)
      .yLabel('')
      .colors(config.colors)
      .data(config.data)
      .rotate(true)
      .tooltip(tooltip)
      .colorAccessor(function(d, colors) {
        return colors(d.custom.circle.id());
      })
      .onClick(function(d) {
        var config = {
          variables: { x: d.custom.variable },
          pooled: false,
          somSpecial: true
        };
        // remove the old histogram window, if any
        $scope.window.handler.removeByType('histogram');
        // draw a new one
        PlotService.drawHistogram( config, $scope.window.handler );

      })
      .yAxisDisabled(true)
      .legendDisabled(true)
      .render();
    };

    var updateChart = function($scope, config) {
      $scope.histogram
      .data(config.data)
      .render();
    };

    function postLink($scope, ele, attrs, ctrl) {

      $scope.$parent.element = ele;

      var config = {
        data: $scope.formGroups($scope.groups),
        size: $scope.window.size,
        colors: $scope.colorScale
      };

      createChart($scope, config);
      $scope.deregisters = [];

      var reRenderUnbind = $rootScope.$on('window-handler.rerender', function(event, winHandler, config) {
        if( winHandler == $scope.window.handler ) {
          if( config.omit == 'histogram' ) { return; }
          $timeout( function() {
            updateChart($scope, { data: $scope.formGroups($scope.groups) });
          });
        }
      });

      var redrawUnbind =  $rootScope.$on('window-handler.redraw', function(event, winHandler) {
        if( winHandler == $scope.window.handler ) {
          $timeout( function() {
            updateChart($scope, { data: $scope.formGroups($scope.groups) });
          });
        }
      });

      $scope.deregisters.push(reRenderUnbind, redrawUnbind);

      $scope.$on('$destroy', function() {
        _.each($scope.deregisters, function(unbindFn) {
          unbindFn();
        });
        _.each( $scope.groupsInst, function(grp) {
          grp.decrement();
        });
        _.each( $scope.totalReducedInst, function(totalGrp) {
          totalGrp.decrement();
        });
        $scope.dimensionInst.decrement();
        $scope.totalDimensionInst.decrement();
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