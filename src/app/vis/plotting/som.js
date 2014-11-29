var visu = angular.module('plotter.vis.plotting.som', ['services.dimensions', 'services.dataset', 'angularSpinner']);
visu.controller('SOMController', ['$scope', 'DatasetFactory', 'DimensionService', 'constants', '$injector', '$timeout', '$rootScope',
  function($scope, DatasetFactory, DimensionService, constants, $injector, $timeout, $rootScope) {

    $scope.resetFilter = function() {
      removeFilters();
    };

    $rootScope.$on('dataset:SOMUpdated', function(event, som) {
      $scope.$parent.startSpin();

      DatasetFactory.getPlane($scope.window.variable).then( 
        function succFn(res) {
          console.log(res);
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
    $scope.dimension = DimensionService.getSOMDimension( $scope.window.som_id );

    $scope.ownFilters = DimensionService.getSOMFilters($scope.window.som_id);

    var _callRedraw = function() {
      $rootScope.$emit('scatterplot.redrawAll');
      $rootScope.$emit('histogram.redraw');
      $rootScope.$emit('heatmap.redraw');
      dc.redrawAll(constants.groups.scatterplot);
      dc.redrawAll(constants.groups.heatmap);
    };

    $scope.sort = function(d) {
      d3.selectAll($scope.element).selectAll('.hexagon')
      .sort(function (a, b) {            
        // a is not the element, send "a" to the back
        if( (a.i !== d.x ) || (a.j !== d.y) ) { return -1; }
        // element found, bring to front
        else { return 1; }
      });
    };

    $scope.addFilter = function(coord, redraw) {
      DimensionService.addSOMFilter( $scope.window.som_id, coord );
      if(redraw) { _callRedraw(); }
    };

    $scope.removeFilter = function(coord, redraw) {
      DimensionService.removeSOMFilter( $scope.window.som_id, coord );
      if(redraw) { _callRedraw(); }
    };

    $scope.$watch('ownFilters', function(newColl, oldColl) {
      if( newColl.length > 0) { $scope.window.showResetBtn = true; }
      else { $scope.window.showResetBtn = false; }

      if( newColl.length == oldColl.length ) { 
        if( newColl.length === 0 ) { return; }
        _.each(newColl, function(f) { 
          $scope.sort(f);
          selectHex(f);
        } );
        return;
      }

      if( newColl.length > oldColl.length ) {
        // new element added
        $scope.sort( _.last(newColl) );
        selectHex( _.last(newColl) );
      }
      else {
        // element(s) removed
        var rem = _.filter(oldColl, function(obj){ return !_.findWhere(newColl, obj); });
        _.each(rem, function(r) { deselectHex(r); } );
      }

    }, true); 

    function removeFilters() {
      var filters = angular.copy($scope.ownFilters);
      _.each( filters, function(f,i) {
        $scope.removeFilter(f, false);
      });
      _callRedraw();
    }

    var deselectHex = function(coord) {
      d3.selectAll( $scope.element )
      .selectAll('.hexagon-selected')
      .filter( function(d, i) {
        return (d.i == coord.x) && (d.j == coord.y);
      })
      .classed('hexagon-selected', false)
      .classed('hexagon', true);
    };

    var selectHex = function(coord) {
      d3.selectAll( $scope.element )
      .selectAll('.hexagon')
      .filter( function(d, i) {
        return (d.i == coord.x) && (d.j == coord.y);
      })
      .classed('hexagon-selected', true)
      .classed('hexagon', false);
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

      //Function to call when you mouseover a node
      function mover(d) {
        var el = d3.select(this)
        .transition()
        .duration(10)
        .style("fill-opacity", 0.3);
      }

      //Mouseout function
      function mout(d) {
        var el = d3.select(this)
        .transition()
        .duration(500)
        .style("fill-opacity", 1);
      }

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
      .radius(hexRadius)
      .x( function(d) { return d.xp; })
      .y( function(d) { return d.yp; });

      //Calculate the center positions of each hexagon  
      var points = [];
      for (var i = 0; i < MapRows; i++) {
        for (var j = 0; j < MapColumns; j++) {
          points.push({
            "xp": hexRadius * j * 1.75,
            "yp": hexRadius * i * 1.5
          });
          //points.push([hexRadius * j * 1.75, hexRadius * i * 1.5]);
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
      .attr("class", "hexagon ctrl")
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
      })
      .on("mouseover", mover)
      .on("mouseout", mout)
      .on("click", function(d) {
        if( !$(this).is('.hexagon-selected') ) {
          $scope.addFilter({x: d.i, y: d.j}, true);
        }
        else {
          $scope.removeFilter({x: d.i, y: d.j}, true);
        }
        $scope.$apply();
      })
      .append("svg:title")
      .text('Click to filter');

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