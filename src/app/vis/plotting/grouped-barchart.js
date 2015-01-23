function GroupedBarChart(element, width, height) {
  var _chart = {};

  var _margins = {
      top: 20,
      right: 20,
      bottom: 90,
      left: 20
    },
    _element = element,
    _width = width || 700,
    _height = height || 300,
    _colors = d3.scale.category20(),
    _svg,
    _bodyG,
    _data,
    _yLabel,
    _barNames,
    _x0 = d3.scale.ordinal().rangeRoundBands([0, visibleWidth()], 0.30),
    _x1 = d3.scale.ordinal(),
    _y = d3.scale.linear().range([visibleHeight(), 0.5]).nice(),
    _yDisabled = false,
    _legendDisabled = false,
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


  _chart.render = function() {
    if (!_svg) {
      _svg = d3.select(element).append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        // .attr('height', _height)
        // .attr('width', _width)
        .attr("viewBox", "0 0 " + _width + " " + _height)
        .attr("preserveAspectRatio", "xMinYMin")
        .call(_tooltip);
      renderAxes(_svg);
      defineBodyClip(_svg);
    }
    updateYaxis();
    renderBody(_svg);
    if(!_legendDisabled) {
      renderLegend(_bodyG);
    }
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

  _chart.legendDisabled = function(val) {
    if(!arguments.length) { return _legendDisabled; }
    _legendDisabled = val;
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
    if(!arguments.length) { return _data; }
    _data = data;

    _x0.domain(data.map(function(d) { return d.name; } ));
    _barNames = data[0].groups.map(function(d) { return d.name; } );
    _x1.domain(_barNames).rangeRoundBands([0, _x0.rangeBand()]);

    var min = d3.min(data, function(group) { return d3.min(group.groups, function(bar) { return +bar.value; } ); });
    var max = d3.max(data, function(group) { return d3.max(group.groups, function(bar) { return +bar.value; } ); });
    _y.domain([-max, max]);

    return _chart;
  };

  _chart.rotate = function(rotate) {
    if (!arguments.length) { return _rotateGroupLabel; }
    _rotateGroupLabel = rotate;
    return _chart;
  };

  _chart.yLabel = function(label) {
    if(!arguments.length) { return _yLabel; }
    _yLabel = label;
    return _chart;
  };

  _chart.yAxisDisabled = function(val) {
    if(!arguments.length) { return _yDisabled; }
    _yDisabled = val;
    return _chart;
  };

  function updateYaxis() {
    if(_yDisabled) { return; }
    _svg.select(".y.axis")
    .transition()
    .call(_yAxis);
  }

  function renderAxes(svg) {
    var axesG = svg.append("g")
    .attr("class", "axes");

    renderXAxis(axesG);
    if(!_yDisabled) { renderYAxis(axesG); }
  }

  function renderXAxis(axesG) {
    _xAxis = d3.svg.axis()
      .scale(_x0)
      .tickSize(0)
      .orient("bottom");


    var x = axesG
    .append("g")
    .attr("class", "x axis")
    .attr("transform", function() {
      return "translate(" + xStart() + "," + yStart() + ")";
    })
    .call(_xAxis);

    if(_rotateGroupLabel) {
      x.selectAll("text")
      .style("text-anchor", "end")
      .style("font-size", "1em")
      .attr("dx", "-1.5em")
      .attr("dy", "0.3em")
      .attr("transform", "rotate(-65)");
    }
    x.selectAll("text").style({ 'stroke-width': '4px'});

    var middleAxis = d3.svg.axis()
    .scale(_x0)
    .tickSize(0)
    .ticks(0)
    .orient("top");

    axesG
    .append("g")
    .attr("class", "middle axis")
    .attr("transform", function() {
      return "translate(" + xStart() + "," + (_y(0) + yEnd()) + ")";
    })
    .call(middleAxis)
    .selectAll("text").remove();
  }

  function renderYAxis(axesG) {
    _yAxis = d3.svg.axis()
    .scale(_y)
    .orient("left")
    .tickFormat(d3.format(".2s"));

    var yAxisG = axesG.append("g")
    .attr("class", "y axis")
    .attr("transform", function() {
      return "translate(" + xStart() + "," + yEnd() + ")";
    })
    .call(_yAxis);

    renderYText(yAxisG);
  }

  function renderYText(yAxisG) {
    yAxisG.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text(_yLabel);
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
        return "translate(" + _x0(d.name) + ",0)"; 
      });

      // update for groups
      _bodyG.selectAll("g.group")
      .data(_data)
      .attr("transform", function(d) { 
        return "translate(" + _x0(d.name) + ",0)"; 
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
      .enter()
      .append("rect")
      .attr("class", "group-rect")
      .attr("width", _x1.rangeBand())
      .attr("x", function(d) { return _x1(d.name); })
      .attr("y", function(d) {  
        return _y( Math.max(0, d.value) );
      })
      .on("mouseover", function(d) {
        d3.select(this).style("cursor", "pointer");
        _tooltip.show.apply(this,arguments);
      })
      .on("mouseout", function(d) {
        d3.select(this).style("cursor", null);
        _tooltip.hide(this, arguments);
      })
      .on("click", _onClick)
      .attr("height", function(d) { return Math.abs( _y(d.value) - _y(0) ); })
      .style("fill", function(d) {
        return _colorAccessor(d, _colors);
      });

      // update
      _bodyG.selectAll("g.group")
      .selectAll(".group-rect")
      // .transition().ease("linear")
      .attr("x", function(d) { return _x1(d.name); })
      // .transition().ease("linear")
      .transition().ease("linear")
      .attr("y", function(d) {  
        return _y( Math.max(0, d.value) );
      })
      .attr("height", function(d) { return Math.abs( _y(d.value) - _y(0) ); });

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

  function renderLegend(svg) {
    var legend = svg.selectAll(".legend")
    .data(_barNames.slice())
    .enter().append("g")
    .attr("class", "legend")
    .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });    

    legend.append("rect")
    .attr("x", visibleWidth() - 18)
    .attr("width", 18)
    .attr("height", 18)
    .style("fill", _colors);

    legend.append("text")
    .attr("x", visibleWidth() - 24)
    .attr("y", 9)
    .attr("dy", ".35em")
    .style("text-anchor", "end")
    .text(function(d) { return d; });    
  }

  function defineBodyClip(svg) {
    var padding = 5;

    svg.append("defs")
    .append("clipPath")
    .attr("id", "body-clip")
    .append("rect")
    .attr("x", 0 - padding)
    .attr("y", 0)
    .attr("width", visibleWidth() + padding)
    .attr("height", visibleHeight() - padding);
  }

  function visibleHeight() {
    return _height - _margins.top - _margins.bottom;
  }

  function visibleWidth() {
    return _width - _margins.left - _margins.right;
  }

  function renderBody(svg) {
    if (!_bodyG) {
      _bodyG = svg.append("g")
      .attr("class", "body")                    
      .attr("transform", "translate(" + xStart() + "," + yEnd() + ")") 
      .attr("clip-path", "url(#body-clip)");
    }
    renderBars();
  }


  function xStart() {
    return _margins.left;
  }

  function yStart() {
    return _height - _margins.bottom;
  }

  function xEnd() {
    return _width - _margins.right - _margins.left;
  }

  function yEnd() {
    return _margins.top;
  }

  return _chart;
}