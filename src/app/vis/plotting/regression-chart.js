function RegressionChart(element, width, height) {
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
    _svg,
    _bodyG,
    _data;

  _chart.render = function() {
    if (!_svg) {
      _svg = d3.select(element).append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        // .attr('height', _height)
        // .attr('width', _width)
        .attr("viewBox", "0 0 " + _width + " " + _height)
        .attr("preserveAspectRatio", "xMinYMin");
      defineBodyClip(_svg);
    }
    return _chart;
  };

  _chart.tooltip = function(accessor) {
    // if(!arguments.length) { return _tooltipAccessor; }
    // _tooltipAccessor = accessor;
    // _tooltip.html(function() {
    //   return _tooltipAccessor.apply(this, arguments);
    // });
    return _chart;
  };

  _chart.onClick = function(fn) {
    if(!arguments.length) { return _onClick; }
    _onClick = fn;
    return _chart;
  };

  _chart.data = function(data) {
    if(!arguments.length) { return _data; }
    _data = data;

    // _x0.domain(data.map(function(d) { return d.name; } ));
    // _barNames = data[0].groups.map(function(d) { return d.name; } );
    // _x1.domain(_barNames).rangeRoundBands([0, _x0.rangeBand()]);

    // var min = d3.min(data, function(group) { return d3.min(group.groups, function(bar) { return +bar.value; } ); });
    // var max = d3.max(data, function(group) { return d3.max(group.groups, function(bar) { return +bar.value; } ); });
    // _y.domain([-max, max]);

    return _chart;
  };

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