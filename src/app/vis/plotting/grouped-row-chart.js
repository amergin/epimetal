function GroupedRowChart() {
  var _chart = {};

  var _margins = {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10
    },
    _element,
    _width,
    _height,
    _colors = d3.scale.category20(),
    _svg,
    _bodyG,
    _data,
    _yLabel,
    _barNames,
    _groupSortFn,
    _zeroAxis,
    _xScale = d3.scale.linear(),
    _yLabelPadding = 80,
    _xExtent,
    _y0Scale = d3.scale.ordinal(),
    _y1Scale = d3.scale.ordinal(),
    _yAxisLabel,
    _xAxisLabel,
    _legendNames = [],
    _legendWidth = 125,
    _legend,
    _legendEnabled = true,
    _tooltipAccessor = function(d, ind, grpInd) {
      var group = _data[grpInd];
      return [
      "<strong>Group:</strong> " + "<span style='color: red'>" + group.name + "</span>",
      "<strong>Name:</strong> " + "<span style='color: red'>" + d.name + "</span>",
      "<strong>Value:</strong> " + "<span style='color: red'>" + d.value + "</span>"
      ].join("<br>");
    },
    _yAxis,
    _xAxis,
    _rotateGroupLabel,
    _onClick,
    _colorAccessor = function(d) {
      return _colors(d.name);
    },
    _tooltip = d3.tip()
    .attr('class', 'd3-tip')
    .offset(function(d, barInd, grpInd) {
      if( grpInd >= _data.length - 3 ) {
        return [0,-20];
      } else {
        return [0,20];
      }
    })
    .direction(function(d, barInd, grpInd) {
      if( grpInd >= _data.length - 3 ) {
        return "w";
      } else {
        return "e";
      }
    })
    .html(_tooltipAccessor);

  function renderLegend(bodyG) {
    // enter on legend group
    var legend = bodyG.selectAll(".legend")
    .data(_legendNames.slice().sort())
    .enter()
    .append("g")
    .attr("class", "legend")
    .attr("transform", function(d, i) { 
      return "translate(0," + i * 20 + ")"; 
    });

    // inside group: rectangle
    legend
    .append("rect")
    .attr("x", xEnd() + _legendWidth - 18)
    .attr("width", 18)
    .attr("height", 18)
    .style("fill", function(d) {
      return _colorAccessor(d, _colors);
    });

    // inside group: text
    legend.append("text")
    .attr("x", function() {
      return xEnd() + _legendWidth - 27;
    })
    .attr("y", 9)
    .attr("dy", ".35em")
    .style("text-anchor", "end")
    .text(function(d) { return d; });

    // update on group
    // should be no actions?
 
   // exit
    bodyG
    .selectAll(".legend")
    .data(_legendNames.slice().sort())
    .exit()
    .transition()
    .duration(300)
    .style("opacity", 0)
    .remove();
  }

  _chart.render = function() {
    if (!_svg) {
      _svg = d3.select(_element).append("svg")
        // .attr("width", _width + _margins.left + _margins.right)
        // .attr("height", _height + _margins.top + _margins.bottom)
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", "0 0 550 720")
        .attr("preserveAspectRatio", "xMinYMid meet")
        .call(_tooltip);
      // defineBodyClip(_svg);
    }
    renderAxes(_svg);
    renderBody(_svg);
    return _chart;
  };

  _chart.element = function(x) {
    if(!arguments.length) { return _element; }
    _element = x;
    return _chart;
  };

  _chart.yAxisLabel = function(x) {
    if(!arguments.length) { return _yAxisLabel; }
    _yAxisLabel = x;
    return _chart;
  };

  _chart.xAxisLabel = function(x) {
    if(!arguments.length) { return _xAxisLabel; }
    _xAxisLabel = x;
    return _chart;
  };

  _chart.width = function(x) {
    if(!arguments.length) { return _width; }
    _width = x;
    return _chart;
  };

  _chart.sort = function(fn) {
    if(!arguments.length) { return _yAxisSortFn; }
    _yAxisSortFn = fn;
    return _chart;
  };

  _chart.height = function(x) {
    if(!arguments.length) { return _height; }
    _height = x;
    return _chart;
  };

  _chart.margins = function(x) {
    if(!arguments.length) { return _margins; }
    _margins = x;
    return _chart;
  };

  _chart.groupSort = function(fn) {
    if(!arguments.length) { return _groupSortFn; }
    _groupSortFn = fn;
    return _chart;
  };

  _chart.tooltip = function(accessor) {
    if(!arguments.length) { return _tooltipAccessor; }
    _tooltipAccessor = accessor;
    _tooltip.html(function() {
      return _tooltipAccessor.apply(this, arguments);
    });
    return _chart;
  };

  _chart.legend = function(val) {
    if(!arguments.length) { return _legendEnabled; }
    _legendEnabled = val;
    return _chart;
  };

  _chart.onClick = function(fn) {
    if(!arguments.length) { return _onClick; }
    _onClick = fn;
    return _chart;
  };

  _chart.colors = function(colors) {
    if(!arguments.length) { return _colors; }
    _colors = colors;
    return _chart;
  };

  _chart.colorAccessor = function(fn) {
    if(!arguments.length) { return _colorAccessor; }
    _colorAccessor = fn;
    return _chart;
  };

  _chart.data = function(data) {
    function getGroupNames(data) {
      return _.map(data, function(g) {
        return g.name; 
      });
    }

    function getGroupContents(data) {
      return _.map(data[0].groups, function(g) { 
        return g.name; 
      })
      .sort();
    }

    if(!arguments.length) { return _data; }
    _data = data;

    var min = d3.min(_data, function(group) { return d3.min(group.groups, function(bar) { return +bar.value; } ); });
    var max = d3.max(_data, function(group) { return d3.max(group.groups, function(bar) { return +bar.value; } ); });
    _xExtent = [min, max];

    // sort groups
    _data.sort(_groupSortFn);
    _legendNames = getGroupContents(data);

    _xScale.domain(_xExtent).range([0, visibleWidth()]).nice();
    _y0Scale.domain(getGroupNames(data)).rangeRoundBands([0, visibleHeight()], 0.19);
    _y1Scale.domain(_legendNames).rangeRoundBands([0, _y0Scale.rangeBand()]);

    return _chart;
  };

  function renderAxes(svg) {
    function renderXAxis(axesG) {
      if(!_xAxis) {
        _xAxis = d3.svg.axis()
        .scale(_xScale)
        .ticks(5)
        .tickFormat(d3.format(".2s"))
        .orient("bottom");
      } else {
        _xAxis.scale(_xScale);
      }

     // enter
      axesG
      .selectAll(".x.axis")
      .data([_xExtent])
      .enter()
      .append("g")
      .attr("class", "x axis")
      .attr("transform", function() {
        return "translate(" + xStart() + "," + yStart() + ")";
      })
      .call(_xAxis);

      // update
      axesG
      .selectAll(".x.axis")
      .data([_xExtent])
      .transition().duration(1000).ease("sin-in-out")
      .attr("transform", function() {
        return "translate(" + xStart() + "," + yStart() + ")";
      })
      .call(_xAxis);

      // exit
      axesG
      .selectAll(".x.axis")
      .data([_xExtent])
      .exit()
      .remove();

    }

    function renderXAxisLabel(axesG) {
      // enter
      axesG
      .selectAll(".x.label")
      .data([_xAxisLabel])
      .enter()
      .append("text")
      .attr("transform", function() {
        return "translate(" + xStart() + ",0)";
      })
      .attr("class", "x label")
      .attr("text-anchor", "end")
      .attr("x", xEnd())
      .attr("y", yStart() - 9)
      .text(_xAxisLabel);

      // update
      axesG
      .selectAll(".x.label")
      .data([_xAxisLabel])
      .text(_xAxisLabel);

      // exit
      axesG
      .selectAll(".x.label")
      .data([_xAxisLabel])
      .exit()
      .remove();
    }

    function renderYAxisLabel(axesG) {
      // enter
      axesG.selectAll(".y.label")
      .data([_yAxisLabel])
      .enter()
      .append("text")
      .attr("transform", function() {
        return "translate(" + xStart() + "," + yEnd() + "),rotate(-90)";
      })
      .attr("class", "y label")
      .attr("text-anchor", "end")
      .attr("x", 0)
      .attr("y", yEnd() + 4)
      .text(_yAxisLabel);

      // update
      axesG.selectAll(".y.label")
      .data([_yLabel])
      .text(_yAxisLabel);

      // exit
      axesG.selectAll(".y.label")
      .data([_yLabel])
      .exit()
      .remove();
    }    

    function renderZeroAxis(axesG) {
      if(!_zeroAxis) {
        var identity = d3.scale.identity()
        .domain([0, visibleHeight()]);

        _zeroAxis = d3.svg.axis()
        .scale(identity)
        .ticks(0)
        .tickSize(0)
        .orient("left");
      }

      // enter
      axesG
      .selectAll(".zero.axis")
      .data([_xExtent])
      .enter()
      .append("g")
      .attr("class", "zero axis")
      .attr("transform", function() {
        return "translate(" + (xStart() + _xScale(0)) + "," + yEnd() + ")";
      })
      .call(_zeroAxis);


      // update
      axesG
      .selectAll(".zero.axis")
      .data([_xExtent])
      .transition().ease("sin-out")
      .attr("transform", function() {
        return "translate(" + (xStart() + _xScale(0)) + "," + yEnd() + ")";
      });
      // .call(_zeroAxis);

      // exit
      axesG.selectAll(".zero.axis")
      .data([_xExtent])
      .exit()
      .remove();
    }

    function renderYAxis(axesG) {
      _yAxis = d3.svg.axis()
      .scale(_y0Scale)
      .orient("left");

      var rand = Math.random();

      // enter
      axesG
      .selectAll(".y.axis")
      .data([rand])
      .enter()
      .append("g")
      .attr("class", "y axis")
      .attr("transform", function() {
        return "translate(" + ( _margins.left + _yLabelPadding)  + "," + yEnd() + ")";
      })
      .call(_yAxis);

      // update
      axesG
      .selectAll(".y.axis")
      .data([rand])
      .attr("transform", function() {
        return "translate(" + ( _margins.left + _yLabelPadding)  + "," + yEnd() + ")";
      })
      .call(_yAxis);

      // exit
      axesG
      .selectAll(".y.axis")
      .data([rand])
      .exit()
      .remove();

    }

    // enter
    svg.selectAll(".axes")
    .data([null])
    .enter()
    .append("g")
    .attr("class", "axes");

    var axesG = _svg.select('.axes');

    renderXAxis(axesG);
    renderXAxisLabel(axesG);
    renderYAxis(axesG);
    renderYAxisLabel(axesG);

    renderZeroAxis(axesG);
  }

  function renderBars() {
    function renderGroups() {
      // enter for groups
      _bodyG.selectAll("g.group")
      .data(_data)
      .enter()
      .append("g")
      .attr("class", "group")
      .attr("transform", function(d) { 
        return "translate(0," + _y0Scale(d.name) + ")"; 
      });

      // update for groups
      _bodyG.selectAll("g.group")
      .data(_data)
      .attr("transform", function(d) { 
        return "translate(0," + _y0Scale(d.name) + ")";
      });

      // exit for groups
      _bodyG.selectAll("g.group")
      .data(_data)
      .exit()
      .remove();
    }

    function renderGroupBars() {
      // enter
      _bodyG.selectAll("g.group")
      .selectAll(".group-rect")
      .data(function(d) { return d.groups; })
      .sort(function(a,b) {
        return d3.ascending(a.name, b.name);
      })
      .enter()
      .append("rect")
      .attr("class", "group-rect")
      .attr("x", function(d) {
        return _xScale( Math.min(0, d.value) );
      })
      .attr("y", function(d) {
        return _y1Scale(d.name);
      })
      .attr("width", function(d) {
        return Math.abs( _xScale(d.value) - _xScale(0) );
      })
      .attr("height", function(d) {
        return _y1Scale.rangeBand();
      })
      .style("fill", function(d) {
        return _colorAccessor(d, _colors);
      })
      .on("mouseover", function(d) {
        d3.select(this).style("cursor", "pointer");
        _tooltip.show.apply(this, arguments);
      })
      .on("mouseout", function(d) {
        d3.select(this).style("cursor", null);
        _tooltip.hide(this, arguments);
      })
      .on("click", _onClick);


      // update
      _bodyG.selectAll("g.group")
      .selectAll(".group-rect")
      .data(function(d) { return d.groups; })
      .sort(function(a,b) {
        return d3.ascending(a.name, b.name);
      })
      .transition().ease("sin-out")
      .attr("width", function(d) {
        return Math.abs( _xScale(d.value) - _xScale(0) );
      })
      .style("fill", function(d) {
        return _colorAccessor(d, _colors);
      })
      .transition().ease("sin-out")
      .attr("x", function(d) {
        return _xScale( Math.min(0, d.value) );
      })
      .transition().ease("sin-out")
      .attr("y", function(d) {
        return _y1Scale(d.name);
      })
      .transition().ease("sin-out")
      .attr("height", function(d) {
        return _y1Scale.rangeBand();
      });

      // remove
      _bodyG.selectAll("g.group")
      .selectAll(".group-rect")
      .data(function(d) { return d.groups; })
      .exit()
      .remove();
    }

    renderGroups();
    renderGroupBars();
  }  

  function defineBodyClip(svg) {
    svg.append("defs")
    .append("clipPath")
    .attr("id", "body-clip")
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", visibleWidth())
    .attr("height", visibleHeight());
  }

  function visibleWidth() {
    return _width - _yLabelPadding - _legendWidth;
  }

  function visibleHeight() {
    return _height - 25;
  }

  function renderBody(svg) {
    if (!_bodyG) {
      _bodyG = svg.append("g")
      .attr("class", "body")                    
      .attr("transform", "translate(" + xStart() + "," + yEnd() + ")") 
      .attr("clip-path", "url(#body-clip)");
    }
    renderBars();
    if(_legendEnabled) {
      renderLegend(_bodyG);
    }
  }

  function xStart() {
    return _margins.left + _yLabelPadding;
  }

  function yStart() {
    return _height;
  }

  function xEnd() {
    return visibleWidth();
  }

  function yEnd() {
    return _margins.top;
  }

  return _chart;
}