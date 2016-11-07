angular.module('plotter.vis.plotting.som', [
  'services.dimensions',
  'services.dataset',
  'angularSpinner',
  'ext.d3',
  'ext.lodash'
])

.constant('SOM_PLANE_MARGINS', {
  top: 20,
  bottom: 20,
  right: 30,
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

  $scope.highlightHexagons = false; // controlled through dropdown

  $scope.updateElementSize = function() {
    $scope.width = $scope.getWidth($scope.element);
    $scope.height = $scope.getHeight($scope.element);    
  };

  $scope.draw = function() {
    $scope.updateElementSize();
    $scope.drawSOMPlane({
      plane: $scope.window.extra().plane,
      element: $scope.element,
      width: $scope.width,
      height: $scope.height,
      margin: SOM_PLANE_MARGINS
    });
  };

  $scope.redraw = function() {
    // remove previous
    $scope.element.empty();
    $scope.draw();
  };

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
      $scope.window.headerText(['Self-organizing map of', $scope.window.variables().name(), getPvalueString()]);
    }
  }

  initHeader();

  $scope.window.resetButton(false);

  $scope.dimensionService = $scope.window.handler().getDimensionService();
  $scope.dimension = $scope.dimensionService.getSOMDimension();

  $scope.updateFilter = function(hexagons, circleId) {
    FilterService.getSOMFilter(circleId).hexagons(hexagons);
    FilterService.updateCircleFilters();
  };

  $scope.drawSOMPlane = function(config) {
    function removeCircleHighlights(circle) {

      var color = circle.color();

      // match element by unique circle color; 
      // try better matching type next time
      svg.selectAll('.hexagon.selected[stroke="' + color + '"]')
      // remove status class and restore default color
      .classed("selected", false)
      .attr("stroke", HEXAGON_BORDER_COLOR);
    }

    var plane = config.plane,
      element = config.element,
      margin = config.margin,
      width = config.width - (margin.left + margin.right),
      height = config.height - (margin.top + margin.bottom);

    var labelFormat = d3.format('.1f');

    //The number of columns and rows of the heatmap
    var MapColumns = plane.size.n;
    var MapRows = plane.size.m;

    //The maximum radius the hexagons can have to still fit the screen
    var hexRadius = d3.min([width / ((MapColumns + 0.5) * Math.sqrt(3)),
      height / ((MapRows + 1 / 3) * 1.5)
    ]);

    hexWidth = hexRadius * Math.sqrt(3);

    //Set the new height and width of the SVG based on the max possible
    width = MapColumns * hexRadius * Math.sqrt(3);
    height = MapRows * 1.5 * hexRadius + 0.5 * hexRadius;

    //Set the hexagon radius
    var hexbin = d3.hexbin()
      .size([height, width])
      .radius(hexRadius)
      .x(function(d) {
        return d.xp;
      })
      .y(function(d) {
        return d.yp;
      });

    //Calculate the center positions of each hexagon  
    var points = [];
    for (var i = 0; i < MapRows; i++) {
      for (var j = 0; j < MapColumns; j++) {
        points.push({
          "xp": hexRadius * j * 1.75,
          "yp": hexRadius * i * 1.5,
          'i': i,
          'j': j
        });
      } //for j
    } //for i

    //Create SVG element
    var svg = d3.select(element[0])
      .append('svg')
      .attr('xmlns', "http://www.w3.org/2000/svg")
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      // .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom) )
      // .attr("preserveAspectRatio", "xMidYMid meet")
      // .attr("width", "100%")
      // .attr("height", "100%")
      .attr('x', 0)
      .attr('y', 0);

    // Background color rectangle
    svg
      .append('g')
      .append('rect')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', '#cccccc');

    svg = svg.append("g")
      .attr("transform", "translate(" + (margin.left + hexWidth / 4) + "," + (margin.top + hexRadius) + ")");

    ///////////////////////////////////////////////////////////////////////////
    ////////////////////// Draw hexagons and color them ///////////////////////
    ///////////////////////////////////////////////////////////////////////////

    //Start drawing the hexagons
    svg.append("g")
      .attr('class', 'hexagon-container')
      .selectAll(".hexagon")
      .data(hexbin(points))
      .enter().append("path")
      .attr("class", "hexagon")
      .attr("d", function(d) {
        return "M" + d.x + "," + d.y + hexbin.hexagon();
      })
      .attr("stroke", function(d, i) {
        return HEXAGON_BORDER_COLOR;
      })
      .attr("stroke-width", "1px")
      .style("fill", function(d, i) {
        var cell = _.find(plane.cells, function(cell) {
          return cell.x === (d.i + 1) && cell.y === (d.j + 1);
        });
        return cell.color;
      });
    // .on("mouseover", mover)
    // .on("mouseout", mout);

    svg.append("g")
      .attr('class', 'label-container')
      .selectAll(".label")
      .data(plane.labels)
      .enter()
      .append("text")
      .attr("class", "label noselect")
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .attr("x", function(d) {
        var x = d.x - 1;
        var y = d.y - 1;
        if ((y % 2) === 0) {
          return x * hexRadius * 1.75;
        }
        if ((y % 2) === 1) {
          return hexRadius * 0.75 + x * hexRadius * 1.75;
        }
      })
      .attr("y", function(d) {
        return (d.y - 1) * hexRadius * 1.5;
      })
      .style("fill", function(d) {
        return d.color;
      })
      .text(function(d) {
        return labelFormat(+d.label);
      });

    // identical for every hex on the canvas
    var hexagonPathStr = hexbin.hexagon();
    // the six hex point coordinates, relative to hex origin
    var hexagonPoints = _.map(hexagonPathStr.split(/l|m|z/g).slice(2, -1), function(s) {
      var points = s.split(',');
      return {
        x: +points[0],
        y: +points[1]
      };
    });


    var circleX = function(x) {
      return hexRadius * x * 1.75;
    };

    var circleY = function(y) {
      return hexRadius * y * 1.5;
    };

    var resolveAreaCells = function(circleInst) {
      function highlightHexagon(hexagon, circleInstance) {
        if(!$scope.highlightHexagons) { return; }
        // find the one node
        svg.selectAll('.hexagon').filter( function(d,i) { 
          return d.i == hexagon.j && d.j == hexagon.i;
        })
        .classed('selected', true)
        .attr('stroke', circleInstance.color());
      }

      var hexagonInsideCircle = function(hexpoint, circleInst) {
        var threshold = 3,

          howManyPoints = _.chain(hexagonPoints)
          .map(function(hp) {
            // absolute pixel mapping: account for the offset from hexpoint origin
            var pointAbs = {
              x: hexpoint.xp + hp.x,
              y: hexpoint.yp + hp.y
            };
            var euclidianDistance = Math.sqrt(Math.pow(pointAbs.x - circleInst.position().x, 2) + Math.pow(pointAbs.y - circleInst.position().y, 2));
            return euclidianDistance < circleInst.radius();
          })
          // reject if not true (=hexpoint inside the circle)
          .reject(function(m) {
            return !m;
          }).value()
          // get how many point hits were discovered
          .length;
        return howManyPoints >= threshold;
      };

      $scope.resolveAllCircles = function() {
        _.each(FilterService.getSOMFilters(), function(filter) {
          resolveAreaCells(filter);
        });
      };

      $scope.removeAllCircleHighlights = function() {
        _.each(FilterService.getSOMFilters(), function(filter) {
          removeCircleHighlights(filter);
        });
      };

      console.log("resolveAreaCells called");

      var hexagons = [];

      removeCircleHighlights(circleInst);

      _.each(points, function(hexpoint) {
        if (hexagonInsideCircle(hexpoint, circleInst)) {
          hexagons.push(hexpoint);
          highlightHexagon(hexpoint, circleInst);
        }
      });

      $timeout(function() {
        $scope.updateFilter(hexagons, circleInst.id());
      });

    };

    var addCircle = function(circle, origin, size) {

      var circleId = circle.id();

      var _circleConfig = {
        fillOpacity: 0.40,
        radius: {
          normal: hexRadius * (size.m / 2),
          min: hexRadius * 1.5,
          max: hexRadius * (size.m - 1)
        }
      };

      var innerDragMove = function(d) {
        var x = Math.max(-hexRadius, Math.min(width + margin.left - margin.right, d3.event.x)),
          y = Math.max(-hexRadius, Math.min(height - margin.top - margin.bottom + hexRadius, d3.event.y));

        d.x = x;
        d.y = y;
        innerCircle.attr("cx", d.x);
        innerCircle.attr("cy", d.y);
        outerCircle.attr('cx', function(t) {
          t.x = x;
          return t.x;
        });
        outerCircle.attr('cy', function(t) {
          t.y = y;
          return t.y;
        });
        circleText.attr('x', function(t) {
          t.x = x;
          return t.x;
        });
        circleText.attr('y', function(t) {
          t.y = y;
          return t.y;
        });
        circle.position(d);

        $rootScope.$emit('som:circleFilter:move', circle, $scope.window.id(), d);
      };

      var innerCircleDrag = d3.behavior.drag()
        .origin(Object)
        .on("drag", innerDragMove)
        .on("dragend", function(d) {
          var circleInst = FilterService.getSOMFilter(d.id);
          resolveArea(circleInst);
          //resolveArea(d); //, d3.event);
        });

      $rootScope.$on('som:circleFilter:move', function(eve, instance, winId, d) {
        if (winId === $scope.window.id()) {
          return;
        }

        svg.selectAll('circle').filter(function(a) {
            return a.id == d.id;
          })
          .attr('cx', function(t) {
            t.x = d.x;
            return t.x;
          })
          .attr('cy', function(t) {
            t.y = d.y;
            return t.y;
          });

        svg.selectAll('text.circle-filter').filter(function(a) {
            return a.id == d.id;
          })
          .attr('x', function(t) {
            t.x = d.x;
            return t.x;
          })
          .attr('y', function(t) {
            t.y = d.y;
            return t.y;
          });

        if($scope.highlightHexagons) {
          resolveArea(instance);
          return;
        }

      });

      $rootScope.$on('som:circleFilter:resize', function(eve, circleId, winId, d) {
        if (winId === $scope.window.id()) {
          return;
        }

        svg.selectAll('circle').filter(function(a) {
            return a.id == d.id;
          })
          .attr('r', function(t) {
            t.r = d.r;
            return t.r;
          });

        var circleInstance = FilterService.getSOMFilter(d.id);
        circleInstance.radius(d.r);
        resolveArea(circleInstance);
      });


      var circleAnchor = svg.append('g')
        .attr('class', function(d) {
          return 'circle-container';
        })
        .attr('id', function(d)  {
          return circle.id();
        })
        .data([{
          x: origin.x,
          y: origin.y,
          r: circle.radius() || _circleConfig.radius.normal,
          id: circleId
        }]);

      var innerCircle = circleAnchor.append('circle')
        .attr('cx', function(d) {
          return d.x;
        })
        .attr('cy', function(d) {
          return d.y;
        })
        .attr('r', function(d) {
          return d.r;
        })
        .attr('fill', 'lightgray')
        .style('fill-opacity', 0)
        .call(innerCircleDrag);

      var circleText = circleAnchor
        .append('text')
        .attr('x', function(d) {
          return d.x;
        })
        .attr('y', function(d) {
          return d.y;
        })
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .attr('class', 'circle-filter noselect')
        .style('fill', circle.color())
        .text(function() {
          if(circle.name().length > SOM_FILTER_TEXT_LENGTH) {
            return circle.name().substring(0, SOM_FILTER_TEXT_LENGTH) + "...";
          } else {
            return circle.name();
          }
        })
        .call(innerCircleDrag);


      var outerCircleDrag = d3.behavior.drag()
        .on("drag", function(d) {
          var direction, newRadius;
          var x = Math.abs(d3.event.x - d.x);
          var y = Math.abs(d3.event.y - d.y);
          direction = (x >= y) ? x : y;

          newRadius = Math.max(_circleConfig.radius.min, Math.min(direction, _circleConfig.radius.max));
          d.r = newRadius;
          outerCircle.attr('r', newRadius);
          innerCircle.attr('r', function(t) {
            t.r = newRadius;
            return t.r;
          });

          // if highlight is in place, resolve as well to get highlighting
          if($scope.highlightHexagons) {
            resolveArea(circle);
          }

          $rootScope.$emit('som:circleFilter:resize', circle, $scope.window.id(), d);
        });

      var outerCircle = circleAnchor.append('circle')
        .data([{
          x: origin.x,
          y: origin.y,
          r: (circle.radius() || _circleConfig.radius.normal) + 3,
          id: circleId
        }])
        .attr('cx', function(d) {
          return d.x;
        })
        .attr('cy', function(d) {
          return d.y;
        })
        .attr('r', function(d) {
          return d.r;
        })
        .attr('stroke', circle.color())
        .attr('stroke-width', 3)
        .attr('fill', 'none')
        .attr('cursor', 'ew-resize')
        .call(outerCircleDrag);

      // wrap to reduce unnecessary calls
      var resolveArea = _.debounce(resolveAreaCells, 150, {
        leading: false,
        trailing: true
      });

      //var innerCircleInst = FilterService.getSOMFilter(innerCircle.data()[0].id);
      // place initial position & radius
      circle.position(innerCircle.data()[0]);
      circle.radius(innerCircle.data()[0].r);
      resolveArea(circle);

    };
    // addcircle

    function removeCircle(filter) {
      var selector = '.circle-container#' + filter.id(),
        circle = d3.select($scope.element[0]).select(selector);

      removeCircleHighlights(filter);

      circle.remove();
    }

    $scope.$watch(function() {
      return FilterService.getSOMFilters();
    }, function(newArray, oldArray) {
      if (newArray.length > oldArray.length) {
        // adding a new circle
        var filter = _.last(newArray);
        addCircle(filter, filter.position() || {
          x: circleX(filter.origin().x),
          y: circleY(filter.origin().y)
        },
        $scope.window.extra().plane.size
        );
      } else if (newArray.length < oldArray.length) {
        // removing a circle
        _.chain(oldArray)
          .select(function(item) {
            return !_.findWhere(newArray, item);
          })
          .each(function(rem) {
            removeCircle(rem);
          })
          .value();
      }
    }, true);

    _.each(FilterService.getSOMFilters(), function(filt, ind) {
      addCircle(filt, filt.position() || {
        x: circleX(filt.origin().x),
        y: circleY(filt.origin().y)
      },
      $scope.window.extra().plane.size
      );
    });

  };
})

.directive('plSomplane', function plSomplane($rootScope, SOMService, NotifyService, $timeout, _) {

  var linkFn = function($scope, ele, iAttrs) {

    function initDropdown() {
      if($scope.window.dropdown().length > 0) {
        // already initialized
        return;
      }

      var selector = _.template('#<%= id %> <%= element %>'),
        id = $scope.element.parent().attr('id');

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
          // toggle highlighting
          $scope.highlightHexagons = !$scope.highlightHexagons;

          if($scope.highlightHexagons === true) {
            $scope.resolveAllCircles();
          } else {
            $scope.removeAllCircleHighlights();
          }
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
          $scope.draw();
          initDropdown();
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

    $scope.updateElementSize();
    // $scope.width = $scope.getWidth($scope.element);
    // $scope.height = $scope.getHeight($scope.element);

    $scope.deregisters = [];

    var somUpdatedUnbind = $rootScope.$on('dataset:SOMUpdated', function(event, som) {
      $scope.window.circleSpin(true);
      SOMService.getPlane($scope.window.variables(), $scope.window, notify).then(
          function succFn(plane) {
            $scope.window.extra({ plane: plane });
            $scope.redraw();
            initDropdown();
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

    $scope.deregisters.push(somUpdatedUnbind);

    $scope.$on('$destroy', function() {
      _.each($scope.deregisters, function(unbindFn) {
        unbindFn();
      });
    });

    ele.on('$destroy', function() {
      $scope.$destroy();
    });

    $scope.element.ready(function() {
      $timeout(function() {
        init();
        // $scope.draw();
        // initDropdown();
      });
    });

  };

  return {
    restrict: 'C',
    require: '^?window',
    replace: true,
    controller: 'SOMController',
    transclude: true,
    link: linkFn
  };

});