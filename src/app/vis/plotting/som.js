angular.module('plotter.vis.plotting.som', [
  'services.dimensions',
  'services.dataset',
  'angularSpinner',
  'ext.d3',
  'ext.lodash'
])

.constant('SOM_PLANE_MARGINS', {
  top: 20,
  right: 30,
  bottom: 20,
  left: 30
})

.constant('SOM_FILTER_TEXT_LENGTH', 3)
.constant('HEXAGON_BORDER_COLOR', '#fff')

.controller('SOMController', function SOMController($scope, $timeout, $rootScope, FilterService, SOM_PLANE_MARGINS, SOM_FILTER_TEXT_LENGTH, HEXAGON_BORDER_COLOR, d3, _) {

  $scope.getHeight = function(ele) {
    return ele.height();
  };

  $scope.getWidth = function(ele) {
    return ele.width();
  };

  $scope.plane = new SOMPlane()
  .margins(SOM_PLANE_MARGINS)
  .circleOpacity(0.40)
  .getSOMFiltersCallback(function() {
    return FilterService.getSOMFilters();
  })
  .injections({
    '_': _,
    'd3': d3
  })
  .circleMoveCallback(function(circleInst) {
    $rootScope.$emit('som:circleFilter:move', circleInst, $scope.window.id());
  })
  .circleResizeCallback(function(circleInst) {
    $rootScope.$emit('som:circleFilter:resize', circleInst, $scope.window.id());
  })
  .highlightColor(HEXAGON_BORDER_COLOR)
  .allowedCircleEdge(1.5)
  .circleTruncateLength(SOM_FILTER_TEXT_LENGTH)
  .circleIsUpdatedCallback(function(hexagons, circleInst) {
    $timeout(function() {
      circleInst.hexagons(hexagons);
      FilterService.updateCircleFilters();
    });
  })
  .circleRadiusSettings({
    normal: function(radius, columns, rows) {
      return radius * (rows / 2);
    },
    min: function(radius, columns, rows) {
      return radius * 1.5;
    },
    max: function(radius, columns, rows) {
      return radius * (rows - 1);
    }
  })
  .highlight($scope.window.extra().highlight || false);
  // don't render here, plane data not yet
  // available

  // watch the header info for possible changes
  // and update accordingly
  $scope.$watch(function() {
    return $scope.window.extra().plane;
  }, function(newVal, oldVal) {
    if (!_.isEqual(newVal, oldVal)) {
      initHeader();
    }
  });

  function initHeader() {
    function getPvalueString() {
      var pvalFormat = d3.format('.2e'),
      threshold = Math.pow(10,-16),
      pvalue = $scope.window.extra().plane.pvalue,
      template = _.template("(P <%= character %> <%= pvalue %>)");

      if(pvalue > threshold) {
        return template({ 'character': '=', 'pvalue': pvalFormat(pvalue) });
      } else {
        return template({ 'character': '<', 'pvalue': threshold });
      }
    }
    
    if($scope.window.extra() && $scope.window.extra().plane) {
      $scope.window.headerText(['SOM of', $scope.window.variables().name(), getPvalueString()]);
    }
  }

  initHeader();

  // no reset button available for planes
  $scope.window.resetButton(false);

  // watch the number of filters and update the SOM circles accordingly
  $scope.$watch(function() {
    return FilterService.getSOMFilters();
  }, function(newArray, oldArray) {
    var chartisDrawn = _.isUndefined($scope.chart),
    hasAddedCircles = newArray.length > oldArray.length,
    hasRemovedCircles = newArray.length < oldArray.length;

    if (hasAddedCircles) {
      var filter = _.last(newArray);
      $scope.plane.addCircle(filter);
    } else if (hasRemovedCircles) {
      // removing a circle/circles
      _.chain(oldArray)
        .select(function(item) {
          return !_.findWhere(newArray, item);
        })
        .each(function(rem) {
          $scope.plane.removeCircle(rem);
        })
        .value();
    }
  }, true);

})

.directive('plSomplane', function plSomplane($injector, $rootScope, SOMService, NotifyService, $timeout, _, d3) {

  function linkFn($scope, ele, iAttrs) {

    function initDropdown() {
      var dropdownInitialized = $scope.window.dropdown().length > 0;
      if(dropdownInitialized) { return; }

      var selector = _.template('#<%= id %> <%= element %>'),
        id = $scope.element.parent().attr('id');

      // add settings for the dropdown:

      $scope.window.addDropdown({
        type: "export:svg",
        selector: selector({
          id: id,
          element: 'svg'
        }),
        scope: $scope,
        source: 'svg',
        window: $scope.window
      });

      $scope.window.addDropdown({
        type: "export:png",
        selector: selector({
          id: id,
          element: 'svg'
        }),
        scope: $scope,
        source: 'svg',
        window: $scope.window
      });

      $scope.window.addDropdown({
        type: "plane-highlight",
        scope: $scope,
        callback: function() {
          // invert the current value
          var highlightHexagons = !$scope.plane.highlight(),
          doRender = true;
          $scope.window.extra().highlight = highlightHexagons;

          // feed it back to the instance, triggering update
          $scope.plane.highlight(highlightHexagons, doRender);
        }
      });      

    }

    function init() {
      NotifyService.addTransient('Starting plane computation', 'The computation may take a while.', 'info');
      $scope.window.circleSpin(true);
      SOMService.getPlane($scope.window.variables(), $scope.window, notify).then(
        function succFn(plane) {
          NotifyService.addTransient('Plane computation ready', 'The requested new plane has now been drawn.', 'success');
          $scope.window.extra({ plane: plane });
          initDropdown();

          $scope.plane
          .element($scope.element)
          .width($scope.getWidth($scope.element))
          .height($scope.getHeight($scope.element))
          .plane(plane)
          .render();

        },
        function errFn(res) {
          if (res == 'not_needed') { return; }
          NotifyService.addTransient('Plane computation failed', res, 'error');
        }, 
        notify)
        .finally(function () {
          $scope.window.circleSpin(false);
          $scope.window.circleSpinValue(0);
        });
    }

    function notify(progress) {
      $scope.window.circleSpinValue(progress);
    }

    $scope.element = ele;

    $scope.deregisters = [];

    function setMoveCircle() {
      var unbind = $rootScope.$on('som:circleFilter:move', function(eve, circleInst, winId) {
        if (winId === $scope.window.id()) {
          return;
        }
        $scope.plane.moveCircle(circleInst);

        $scope.deregisters.push(unbind);
      });
    }

    function setResizeCircle() {
      var unbind = $rootScope.$on('som:circleFilter:resize', function(eve, circleInst, winId) {
        if (winId === $scope.window.id()) {
          return;
        }

        $scope.plane.resizeCircle(circleInst);

        $scope.deregisters.push(unbind);
      });
    }

    function setSOMUpdated() {
      var unbind = $rootScope.$on('dataset:SOMUpdated', function(event, som) {
        $scope.window.circleSpin(true);
        SOMService.getPlane($scope.window.variables(), $scope.window, notify).then(
            function succFn(plane) {
              $scope.window.extra({ plane: plane });
              initDropdown();

              $scope.plane
              .element($scope.element)
              .width($scope.getWidth($scope.element))
              .height($scope.getHeight($scope.element))
              .plane(plane)
              .render();
            },
            function errFn(res) {
              NotifyService.addTransient('Plane computation failed', res, 'danger');
            }, 
            notify)
            .finally(function() {
              $scope.window.circleSpin(false);
              $scope.window.circleSpinValue(0);
            });
      });

      $scope.deregisters.push(unbind);
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

    function renderWithNewDimensions() {
      function setSize() {
        $scope.size = angular.copy($scope.window.size()); 
      }
      var width = $scope.getWidth($scope.element),
      height = $scope.getHeight($scope.element);

      doPlaneRender();
      setSize();
    }

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

    function doPlaneRender() {
      $scope.plane.width($scope.getWidth($scope.element));
      $scope.plane.height($scope.getHeight($scope.element));
      $scope.plane.render();
    }

    function setGridHide() {
      var unbind = $rootScope.$on('grid-window.hide', function(event, gridWindow) {
        // hide means basically to remove all contents and redo from scratch when
        // shown again
        if(gridWindow === $scope.window) {
          $timeout(function() {
            $scope.plane
            .hide()
            .element($scope.element);
          });
        }
      });
      $scope.deregisters.push(unbind);      
    }

    function setGridShow() {
      var redrawUnbind = $rootScope.$on('grid-window.show', function(event, gridWindow) {
        if(gridWindow === $scope.window) {
          $timeout(function() {
            doPlaneRender();
          });
        }
      });
      $scope.deregisters.push(redrawUnbind);
    }

    function setRedraw() {
      var redrawUnbind = $rootScope.$on('window-handler.redraw', function(event, winHandler) {
        if( winHandler == $scope.window.handler() ) {
          $timeout(function() {
            doPlaneRender();
          });
        }
      });
      $scope.deregisters.push(redrawUnbind);
    }

    setSOMUpdated();
    setMoveCircle();
    setResizeCircle();

    setResize();
    setResizeElement();
    setGridShow();
    setGridHide();
    //setRedraw();

    $scope.$on('$destroy', function() {
      _.each($scope.deregisters, function(unbindFn) {
        unbindFn();
      });
    });

    ele.on('$destroy', function() {
      $scope.$destroy();
    });

    // when element is ready start the whole thing
    $scope.element.ready(function() {
      $timeout(function() {
        init();
        // $scope.draw();
        // initDropdown();
      });
    });

  }

  return {
    restrict: 'C',
    require: '^?window',
    replace: true,
    controller: 'SOMController',
    transclude: true,
    link: linkFn
  };

});