// inspired by 
// http://www.visualcinnamon.com/2013/07/self-organizing-maps-creating-hexagonal.html
function SOMPlane() {

  var obj = this.obj = {},
  priv = this.priv = {
    threshold: 3,
    highlight: false,
    allowedCircleEdge: 0.5
  };

  // config fn's:
  obj.element = function(x) {
    if(!arguments.length) { return priv.element; }
    priv.element = x;
    return obj;
  };

  obj.plane = function(x) {
    if(!arguments.length) { return priv.plane; }
    priv.plane = x; 
    return obj;
  };

  // how many times the hex radius are you allowed to offset
  // the circle filter on the plane edge from the valid
  // hex x,y points?
  obj.allowedCircleEdge = function(x) {
    if(!arguments.length) { return priv.allowedCircleEdge; }
    priv.allowedCircleEdge = x;
    return obj;
  };

  obj.width = function(x) {
    if(!arguments.length) { return priv.width; }
    priv.width = x;
    return obj;
  };

  obj.height = function(x) { 
    if(!arguments.length) { return priv.height; }
    priv.height = x;
    return obj;
  };

  obj.circleOpacity = function(x) {
    if(!arguments.length) { return priv.circleOpacity; }
    priv.circleOpacity = x;
    return obj;
  };

  obj.circleRadiusSettings = function(x) {
    if(!arguments.length) { return priv.circleRadiusSettings; }
    priv.circleRadiusSettings = x;
    return obj;
  };

  obj.margins = function(x) {
    if(!arguments.length) { return priv.margins; }
    priv.margins = x;
    return obj;
  };

  obj.highlightColor = function(x) {
    if(!arguments.length) { return priv.highlightColor; }
    priv.highlightColor = x;
    return obj;
  };

  obj.highlightThreshold = function(x) {
    if(!arguments.length) { return priv.threshold; }
    priv.threshold = x;
    return obj;
  };

  obj.circleTruncateLength = function(x) {
    if(!arguments.length) { return priv.circleTruncateLength; }
    priv.circleTruncateLength = x;
    return obj;
  };

  function removeCircleHighlights(circle) {
    var color = circle.color();

    // match element by unique circle color; 
    // try better matching type next time
    priv.svg.selectAll('.hexagon.selected[stroke="' + color + '"]')
    // remove status class and restore default color
    .classed("selected", false)
    .attr("stroke", obj.highlightColor());
  }

  function resolveAllCircles() {
    var _ = priv.injections._,
    somFilters = obj.getSOMFiltersCallback()();

    _.each(somFilters, function(filter) {
      resolveAreaCells(filter);
    });
  }

  function removeAllCircleHighlights() {
    var _ = priv.injections._,
    somFilters = obj.getSOMFiltersCallback()();

    _.each(somFilters, function(filter) {
      removeCircleHighlights(filter);
    });
  }

  function resolveAllAreaCells() {
    var _ = priv.injections._,
    somFilters = obj.getSOMFiltersCallback()();

    _.each(somFilters, function(filter) {
      resolveAreaCells(filter);
    });    
  }

  function resolveAreaCells(circleInst) {
    function highlightHexagon(hexagon, circleInstance) {
      if(!obj.highlight()) { return; }

      // find the one node
      priv.svg.selectAll('.hexagon').filter( function(d,i) { 
        return d.i == hexagon.j && d.j == hexagon.i;
      })
      .classed('selected', true)
      .attr('stroke', circleInstance.color());
    }

    function hexagonInsideCircle(hexpoint, circleInst) {
      var threshold = obj.highlightThreshold(),
      hexagonPoints = priv.hexagonPoints,
      circleOrigin = {
        x: translateRelativeToPixelX(circleInst.origin().x),
        y: translateRelativeToPixelY(circleInst.origin().y)
      },
      radiusInPx = translateRelativeToPixel(circleInst.radius()),
      howManyPoints = _.chain(hexagonPoints)
      .map(function(hp) {
        // absolute pixel mapping: account for the offset from hexpoint origin
        var pointAbs = {
          x: hexpoint.xp + hp.x,
          y: hexpoint.yp + hp.y
        };

        var euclidianDistance = Math.sqrt(Math.pow(pointAbs.x - circleOrigin.x, 2) + Math.pow(pointAbs.y - circleOrigin.y, 2));
        return euclidianDistance < radiusInPx;
      })
      // reject if not true (=hexpoint inside the circle)
      .reject(function(m) {
        return !m;
      }).value()
      // get how many point hits were discovered
      .length;
      return howManyPoints >= threshold;
    }

    console.log("resolveAreaCells called");
    var hexagons = [],
    _ = priv.injections._;

    removeCircleHighlights(circleInst);

    _.each(priv.points, function(hexpoint) {
      if (hexagonInsideCircle(hexpoint, circleInst)) {
        hexagons.push(hexpoint);
        highlightHexagon(hexpoint, circleInst);
      }
    });

    obj.circleIsUpdatedCallback()(hexagons, circleInst);
  }

  obj.circleIsUpdatedCallback = function(fn) {
    if(!arguments.length) { return priv.circleIsUpdatedCallback; }
    priv.circleIsUpdatedCallback = fn;
    return obj;
  };

  obj.getSOMFiltersCallback = function(fn) {
    if(!arguments.length) { return priv.somFiltersCallback; }
    priv.somFiltersCallback = fn;
    return obj;
  };

  obj.circleMoveCallback = function(fn) {
    if(!arguments.length) { return priv.circleMoveCallback; }
    priv.circleMoveCallback = fn;
    return obj;
  };

  obj.circleResizeCallback = function(fn) {
    if(!arguments.length) { return priv.circleResizeCallback; }
    priv.circleResizeCallback = fn;
    return obj;
  };

  obj.moveCircle = function(circleInst) {

    var pixelX = translateRelativeToPixelX(circleInst.origin().x),
    pixelY = translateRelativeToPixelY(circleInst.origin().y),
    id = circleInst.id();

    priv.svg.selectAll('circle').filter(function(a) {
        return a.id == id; //d.id;
      })
      .attr('cx', function(t) {
        t.x = pixelX; //d.x;
        return t.x;
      })
      .attr('cy', function(t) {
        t.y = pixelY; //d.y;
        return t.y;
      });

    priv.svg.selectAll('text.circle-filter').filter(function(a) {
        return a.id == id; //d.id;
      })
      .attr('x', function(t) {
        t.x = pixelX; //d.x;
        return t.x;
      })
      .attr('y', function(t) {
        t.y = pixelY; //d.y;
        return t.y;
      });

    if(obj.highlight()) {
      resolveAllAreaCells();
    }

    return obj;
  };

  obj.resizeCircle = function(circleInst) {
    var circleRadiusRel = circleInst.radius(),
    newRadiusInPx = translateRelativeToPixel(circleRadiusRel),
    id = circleInst.id();

    priv.svg.selectAll('circle').filter(function(a) {
      return a.id == id; //== d.id;
    })
    .attr('r', function(t) {
      t.r = newRadiusInPx;
      return t.r;
    });

    // the calling circle has already updated the displayed info,
    // so if there's not a need for highlight, don't do this again
    if(obj.highlight()) {
      // do this for all circles in case the circles have been intersecting
      // and need to update the colors accordingly
      resolveAllCircles();
    }
    else {
      // set by the caller, do not set again
      //circleInstance.radius(d.r);
      resolveAreaCells(circleInst);
    }

  };

  function _getCircleInstance(id) {
    var somFilters = obj.getSOMFiltersCallback()(),
    _ = obj.injections()._,
    circleInst = _.find(somFilters, function(filter) {
      return filter.id() == id;
    });

    return circleInst;
  }

  function translatePointToRelativeX(x) {
    // 1. get point -> pixel scale
    var pixel = translatePointToPixelX(x);

    // 2. pixel to relative scale
    return translatePixelToRelativeX(pixel);

    // divide the width into n columns -> pixel scale
  }

  function translatePointToRelativeY(y) {
    var height = priv.fitHeight;

    // 1. get point -> pixel scale
    var pixel = translatePointToPixelY(y);

    // 2. pixel to relative scale
    return translatePixelToRelativeY(pixel);
  }


  function translatePointToPixelX(x) {
    return priv.hexRadius * x * 1.75;
  }

  function translatePointToPixelY(y) {
    return priv.hexRadius * y * 1.5;
  }

  function translateRelativeToPixelX(x) {
    var width = priv.fitWidth;
    return x * width;
  }

  function translateRelativeToPixelY(y) {
    var height = priv.fitHeight;
    return y * height;
  }

  function translatePixelToRelativeX(x) {
    var width = priv.fitWidth;
    return x / width;
  }

  function translatePixelToRelativeY(y) {
    var height = priv.fitHeight;
    return y / height;
  }

  function translatePixelToRelative(val) {
    // agree that the relative measurement
    // is bound to width. Could as well be
    // height.
    var width = priv.fitWidth,
    hexRadius = priv.hexRadius;
    return val / (width + obj.allowedCircleEdge() * hexRadius * 2);
  }

  function translateRelativeToPixel(val) {
    var width = priv.fitWidth,
    hexRadius = priv.hexRadius;
    return val * (width + obj.allowedCircleEdge() * hexRadius * 2);
  }

  /* function circleX(x) {
      return priv.hexRadius * x * 1.75;
  }

  function circleY(y) {
      return priv.hexRadius * y * 1.5;
  } */

  obj.addCircle = function(circle) {
    function doAdd() {
      var _id = circle.id(),
      _circleConfig = {
        opacity: obj.circleOpacity(),
        // these are callbacks:
        radius: {
          normal: obj.circleRadiusSettings().normal(
            priv.hexRadius, 
            obj.plane().size.n,
            obj.plane().size.m
          ),
          min: obj.circleRadiusSettings().min(
            priv.hexRadius, 
            obj.plane().size.n,
            obj.plane().size.m
          ),
          max: obj.circleRadiusSettings().max(
            priv.hexRadius, 
            obj.plane().size.n,
            obj.plane().size.m
          )
        }
      },
      svg = priv.svg,
      origin = {
        x: translateRelativeToPixelX(circle.origin().x),
        y: translateRelativeToPixelY(circle.origin().y),
      },
      radiusInPx;
      if(circle.radius()) {
        radiusInPx = translateRelativeToPixel(circle.radius());
      } else {
        radiusInPx = _circleConfig.radius.normal;
      }

      console.log("origin (px) = ", origin, "radius (px) = ", radiusInPx);

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
          r: radiusInPx,
          id: circle.id()
        }]);

      var innerDragMove = function(d) {
        var hexRadius = priv.hexRadius,
        width = priv.fitWidth,
        height = priv.fitHeight,
        margin = priv.margins,
        d3 = obj.injections().d3;

        var x = Math.max(-hexRadius, Math.min(width + margin.left - margin.right, d3.event.x)),
          y = Math.max(-hexRadius, Math.min(height - margin.top - margin.bottom + hexRadius, d3.event.y));

        d.x = x;
        d.y = y;

        innerCircle.attr("cx", function(d) {
          return d.x;
        });
        innerCircle.attr("cy", function(d) {
          return d.y;
        });
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

        // tell the position for the circle instance
        // in relative scale
        circle.origin({
          x: translatePixelToRelativeX(d.x),
          y: translatePixelToRelativeY(d.y)          
        });
        //circle.position(d);

        // notify the other circles that the 
        // circle has been moved and they
        // need to be moved as well
        obj.circleMoveCallback()(circle); //, d);
      };

      var innerCircleDrag = d3.behavior.drag()
        .origin(Object)
        .on("drag", innerDragMove)
        .on("dragend", function(d) {
          if(obj.highlight()) {
            // all circles
            resolveAllCircles();
          } else {
            // only one circle
            var circleInst = _getCircleInstance(d.id);
            resolveAreaCells(circleInst);
          }
        });

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
          var limit = obj.circleTruncateLength(),
          name = circle.name();
          if(name.length > limit) {
            return name.substring(0, limit) + "...";
          } else {
            return name;
          }
        })
        .call(innerCircleDrag);


      var outerCircleDrag = d3.behavior.drag()
        .on("drag", function(d) {
          var direction, newRadius;

          var x = Math.abs(d3.event.x -d.x),
          y = Math.abs(d3.event.y - d.y);
          direction = (x >= y) ? x : y;

          newRadius = Math.max(_circleConfig.radius.min, Math.min(direction, _circleConfig.radius.max));

          d.r = newRadius;
          outerCircle.attr('r', newRadius);
          innerCircle.attr('r', function(t) {
            t.r = newRadius;
            return t.r;
          });

          if(obj.highlight()) {
            // just in case there's an intersection going on
            resolveAllCircles();
          }
          else {
            resolveAreaCells(circle);
          }

          var newRadiusInRel = translatePixelToRelative(newRadius);
          circle.radius(newRadiusInRel);

          obj.circleResizeCallback()(circle);
        });

      var outerCircle = circleAnchor.append('circle')
        .data([{
          x: origin.x,
          y: origin.y,
          r:  radiusInPx + 3, // slightly larger
          id: circle.id()
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

        // place initial position & radius
        circle.origin({
          x: translatePixelToRelativeX(origin.x),
          y: translatePixelToRelativeY(origin.y)
        });
        circle.radius(translatePixelToRelative(radiusInPx));

        resolveAreaCells(circle);
    }

    doAdd();
  };

  obj.removeCircle = function(circleInst) {
    var selector = '.circle-container#' + circleInst.id(),
    circleElement = d3.select(obj.element()[0]).select(selector);

    removeCircleHighlights(circleInst);

    circleElement.remove();
  };

  obj.highlight = function(value, render) {
    if(!arguments.length) { return priv.highlight; }

    // 1. assign value
    priv.highlight = value;

    if(render === true) {
      if(priv.highlight) {
        // 2. Resolve area cells which also does highlighting
        resolveAllCircles();      
      }
      else {
        removeAllCircleHighlights();
      }
    }

    return obj;
  };

  obj.injections = function(x) {
    if(!arguments.length) { return priv.injections; }
    priv.injections = x;
    return obj;
  };

  // renders a SOM plane when called.
  obj.render = function() {

    function doAddPlane() {
      // constants
      var d3 = priv.injections.d3,
      _ = priv.injections._,
      LABEL_FORMAT = d3.format('.1f');

      var plane = priv.plane,
      element = priv.element,
      margin = priv.margins,
      initWidth = priv.width - (margin.left + margin.right),
      initHeight = priv.height - (margin.top + margin.bottom),
      MapColumns = plane.size.n,
      MapRows = plane.size.m,
      // set based on what actually can be fit on the drawing area
      width,
      height,
      svg;

      // do basic hexagon math:

      //The maximum radius the hexagons can have to still fit the screen
      var hexRadius = d3.min([initWidth / ((MapColumns + 0.5) * Math.sqrt(3)),
        initHeight / ((MapRows + 1 / 3) * 1.5)
      ]),
      hexWidth = hexRadius * Math.sqrt(3);

      // store for further use:
      priv.hexRadius = hexRadius;
      priv.hexWidth = hexWidth;

      //Set the new height and width of the SVG based on the max possible
      width = MapColumns * hexRadius * Math.sqrt(3);
      height = MapRows * 1.5 * hexRadius + 0.5 * hexRadius;

      // store for later use
      priv.fitWidth = width;
      priv.fitHeight = height;

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
          //var xp = hexRadius * j * 1.75,
          //yp = hexRadius * i * 1.5;
          points.push({
            "xp": hexRadius * j * 1.75,
            "yp": hexRadius * i * 1.5,
            'i': i,
            'j': j
          });
        } //for j
      } //for i

      // store for later use in resolving area cells
      priv.points = points;

      //Create SVG element
      priv.svg = d3.select(element[0])
        .append('svg')
        .attr('xmlns', "http://www.w3.org/2000/svg")
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .attr('x', 0)
        .attr('y', 0);

      // Background color rectangle
      priv.svg
        .append('g')
        .append('rect')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('fill', '#cccccc');

      priv.svg = priv.svg.append("g")
        .attr("transform", "translate(" + (margin.left + hexWidth / 4) + "," + (margin.top + hexRadius) + ")");

      ///////////////////////////////////////////////////////////////////////////
      ////////////////////// Draw hexagons and color them ///////////////////////
      ///////////////////////////////////////////////////////////////////////////

      //Start drawing the hexagons
      priv.svg.append("g")
        .attr('class', 'hexagon-container')
        .selectAll(".hexagon")
        .data(hexbin(points))
        .enter().append("path")
        .attr("class", "hexagon")
        .attr("d", function(d) {
          return "M" + d.x + "," + d.y + hexbin.hexagon();
        })
        .attr("stroke", function(d, i) {
          return obj.highlightColor();
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

      // add labels
      priv.svg.append("g")
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
          return LABEL_FORMAT(+d.label);
        });

      // identical for every hex on the canvas
      var hexagonPathStr = hexbin.hexagon();
      // the six hex point coordinates, relative to hex origin
      priv.hexagonPoints = _.map(hexagonPathStr.split(/l|m|z/g).slice(2, -1), function(s) {
        var points = s.split(',');
        return {
          x: +points[0],
          y: +points[1]
        };
      });
    }

    function doAddCircles() {
      var _ = priv.injections._,
      somFilters = obj.getSOMFiltersCallback()();

      _.each(somFilters, function(filter) {
        obj.addCircle(filter);
      });

    }

    if(!priv.element) {
      throw new Error("Render element not set!");
    }

    if(!priv.plane) {
      throw new Error("Plane is not set!");
    }

    if(priv.svg) {
      // has been previously rendered: need to remove 
      // contents
      obj.element().empty();
    }

    doAddPlane();
    doAddCircles();
  };

  return obj;
}