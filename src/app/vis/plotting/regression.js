angular.module('plotter.vis.plotting.regression', 
  [
  'services.dimensions',
  'services.dataset',
  'services.variable',
  'services.window',
  'plotter.vis.windowing',
  'services.notify',
  'services.regression.ww',
  'ext.lodash'
  ])

.constant('REGRESSION_WIDTH', 450)

.controller('RegressionPlotController', function RegressionPlotController($scope, $log, 
  DatasetFactory, VariableService, FilterService, _,
  REGRESSION_WIN_X_PX, REGRESSION_WIN_Y_PX, REGRESSION_WIDTH) {
  function windowSize(width, height) {
    var x = Math.round(width/REGRESSION_WIN_X_PX) + 1,
    y = Math.ceil(height/REGRESSION_WIN_Y_PX) + 5;
    $log.debug("Regression window size is", x, y);
    $scope.window.size({
      x: x,
      y: y
    });
  }

  $scope.drawChart = function($scope, data, variables) {
    var width = REGRESSION_WIDTH,
    height;

    $scope.chart = new RegressionChart()
    .element( $scope.element[0] )
    .width(width)
    .data(data)
    .groupLookupCallback(function groupLookup(order) {
      return VariableService.getGroup(order);
    })
    .header([
      { 'title': 'Outcome variable', 'content': [$scope.window.extra().computation.input.target[0].labelName()] },
      { 'title': 'Covariates', 'content': _.map($scope.window.extra().computation.input.adjust,
        function(v) { return v.labelName(); })
      }
    ])
    .axisLabel("SD increment in outcome variable per 1-SD increment in exposure variable")
    .circleColors(FilterService.getSOMColorScale())
    .datasetColors(DatasetFactory.getColorScale())
    .colorAccessor(function(name, colorScale) {
      var key = colorScale.getAccessor(name),
      color = colorScale.scale()(key);
      return color;
    });

    height = $scope.chart.estimatedHeight();
    windowSize(width, height);

    $scope.chart.render();
  };

  $scope.updateChart = function($scope, data) {
    if(data) {
      $scope.chart
      .data(data);
    }

    var height = $scope.chart.estimatedHeight(),
    width = REGRESSION_WIDTH;

    windowSize(width, height);
    $scope.chart.render();
  };

})

.directive('plRegression', function plRegression($timeout, $log, $rootScope, 
  DatasetFactory, RegressionService, NotifyService, VariableService,
  EXPORT_CONFIG, EXPORT_FILENAME_MAX_LENGTH) {

  function postLink($scope, ele, attrs, ctrl) {
    function initDropdown() {
      var selector = _.template('#<%= id %> <%= element %>.<%= cls %>'),
      id = $scope.element.parent().attr('id');

      // empty the dropdown just-in-case
      $scope.window.dropdown([]);

      function getTSVVariables(payload) {
        return _.chain(payload.input)
        .map(function(vars, key) {
          return [key, Utils.pickVariableNames(vars)];
        })
        .zipObject()
        .value();
      }

      function getTSVResults(results) {
        function getIndividual(res) {
          return {
            variable: res.variable.name(),
            result: res.result.success === true ? true : false,
            payload: res.payload
          };
        }

        return _.map(results, getIndividual);
      }

      var sendFile = function(b64, url, filename) {
        //create a hidden form that is submitted to get the file.
        var form = angular.element('<form/>')
          .attr('action', url)
          .attr('method', 'POST');

        var input = angular.element('<input/>')
          .attr('name', 'payload')
          .attr('value', b64)
          .attr('type', 'hidden');
        var input2 = angular.element('<input/>')
          .attr('name', 'filename')
          .attr('type', 'text')
          .attr('value', filename)
          .attr('type', 'hidden');

        form.append(input);
        form.append(input2);

        angular.element(document).find('body').append(form);
        //$scope.element.parent().append(form);
        form.submit();
        form.remove();
      };

      function getFileName(windowInst) {
        function getVariables(variables) {
          var hasX = !_.isUndefined(variables.x),
            hasY = !_.isUndefined(variables.y),
            hasTarget = !_.isUndefined(variables.target);

          if (hasX && hasY) {
            return _.template('X_<%= x %>_Y_<%= y %>')({
              x: variables.x.labelName(),
              y: variables.y.labelName()
            });
          }
          if (hasTarget) {
            var template = _.template('target_<%= target %>_association_<%= assoc %>_vars_adjusted_<%= adjust %>_vars');
            return template({
              target: _.first(variables.target).name(),
              assoc: variables.association.length,
              adjust: variables.adjust.length
            });
          } else {
            if(_.isArray(variables)) {
              return _.map(variables, function(v) { return v.labelName(); })
              .join("_");
            } else {
              return variables.name();
            }
          }
        }
        var setNames = _.map(DatasetFactory.activeSets(),
            function(set) {
              return set.name();
            }).join("_"),
          template = _.template('<%= type %>_of_<%= variable %>_on_<%= datasets %>'),
          fullLength = template({
            type: windowInst.figure(),
            variable: getVariables(windowInst.variables()),
            datasets: setNames
          });

        return _.trunc(fullLength, {
          'length': EXPORT_FILENAME_MAX_LENGTH,
          'omission': '[...]'
        });
      }

      $scope.window.addDropdown({
        type: "export:svg",
        selector: selector({ id: id, element: 'svg', cls: 'regression' }),
        scope: $scope,
        source: 'svg',
        window: $scope.window
      });

      $scope.window.addDropdown({
        type: "export:png",
        selector: selector({ id: id, element: 'svg', cls: 'regression' }),
        scope: $scope,
        source: 'svg',
        window: $scope.window
      });

      $scope.window.addDropdown({
        type: "export:tsv",
        scope: $scope,
        window: $scope.window,
        callback: function() {
          var payload = $scope.window.extra().computation,
          output = {},
          exportStr,
          b64str,
          filename = getFileName($scope.window),
          url = EXPORT_CONFIG.tsv;

          output.input = getTSVVariables(payload);
          output.results = getTSVResults(payload.result);
          output.datasets = _.map(payload.result[0].payload, function(pay) { return pay.name; });

          exportStr = JSON.stringify(output);

          b64str = btoa(unescape(encodeURIComponent(exportStr)));
          sendFile(b64str, url, filename);
        }
      });

    }

    function updateChart() {
      var selectedVariables = $scope.window.extra().computation.input;
      NotifyService.addTransient('Regression analysis started', 'Regression analysis computation started.', 'info');
      RegressionService.compute({ variables: selectedVariables, source: $scope.window.extra().source }, $scope.window)
      .then(function succFn(result) {
        NotifyService.addTransient('Regression analysis completed', 'Regression chart ready.', 'success');
        $scope.window.extra()['computation'] = result;
        $scope.updateChart($scope, $scope.window.extra().computation.result);
      }, function errFn(result) {
        NotifyService.addTransient('Regression computation failed', 'Something went wrong while updating the regression chart.', 'error');
          // $scope.window.handler.removeByType('pl-regression');
        })
      .finally(function() {
      });
    }

    $scope.element = ele;

    VariableService.getVariables().then(function(variables) {
      RegressionService.compute({ variables: $scope.window.variables(), source: $scope.window.extra().source }, $scope.window)
      .then(function succFn(result) {
        $scope.window.extra()['computation'] = result;
        $scope.drawChart($scope, $scope.window.extra().computation.result, variables);
      }, function errFn(result) {
          // NotifyService.addTransient('Regression computation failed', 'Something went wrong while updating the regression chart.', 'error');
        })
      .finally(function() {
      });
    });

    $scope.deregisters = [];

    var reRenderUnbind = $rootScope.$on('window-handler.rerender', function(event, winHandler, config) {
      if( winHandler == $scope.window.handler() ) {
        $timeout( function() {
          updateChart();
        });
      }
    });

    var redrawUnbind =  $rootScope.$on('window-handler.redraw', function(event, winHandler) {
      if( winHandler == $scope.window.handler() ) {
        $timeout( function() {
          updateChart();
        });
      }
    });

    $scope.deregisters.push(reRenderUnbind, redrawUnbind);

    $scope.$on('$destroy', function() {
      _.each($scope.deregisters, function(unbindFn) {
        unbindFn();
      });
      if($scope.chart) {
        $scope.chart.remove();
      }
    });

    ele.on('$destroy', function() {
      $scope.$destroy();
    });

    initDropdown();
  }

  return {
    restrict: 'C',
    controller: 'RegressionPlotController',
    link: {
      post: postLink
    }
  };

});