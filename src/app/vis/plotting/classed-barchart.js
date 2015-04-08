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

    $scope.isSpecial = function() {
      return $scope.window.somSpecial;
    };

    $scope.addStateFilters = function() {
      if(!$scope.window.filters) { return; }
      _.each($scope.window.filters, function(filter) {
        if(!$scope.isSpecial()) {
          filter.valueOf = function() {
            return _.isUndefined(this.classed) ? constants.nanValue : this.classed + "|" + this.dataset;
          };
        }
        $scope.chart.filter(filter);
      });
    };

    function initSOMSpecial() {
      $scope.primary = $injector.get('DimensionService').getPrimary();
      $scope.totalDimensionInst = $scope.primary.getDimension($scope.window.variables);
      $scope.totalDimension = $scope.totalDimensionInst.get();
      $scope.dimensionInst = $scope.dimensionService.getDimension($scope.window.variables);
      $scope.dimension = $scope.dimensionInst.get();
      $scope.groupInst = $scope.dimensionInst.groupDefault();

      $scope.dimensionService.getReducedGroupHistoDistributions($scope.groupInst, $scope.window.variables.x);
      $scope.reduced = $scope.groupInst.get();
      // total will always have largest count
      $scope.extent = [0, $scope.totalDimensionInst.groupAll().get().reduceCount().value()];

      var filters = $injector.get('FilterService').getSOMFilters();
      $scope.groupNames = _.map(filters, function(f) { return f.id(); } );
      $scope.colorScale = $injector.get('FilterService').getSOMFilterColors();
    }

    function initDefault() {
      $scope.dimensionInst = $scope.dimensionService.classHistogramDimension($scope.window.variables.x);
      $scope.dimension = $scope.dimensionInst.get();
      $scope.groupInst = $scope.dimensionInst.groupDefault();

      $scope.dimensionService.getReducedGroupHisto($scope.groupInst, $scope.window.variables.x);
      $scope.reduced = $scope.groupInst.get();
      $scope.extent = [0, d3.max($scope.dimension.group().all(), function(d) { return d.value; } )];

      $scope.groupNames = DatasetFactory.getSetNames();
      $scope.colorScale = DatasetFactory.getColorScale();
    }

    if( $scope.isSpecial() ) {
      initSOMSpecial();
    } else {
      initDefault();
    }

    $scope.$parent.resetFilter = function() {
      $scope.chart.filterAll();
      $scope.window.handler.redrawAll();
      $scope.window.showResetBtn = false;
    };

    // share information with the plot window
    $scope.$parent.headerText = ['Histogram of', $scope.window.variables.x, ''];
    $scope.$parent.showResetBtn = false;

    // see https://github.com/dc-js/dc.js/wiki/FAQ#filter-the-data-before-its-charted
    // this used to filter to only the one set & limit out NaN's
    $scope.filterSOMSpecial = function(group) {
      var FilterService = $injector.get('FilterService'),
      info = DatasetFactory.getVariable($scope.window.variables.x);

      function getCircleLookup(grp) {
        var lookup = {};
        // for each bmu coordinate
        _.each(grp.value.counts, function(countObj, id) {
          if( id == 'total' ) { return; } // continue
          var circles = FilterService.inWhatCircles(countObj.bmu);

          // that may exist in many circle filters
          _.each(circles, function(circleId) {
            if( !lookup[circleId] ) { 
              lookup[circleId] = {
                count: 0,
                circle: FilterService.getSOMFilter(circleId)
              };
            }
            // add the amount info
            lookup[circleId].count = lookup[circleId].count + countObj.count;
          });

        });
        return lookup;
      }

      function getReturnObj(group, name, valObj) {
        return {
          key: {
            classed: group.key,
            name: info.unit[Number(group.key).toString()]
          }, 
          value: {
            type: 'circle',
            circle: valObj.circle,
            count: valObj.count
          }
        };
      }

      function getTotalObj() {
        return {
          key: {
            classed: NaN,
            name: 'Total'
          },
          value: {
            type: 'total',
            count: $scope.totalDimension.groupAll().value()
          }
        };
      }

      return {
        all: function() {
          var ret = [];

          _.chain(group.all())
          .reject(function(grp) { return grp.key < constants.legalMinValue; })
          .each(function(grp) {
            var lookup = getCircleLookup(grp);
            _.each(lookup, function(val, key, obj) {
              ret.push(getReturnObj(grp, key, val));
            });
          })
          .value();

          // add total
          ret.push(getTotalObj());

          return ret;  
        }
      };
    };

    $scope.filterDefault = function(group) {
      return {
        'all': function() {
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
        }
      };
    };

    $scope.drawSOMSpecial = function(config) {
      var resizeSVG = function(chart) {
        var ratio = config.size.aspectRatio === 'stretch' ? 'none' : 'xMinYMin';
        chart.select("svg")
        .attr("viewBox", "0 0 " + [config.size.width, config.size.height].join(" ") )
        .attr("preserveAspectRatio", ratio)
        .attr("width", "100%")
        .attr("height", "100%");
      };

      var plainchart = function() {
        $scope.chart = dc.rowChart(config.element, config.chartGroup)
        .elasticX(true)
        .label(function(d) {
          var name = _.capitalize(d.key.name),
          arr = [name, ", count: ", d.value.count],
          label = d.value.type == 'total' ? undefined : " (circle " + d.value.circle.name() + ")";
          arr.push(label);
          return arr.join("");
        })
        .title(function(d) {
          var label = d.value.type == 'total' ? undefined : 'Circle: ' + d.value.circle.name(),
          arr = [label,
          'Category: ' + d.key.name,
          'Count: ' + d.value.count];
          return arr.join("\n");
        })
        .renderTitleLabel(false)
        .titleLabelOffsetX(5)
        .width(config.size.width)
        .height(config.size.height)
        .x(d3.scale.linear().domain(config.extent))
        .renderLabel(true)
        .dimension(config.dimension)
        .colorAccessor(function(d) {
          return d.value.type == 'total' ? 'total' : d.value.circle.id();
        })
        .group(config.filter(config.reduced))
        .valueAccessor(function(d) {
          return d.value.count;
        })
        .colors(config.colorScale)
        .on("postRender", resizeSVG)
        .on("postRedraw", resizeSVG)
        .ordering(function(d) {
          return d.value.type == 'total' ? 'total|' : d.value.circle.id() + "|" + d.key.name;
        });

        // disable filtering
        $scope.chart.onClick = function() {};

      };

      plainchart();

    };


    $scope.drawDefault = function(config) {
      var resizeSVG = function(chart) {
        var ratio = config.size.aspectRatio === 'stretch' ? 'none' : 'xMinYMin';
        chart.select("svg")
        .attr("viewBox", "0 0 " + [config.size.width, config.size.height].join(" ") )
        .attr("preserveAspectRatio", ratio)
        .attr("width", "100%")
        .attr("height", "100%");
      };

      var plainchart = function() {
        $scope.chart = dc.rowChart(config.element, config.chartGroup)
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
                'chart': $scope.chart });
              $scope.window.handler.getService().redrawVisible();
              $scope.window.showResetBtn = true;
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
              $scope.window.handler.getService().redrawVisible();
              var hideButton = $scope.chart.filters().length === 0;
              if(hideButton) { $scope.window.showResetBtn = false; }
            });
          }

          custom.apply(this, arguments);
          return defaultFn.apply(this, arguments);
        })
        .resetFilterHandler(function(filters) {
          $timeout(function() {
            _.each(filters, function(filter) {
              $injector.get('FilterService').removeClassedFilter({ id: $scope.window._winid, filter: filter });
            });
            $scope.window.handler.getService().redrawVisible();
          });
          return [];
        });

      };

      plainchart();
    };



}]);

visu.directive('classedBarChart', ['constants', '$timeout', '$rootScope', '$injector',

  function(constants, $timeout, $rootScope, $injector) {
    function postLink($scope, ele, attrs, ctrl) {

      $scope.$parent.element = ele;
      var drawFunction = null,
      config;

      if($scope.isSpecial()) {
        drawFunction = $scope.drawSOMSpecial;
        config = {
          element: ele[0],
          size: $scope.window.size,
          extent: $scope.extent,
          filter: $scope.filterSOMSpecial,
          groupNames: $scope.groupNames,
          colorScale: $scope.colorScale,
          dimension: $scope.dimension,
          reduced: $scope.reduced,
          chartGroup: constants.groups.histogram.nonInteractive,
          variable: $scope.window.variables.x
        };

      } else {
        config = {
          element: ele[0],
          size: $scope.window.size,
          extent: $scope.extent,
          filter: $scope.filterDefault,
          groupNames: $scope.groupNames,
          colorScale: $scope.colorScale,
          dimension: $scope.dimension,
          reduced: $scope.reduced,
          chartGroup: constants.groups.histogram.interactive,
          variable: $scope.window.variables.x
        };
        drawFunction = $scope.drawDefault;
      }

      $timeout(function() {
        drawFunction(config);
        $scope.addStateFilters();
        $scope.chart.render();
      });


      $scope.deregisters = [];

      var resizeUnbind = $rootScope.$on('gridster.resize', function(event,$element) {
        // if( $element.is( $scope.$parent.element.parent() ) ) {
        //   $scope.chart.render();
        // }
      });

      var reRenderUnbind = $rootScope.$on('window-handler.rerender', function(event, winHandler, config) {
        if( winHandler == $scope.window.handler ) {

          $timeout(function() {
            if($scope.isSpecial()) {
              $scope.chart.group($scope.filterSOMSpecial($scope.reduced));
            } else {
              $scope.chart.group($scope.filterDefault($scope.reduced));
            }
          });
          $scope.chart.redraw();
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
        .pick(['type', 'grid', 'somSpecial', 'variables', 'handler'])
        .clone()
        .extend({ filters: $scope.chart.filters() || [] }) //$scope.chart.filters()[0] || [] })
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
        if($scope.isSpecial()) { 
          $scope.totalDimensionInst.decrement();
        }
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