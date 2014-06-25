var visu = angular.module('plotter.vis.plotting.som', ['plotter.vis.plotting']);
visu.controller('SOMController', ['$scope', 'DatasetFactory', 'DimensionService', 'constants', '$injector', '$timeout',
  function($scope, DatasetFactory, DimensionService, constants, $injector, $timeout) {

    $scope.resetFilter = function() {
      // $scope.heatmap.filterAll();
      // dc.redrawAll(constants.groups.heatmap);
    };

    $scope.headerText = $scope.window.variable;

    // needed later on for removing the url
    $scope.window.variables = $scope.window.id;
    $scope.window.showResetBtn = false;

    $scope.width = 455;
    $scope.height = 360;

    // create anchor for heatmap
    $scope.anchor = d3.select($scope.element[0])
      .append('div')
      .attr('class', 'som-anchor text-center')[0];

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
          .duration(1000)
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
      var svg = d3.select(element[0]).append('svg') //d3.select("#chart").append("svg")
        .attr('xmlns', "http://www.w3.org/2000/svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
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
        })
        .on("mouseover", mover)
        .on("mouseout", mout);

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

    $scope.drawSOMPlane($scope.window.plane, $scope.anchor, $scope.width, $scope.height);

}]);



visu.directive('som', [

  function() {

    var linkFn = function($scope, ele, iAttrs) {
      //$scope.element = ele;
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