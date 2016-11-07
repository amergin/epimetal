angular.module('plotter.vis.plotting.regression', 
  [
  'services.dimensions',
  'services.dataset',
  'services.variable',
  'services.window',
  'services.notify',
  'services.regression.ww',
  'ext.lodash'
  ])

.constant('REGRESSION_WIDTH', 450)
.constant('REGRESSION_DEFAULT_X', 9)
.constant('REGRESSION_DEFAULT_Y', 4)

.controller('RegressionPlotController', function RegressionPlotController($scope, DatasetFactory, VariableService, REGRESSION_WIN_X_PX, REGRESSION_WIN_Y_PX, REGRESSION_WIDTH, FilterService, _) {
  function windowSize(width, height) {
    $scope.window.size({
      x: Math.round(width/REGRESSION_WIN_X_PX) + 1,
      y: Math.round(height/REGRESSION_WIN_Y_PX) + 1
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
      { 'title': 'Target variable', 'content': [$scope.window.extra().computation.input.target[0].labelName()] },
      { 'title': 'Adjust variables', 'content': _.map($scope.window.extra().computation.input.adjust,
        function(v) { return v.labelName(); })
      }
    ])
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

.directive('plRegression', function plRegression($timeout, $rootScope, DatasetFactory, RegressionService, NotifyService, VariableService) {

  function postLink($scope, ele, attrs, ctrl) {
    function initDropdown() {
      var selector = _.template('#<%= id %> <%= element %>.<%= cls %>'),
      id = $scope.element.parent().attr('id');

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


    /* function renderWithNewDimensions() {
      function setSize() {
        $scope.size = angular.copy($scope.window.size()); 
      }

      $scope.updateChart($scope);
      setSize();
    }

    function setResize() {
      function setSize() {
        $scope.size = angular.copy($scope.window.size()); 
      }

      var resizeUnbind = $scope.$on('gridster-item-transition-end', function(item) {
        function gridSizeSame() {
          return _.isEqual($scope.size, $scope.window.size());
        }
        if(!gridSizeSame()) {
          renderWithNewDimensions();
        }
      });

      setSize();
      $scope.deregisters.push(resizeUnbind);
    }

    setResize();

    function setResizeElement() {
      var renderThr = _.debounce(function() {
        renderWithNewDimensions();
      }, 150, { leading: false, trailing: true });

      var resizeUnbind = $scope.$on('gridster-resized', function(sizes, gridster) {
        var isVisible = _.contains($injector.get('WindowHandler').getVisible(), $scope.window.handler());
        if(!isVisible) { return; }
        renderThr();
      });
    }

    setResizeElement();
    */

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