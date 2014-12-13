var visu = angular.module('plotter.vis.plotting.som', ['services.dimensions', 'services.dataset', 'angularSpinner']);
visu.controller('SOMController', ['$scope', 'DatasetFactory', 'DimensionService', 'constants', '$injector', '$timeout', '$rootScope', 'SOMService',
  function($scope, DatasetFactory, DimensionService, constants, $injector, $timeout, $rootScope, SOMService) {

    $scope.resetFilter = function() {
      removeFilters();
    };

    function removeFilters() {
      var filters = angular.copy($scope.ownFilters);
      _.each( filters, function(f,i) {
        $scope.removeFilter(f, false);
      });
      _callRedraw();
    }    

    $rootScope.$on('dataset:SOMUpdated', function(event, som) {
      $scope.$parent.startSpin();

      SOMService.getPlane($scope.window.variable).then( 
        function succFn(res) {
          angular.extend($scope.window, res); // overrides old values, places new plane info/ids/...
          $scope.redraw();
      }, function errFn(res) {
        NotifyService.addTransient('Plane computation failed', res, 'danger');
      })
      .finally( function() {
        $scope.$parent.stopSpin();
      });
    });

    $scope.redraw = function() {
      // remove previous
      $scope.element.empty();

      $scope.drawSOMPlane(
        $scope.window.plane, 
        $scope.element, 
        $scope.width, 
        $scope.height);
    };


    var pvalFormat = d3.format('.2e');
    $scope.$parent.headerText = ['Self-organizing map of', $scope.window.variable, "(P = " + pvalFormat($scope.window.plane.pvalue) + ")"];

    $scope.window.showResetBtn = false;

    $scope.dimensionService = $scope.$parent.window.handler.getDimensionService();
    $scope.dimension = $scope.dimensionService.getSOMDimension( $scope.window.som_id );

    // $scope.ownFilters = DimensionService.getSOMFilters($scope.window.som_id);

    var _callRedraw = function() {
      // $rootScope.$emit('scatterplot.redrawAll');
      // $rootScope.$emit('histogram.redraw');
      // $rootScope.$emit('heatmap.redraw');
      dc.redrawAll(constants.groups.scatterplot);
      dc.redrawAll(constants.groups.heatmap);
    };

    // $scope.sort = function(d) {
    //   // d3.selectAll($scope.element).selectAll('.hexagon')
    //   // .sort(function (a, b) {            
    //   //   // a is not the element, send "a" to the back
    //   //   if( (a.i !== d.x ) || (a.j !== d.y) ) { return -1; }
    //   //   // element found, bring to front
    //   //   else { return 1; }
    //   // });
    // };

    $scope.addFilter = function(hexagons, circleId, redraw) {
      $scope.dimensionService.addSOMFilter( $scope.window.som_id, hexagons, circleId );
      if(redraw) { _callRedraw(); }
    };

    $scope.removeFilter = function(hexagons, circleId, redraw) {
      $scope.dimensionService.removeSOMFilter( $scope.window.som_id, hexagons, circleId );
      if(redraw) { _callRedraw(); }
    };

    $scope.$on('$destroy', function() {
      $timeout( function() {
        _callRedraw();
      });
    });

    $scope.drawSOMPlane = function(plane, element, width, height) {

      var labelFormat = d3.format('.3f');

      ///////////////////////////////////////////////////////////////////////////
      ////////////// Initiate SVG and create hexagon centers ////////////////////
      ///////////////////////////////////////////////////////////////////////////

      // //Function to call when you mouseover a node
      // function mover(d) {
      //   var el = d3.select(this)
      //   .transition()
      //   .duration(10)
      //   .style("fill-opacity", 0.3);
      // }

      // //Mouseout function
      // function mout(d) {
      //   var el = d3.select(this)
      //   .transition()
      //   .duration(500)
      //   .style("fill-opacity", 1);
      // }

      //svg sizes and margins
      var margin = {
        top: 10,
        bottom: 10,
        right: 30,
        left: 30
      };

      //The next lines should be run, but this seems to go wrong on the first load in bl.ocks.org
      //var width = $(window).width() - margin.left - margin.right - 40;
      //var height = $(window).height() - margin.top - margin.bottom - 80;
      //So I set it fixed to
      // var width = 850;
      // var height = 350;

      //The number of columns and rows of the heatmap
      var MapColumns = plane.size.n;
      var MapRows = plane.size.m;
      // var MapColumns = 9,
      //   MapRows = 7;

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
      .x( function(d) { return d.xp; })
      .y( function(d) { return d.yp; });

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
      var svg = d3.select(element[0]).append('svg')
      .attr('xmlns', "http://www.w3.org/2000/svg")
        // .attr("width", width + margin.left + margin.right)
        // .attr("height", height + margin.top + margin.bottom)
        .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom) )
        .attr("preserveAspectRatio", "xMidYMid meet")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr('x',0)
        .attr('y',0);

      // Background color rectangle
      svg
      .append('g')
      .append('rect')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', '#cccccc');

      svg = svg.append("g")
      .attr("transform", "translate(" + (margin.left + hexWidth/4)   + "," + (margin.top + hexRadius) + ")");

      ///////////////////////////////////////////////////////////////////////////
      ////////////////////// Draw hexagons and color them ///////////////////////
      ///////////////////////////////////////////////////////////////////////////

      //Start drawing the hexagons
      svg.append("g")
      .selectAll(".hexagon")
      .data(hexbin(points))
      .enter().append("path")
      .attr("class", "hexagon")
      .attr("d", function(d) {
        return "M" + d.x + "," + d.y + hexbin.hexagon();
      })
      .attr("stroke", function(d, i) {
        return "#fff";
      })
      .attr("stroke-width", "1px")
      .style("fill", function(d, i) {
        var cell = _.find( plane.cells, function(cell) {
          return cell.x === (d.i + 1) && cell.y === (d.j + 1);
        });
        return cell.color;
      });
      // .on("mouseover", mover)
      // .on("mouseout", mout);

      svg.append("g")
      .selectAll(".label")
      .data(plane.labels)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", function(d) { 
        var x = d.x-1;
        var y = d.y-1;
        if( (y % 2) === 0 ) { return x*hexRadius*1.75; }
        if( (y % 2) === 1 ) { return hexRadius*0.75 + x*hexRadius*1.75; }
      })
      .attr("y", function(d) { 
        return (d.y-1) * hexRadius * 1.5;
      })
      .style("fill", function(d) { return d.color; })
      .text( function(d) { return labelFormat( +d.label ); });

      // identical for every hex on the canvas
      var hexagonPathStr = hexbin.hexagon();
      // the six hex point coordinates, relative to hex origin
      var hexagonPoints = _.map( hexagonPathStr.split(/l|m|z/g).slice(2,-1), function(s) { 
          var points = s.split(',');
          return { x: +points[0], y: +points[1] };
        });


      var addCircle = function(circleId, origin) {

        var _circleConfig = {
          fillOpacity: 0.40,
          radius: { normal: hexRadius * 3, min: hexRadius * 2, max: hexRadius * 5 }
        };

        var circleX = function(x) {
          return hexRadius * x * 1.75;
        };

        var circleY = function(y) {
          return hexRadius * y * 1.5;
        };


        var resolveAreaCells = function(circle, event) {
          var highlightHexagon = function(hexagon) {
            // // find the one node
            svg.selectAll('.hexagon').filter( function(d,i) { 
              return d.i == hexagon.j && d.j == hexagon.i;
            }).classed('selected', true);
          };

          var removeHighlights = function() {
            svg.selectAll('.hexagon.selected').classed('selected', false);
          };

          var hexagonInsideCircle = function(hexpoint, circle) {
            var threshold = 3,
            howManyPoints = _.chain(hexagonPoints)
            .map( function(hp) { 
              // absolute pixel mapping: account for the offset from hexpoint origin
              var pointAbs = { x: hexpoint.xp + hp.x, y: hexpoint.yp + hp.y };
              var euclidianDistance = Math.sqrt( Math.pow(pointAbs.x - circle.x, 2) + Math.pow(pointAbs.y - circle.y, 2) );
              return euclidianDistance <= circle.r;
            })
            // reject if not true (=hexpoint inside the circle)
            .reject( function(m) { return !m; }).value()
            // get how many point hits were discovered
            .length;
            return howManyPoints >= threshold;
          };

          removeHighlights();

          var hexagons = [];
          _.each(points, function(hexpoint) {
            if( hexagonInsideCircle(hexpoint, circle) ) {
              hexagons.push(hexpoint);
              highlightHexagon(hexpoint);
            }
          });

          $scope.removeFilter(hexagons, circleId, false);
          $scope.addFilter(hexagons, circleId, true);
        };

        var innerDragMove = function(d) {
          var x = Math.max(0, Math.min(width -margin.left - margin.right + d.r, d3.event.x)),
          y = Math.max(0, Math.min(height - margin.top - margin.bottom, d3.event.y));

          d.x = x;
          d.y = y;
          innerCircle.attr("cx", d.x);
          innerCircle.attr("cy", d.y);
          outerCircle.attr('cx', function(t) { t.x = x; return t.x; });
          outerCircle.attr('cy', function(t) { t.y = y; return t.y; });

          $rootScope.$emit('som:circleFilter:move', null, $scope.window._winid, d);
        };

        var innerCircleDrag = d3.behavior.drag()
            .origin(Object)
            .on("drag", innerDragMove)
            .on("dragend", function(d) {
              resolveAreaCells(d, d3.event);
            });

        $rootScope.$on('som:circleFilter:move', function(eve, circleId, winId, d) {
          if( winId === $scope.window._winid ) { return; }

          svg.selectAll('circle').filter( function(a) {
            return a.id == d.id;
          })
          .attr('cx', function(t) { t.x = d.x; return t.x; })
          .attr('cy', function(t) { t.y = d.y; return t.y; });
        });

        $rootScope.$on('som:circleFilter:resize', function(eve, circleId, winId, d) {
          if( winId === $scope.window._winid ) { return; }          

          svg.selectAll('circle').filter( function(a) {
            return a.id == d.id;
          })
          .attr('r', function(t) { t.r = d.r; return t.r; })
          .attr('r', function(t) { t.r = d.r; return t.r; });          
        });

        $rootScope.$on('som:circleFilter:remove', function(eve, circleId) {
          svg.selectAll('circle').filter( function(a) {
            return a.id == circleId;
          }).remove();
        });

        var circleAnchor = svg.append('g');

        var innerCircle = circleAnchor.append('circle')
            .data([{ x: circleX(origin.n), y: circleY(origin.m), r: _circleConfig.radius.normal, id: circleId }])
            .attr('cx', function(d) { return d.x; })
            .attr('cy', function(d) { return d.y; })
            .attr('r', function(d) { return d.r; })
            .attr('fill', 'lightgray')
            .style('fill-opacity', 0)
            .call( _.throttle( innerCircleDrag ), 200 );


        var outerCircleDrag = d3.behavior.drag()
            .on("drag", function(d) {
              var direction, newRadius;
              var x = Math.abs( d3.event.x - d.x );
              var y = Math.abs( d3.event.y - d.y );
              direction = (x >= y) ? x : y;

              newRadius = Math.max(_circleConfig.radius.min, Math.min(direction, _circleConfig.radius.max));
              d.r = newRadius;
              outerCircle.attr('r', newRadius);
              innerCircle.attr('r', function(t) { t.r = newRadius; return t.r; });

              resolveAreaCells(d, d3.event);

              $rootScope.$emit('som:circleFilter:resize', null, $scope.window._winid, d);              
            });

        var outerCircle = circleAnchor.append('circle')
        .data([{ x: circleX(origin.n), y: circleY(origin.m), r: _circleConfig.radius.normal + 3, id: circleId }])
                        .attr('cx', function(d) { return d.x; })
                        .attr('cy', function(d) { return d.y; })
                        .attr('r', function(d) { return d.r; })
                        .attr('stroke', SOMService.getColor(circleId)) //'black')
                        .attr('stroke-width', 3)
                        .attr('fill', 'none')
                        .attr('cursor', 'ew-resize')
                        .call( _.throttle( outerCircleDrag, 200) );

        // finally, call resolve once to start filtering on this circle
        resolveAreaCells( innerCircle.data()[0], null );

      }; // addcircle

      // add two filter circles
      addCircle( 'circle1', { m: 1, n: 1 } );
      addCircle( 'circle2', { m: 5, n: 7 } );


    };
  }]);



visu.directive('somplane', [

  function() {

    var linkFn = function($scope, ele, iAttrs) {

      $scope.$parent.element = ele;
      $scope.element = ele;

      $scope.width = 455;
      $scope.height = 360;

    $scope.drawSOMPlane(
      $scope.window.plane, 
      $scope.element,
      $scope.width, 
      $scope.height);

  };

  return {
    scope: false,
      // scope: {},
      restrict: 'C',
      require: '^?window',
      replace: true,
      controller: 'SOMController',
      transclude: true,
      link: linkFn
    };
  }
  ]);