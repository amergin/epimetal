var visu = angular.module('plotter.vis.plotting.classedbarchart', 
  [
  'ui.router',
  'services.dimensions',
  'services.dataset',
  'services.som',
  'services.window'
  ]);
visu.controller('ClassedBarChartPlotController', ['$scope', '$rootScope', 'DimensionService', 'DatasetFactory', 'constants', '$state', '$injector', '$timeout',
  function ClassedBarChartPlotController($scope, $rootScope, DimensionService, DatasetFactory, constants, $state, $injector, $timeout) {

    $scope.dimensionService = $scope.$parent.window.handler.getDimensionService();
    $scope.dimensionInst = $scope.dimensionService.classHistogramDimension($scope.window.variables.x);
    $scope.dimension = $scope.dimensionInst.get();
    $scope.groupInst = null;
    $scope.totalGroupInst = null;

    if( $scope.window.somSpecial ) {
      $scope.primary = $injector.get('DimensionService').getPrimary();
      $scope.totalDimensionInst = $scope.primary.getDimension($scope.window.variables);
      $scope.totalDimension = $scope.totalDimensionInst.get();
    }

    $scope.$parent.resetFilter = function() {
      $scope.chart.filterAll();
      $scope.window.handler.redrawAll();
    };

    $scope.redraw = function() {
      // only redraw if the dashboard is visible
      if( $state.current.name === $scope.window.handler.getName() ) {
        $scope.computeExtent();
        $scope.chart.x(d3.scale.linear().domain($scope.extent).range([0, $scope.noBins]));
        $scope.chart.render();
      }
    };

    // share information with the plot window
    $scope.$parent.headerText = ['Histogram of', $scope.window.variables.x, ''];
    $scope.$parent.showResetBtn = false;

    $scope.computeExtent = function() {
      // remove older ones
      if($scope.groupInst) { $scope.groupInst.decrement(); }
      if($scope.totalGroupInst) { $scope.totalGroupInst.decrement(); }

      // var allValues;
      // if( $scope.window.somSpecial ) {
      //   allValues = $scope.totalDimension.group().all().filter( function(d) {
      //     return d.value > 0 && d.key != constants.nanValue;
      //   });
      // }
      // else {
      //   allValues = $scope.dimension.group().all().filter(function(d) {
      //     return d.value > 0 && d.key != constants.nanValue;
      //   });
      // }

      // $scope.extent = d3.extent(allValues, function(d) {
      //   return d.key;
      // });

$scope.extent = [0, d3.max($scope.dimension.group().all(), function(d) { return d.value; } )];

$scope.groupInst = $scope.dimensionInst.groupDefault();

if( $scope.window.somSpecial ) {
        // circle
        // $scope.dimensionService.getReducedGroupHistoDistributions($scope.groupInst, $scope.window.variables.x);
        // $scope.reduced = $scope.groupInst.get();

        // $scope.totalGroupInst = $scope.totalDimensionInst.group(function(d) {
        //   return Math.floor(d / $scope.binWidth) * $scope.binWidth;
        // });
        // // total
        // $scope.primary.getReducedGroupHisto($scope.totalGroupInst, $scope.window.variables.x);
        // $scope.totalReduced = $scope.totalGroupInst.get();
      }
      else {
        $scope.dimensionService.getReducedGroupHisto($scope.groupInst, $scope.window.variables.x);
        $scope.reduced = $scope.groupInst.get();
      }

      if($scope.chart) {
        $scope.chart.group($scope.filterOnSet($scope.reduced));
      }

      console.log("histogram extent is ", $scope.extent, "on windowHandler = ", $scope.window.handler.getName(), "variable = ", $scope.window.variables.x);
    };

    $scope.computeExtent();

    // individual charts that are part of the composite chart
    $scope.barCharts = {};

    if( $scope.window.somSpecial ) {
      var somId = $injector.get('SOMService').getSomId();
      var filters = $injector.get('FilterService').getSOMFilters();
      $scope.groupNames = _.map(filters, function(f) { return f.id(); } );
      $scope.colorScale = $injector.get('FilterService').getSOMFilterColors();

    } else {
      $scope.groupNames = DatasetFactory.getSetNames();
      $scope.colorScale = DatasetFactory.getColorScale();      
    }

    // see https://github.com/dc-js/dc.js/wiki/FAQ#filter-the-data-before-its-charted
    // this used to filter to only the one set & limit out NaN's
    $scope.filterOnSet = function(group, name) {
      return {
        'all': function() {
          // special
          if( $scope.window.somSpecial && name != 'total' ) {
            // var ret = _.chain(group.all())
            // .reject(function(grp) { return grp.key < constants.legalMinValue; })
            // .map(function(grp) {
            //   var lookup = {};

            //   // for each bmu coordinate
            //   _.each(grp.value.counts, function(countObj, id) {
            //     if( id == 'total' ) { return; } // continue
            //     var circles = $injector.get('FilterService').inWhatCircles(countObj.bmu);

            //     // that may exist in many circle filters
            //     _.each(circles, function(circleId) {
            //       if( !lookup[circleId] ) { lookup[circleId] = 0; }
            //       // add the amount info
            //       lookup[circleId] = lookup[circleId] + countObj.count;
            //     });

            //   });
            //   return {
            //     key: grp.key,
            //     value: {
            //       counts: angular.extend(lookup, { total: grp.value.counts.total })
            //     }
            //   };
            // })
            // .reject(function(grp) { return grp.value.counts[name] === 0; })
            // .value();

            // return ret;
          } else {
            var legalGroups = group.all().filter(function(d) {
              return (d.value.counts[d.key.dataset] > 0) && (d.key.valueOf() !== constants.nanValue);
            }),
            info = DatasetFactory.getVariable($scope.window.variables.x),
            ret = [];

            _.each(legalGroups, function(group) {
              ret.push({
                key: _.extend(group.key, { name: info.unit[Number(group.key.classed).toString()] }),
                value: group.value
              });
            });

            return ret;            

            // var legalGroups = group.all().filter(function(d) {
            //   return (d.value.counts[name] > 0) && (d.key.valueOf() !== constants.nanValue);
            // }),
            // info = DatasetFactory.getVariable($scope.window.variables.x),
            // ret = [];

            // _.each(legalGroups, function(group) {
            //   ret.push({
            //     key: _.extend(group.key, { name: info.unit[Number(group.key.classed).toString()] }),
            //     value: group.value
            //   });
            // });

            // return ret;
          }
        }
      };
    };

    $scope.draw = function(config) {

      var resizeSVG = function(chart) {
        var ratio = config.size.aspectRatio === 'stretch' ? 'none' : 'xMinYMin';
        chart.select("svg")
        .attr("viewBox", "0 0 " + [config.size.width, config.size.height].join(" ") )
        .attr("preserveAspectRatio", ratio)
        .attr("width", "100%")
        .attr("height", "100%");
      };

      var plainchart = function() {
        $scope.chart = dc.rowChart(config.element)
        // .gap(10)
        .elasticX(true)
        .label(function(d) {
          var name = _.capitalize(d.key.name);
          return [name, ", count: ", d.value.counts[d.key.dataset]].join("");
        })
        .title(function(d) {
          return ['Dataset: ' + d.key.dataset,
          'Category: ' + d.key.name
          ].join("\n");
        })
        .renderTitleLabel(false)
        .titleLabelOffsetX(5)
        .width(config.size.width)
        .height(config.size.height)
        .x(d3.scale.linear().domain(config.extent))
        .renderLabel(true)
        .dimension(config.dimension)
        .colorAccessor(function(d) {
          return d.key.dataset;
        })
        .group(config.filter(config.reduced))
        .valueAccessor(function(d) {
          return d.value.counts[d.key.dataset];
        })
        .colors(config.colorScale)
        .on("postRender", resizeSVG)
        .on("postRedraw", resizeSVG)
        .addFilterHandler(function(filters, filter) {
          function defaultFn(filters, filter) {
            filters.push(filter);
            return filters;
          }

          function custom(filters, filter) {
            $timeout(function() {
              $injector.get('FilterService').addClassedFilter({ 'type': 'classed', 'filter': filter,
                'var': $scope.window.variables.x, 'id': $scope.window._winid,
                'chart': $scope.chart
              });
            });
          }

          custom.apply(this, arguments);
          return defaultFn.apply(this, arguments);
        })
        .removeFilterHandler(function(filters, filter) {
          function defaultFn(filters, filter) {
            for (var i = 0; i < filters.length; i++) {
              if (filters[i] <= filter && filters[i] >= filter) {
                filters.splice(i, 1);
                break;
              }
            }
            return filters;
          }

          function custom(filters, filter) {
            $timeout(function() {
              $injector.get('FilterService').removeClassedFilter({ id: $scope.window._winid, filter: filter });
            });
          }

          custom.apply(this, arguments);
          return defaultFn.apply(this, arguments);
        });

      };

        plainchart();
        $scope.chart.render();

    };



}]);

visu.directive('classedBarChart', ['constants', '$timeout', '$rootScope', '$injector',

  function(constants, $timeout, $rootScope, $injector) {
    function postLink($scope, ele, attrs, ctrl) {

      $scope.$parent.element = ele;

      var config = {
        element: ele[0],
        poolingColor: '#000000',
        size: $scope.window.size,
        extent: $scope.extent,
        pooled: $scope.window.pooled || false,
        filter: $scope.filterOnSet,
        filterEnabled: $scope.window.filterEnabled,
        groupNames: $scope.groupNames,
        colorScale: $scope.colorScale,
        dimension: $scope.dimension,
        reduced: $scope.reduced,
        somSpecial: $scope.window.somSpecial,
        chartGroup: $scope.window.somSpecial ? constants.groups.histogram.nonInteractive : constants.groups.histogram.interactive,
        variable: $scope.window.variables.x
      };

      $timeout(function() {
        $scope.draw(config);
      });

      $scope.deregisters = [];

      var resizeUnbind = $rootScope.$on('gridster.resize', function(event,$element) {
        // if( $element.is( $scope.$parent.element.parent() ) ) {
        //   $scope.chart.render();
        // }
      });

      var reRenderUnbind = $rootScope.$on('window-handler.rerender', function(event, winHandler, config) {
        if( winHandler == $scope.window.handler ) {
          $scope.chart.group($scope.filterOnSet($scope.reduced));
          $scope.chart.redraw();
          // $timeout( function() {
          //   if(config.compute) {
          //     $scope.redraw();

          //     if(!$scope.somSpecial) {
          //       var oldFilters = $scope.chart.filters();
          //       $scope.chart.filter(null);
          //       _.each(oldFilters, function(filter) {
          //         $scope.chart.filter(filter);
          //       });
          //       $scope.chart.redraw();
          //     }
          //   }
          //   else {
          //     $scope.chart.redraw();
          //   }
          // });
    }
  });

      var redrawUnbind = $rootScope.$on('window-handler.redraw', function(event, winHandler) {
        if( winHandler == $scope.window.handler ) {
          $timeout( function() {
            $scope.chart.redraw();
          });
        }
      });

      var gatherStateUnbind =  $rootScope.$on('UrlHandler:getState', function(event, callback) {
        var retObj = _.chain($scope.window)
        .pick(['type', 'grid', 'pooled', 'variables', 'handler'])
        .clone()
        .extend({ filters: $scope.chart.filters()[0] || [] })
        .value();

        callback(retObj);
      });

      $scope.deregisters.push(resizeUnbind, reRenderUnbind, redrawUnbind, gatherStateUnbind);

      $scope.$on('$destroy', function() {
        console.log("destroying histogram for", $scope.window.variables.x);
        _.each($scope.deregisters, function(unbindFn) {
          unbindFn();
        });

        $scope.groupInst.decrement();
        if($scope.window.somSpecial) { $scope.totalGroupInst.decrement(); }
        $scope.dimensionInst.decrement();
      });

      ele.on('$destroy', function() {
        $scope.$destroy();
      });

    }

    return {
      scope: false,
      restrict: 'C',
      controller: 'ClassedBarChartPlotController',
      link: {
        post: postLink
      }
    };
  }
  ]);