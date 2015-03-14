function HorizontalBoxPlot(element, width, height) {
  var _chart = {},
      _element = element,
      _width = width,
      _height = height,
      _margins = {
        top: 0, 
        right: 5, 
        bottom: 0, 
        left: 0
      },
      _domain = null,
      _value = Number,
      _quartiles,
      _pvalue = null,
      _color,
      _variable,

      _svg,
      _bodyG,
      _xScale,
      _tooltipFormat = d3.format(".3f"),
      _tooltipAccessor = function(obj) {
        var difference = _tooltipFormat(obj.quartiles[1] - obj.quartiles[0]);
        return [
        "<strong>ß = </strong> <span style='color: red'>" + _tooltipFormat(obj.quartiles[1]) + " ± " + difference + "</span>",
        "<span style='color: red'>(</span>" + "<strong>p = </strong>" + "<span style='color: red'>" + _tooltipFormat(obj.pvalue) + ")</span>"
        ].join('<br>');
      },
      _tooltip = d3.tip()
      .attr('class', 'd3-tip')
      .direction('e')
      .offset([0,+10])
      .html(_tooltipAccessor);

  _chart.render = function() {
    if(!_svg) {
      _svg = d3.select(element)
      .append('svg')
      .attr('height', _height + _margins.top + _margins.bottom)
      .attr('width', _width + _margins.left + _margins.right);
    }

    // body enter
    _bodyG = _svg.selectAll('g.body')
    .data([{quartiles: _quartiles, pvalue: _pvalue}])
    .enter()
    .append('g')
    .attr("transform", "translate(" + _margins.left + "," + _margins.top + ")")
    .attr('class', 'body boxplot')
    .call(_tooltip)
    .on("mouseover", function(d) {
      d3.select(this).style("cursor", "pointer");
      _tooltip.show.apply(this,arguments);
    })
    .on("mouseout", function(d) {
      d3.select(this).style("cursor", null);
      _tooltip.hide(this, arguments);
    });

    // body exit
    // _bodyG = _svg.selectAll('g.body')
    // .data([{quartiles: _quartiles, pvalue: _pvalue}])
    // .exit()
    // .remove();

    wholeBox();
    medianCircle();
    // medianLine();
  };

  function setXScale() {
    _xScale = d3.scale.linear().domain(_domain).range([0,width]);
  }

  function wholeBox() {

    // enter
    var q1q3box = _bodyG.selectAll('rect.whole-box')
    .data([_quartiles])
    .enter().append('rect')
    .attr('class', 'box whole-box')
    .attr('y', 0)
    .attr('x', function(d) {
        return _xScale(d[0]);
    })
    .attr('rx', 7.5) // round corners
    .attr('height', _height)
    .attr('width', function(d) {
        return _xScale(d[2]) - _xScale(d[0]);
    });

    // exit
    _bodyG.selectAll('rect.whole-box')
    .data([_quartiles])
    .exit()
    .remove();

    // update
    _bodyG.selectAll('rect.whole-box')
    .data([_quartiles])
    .attr('x', function(d) {
        return _xScale(d[0]);
    })
    .attr('fill', _color)
    .attr('width', function(d) {
        return _xScale(d[2]) - _xScale(d[0]);
    });

  }

  function medianCircle() {
    var circle = _bodyG.selectAll('circle.median')
    .data([_quartiles[1]]);

    // enter
    circle.enter().append('circle')
    .attr('class', 'median')
    .attr('cx', _xScale)
    .attr('cy', _height/2)
    .attr('r', 3)
    .attr('fill', '#fff');

    // update
    circle.selectAll('circle.median')
    .data([_quartiles[1]])
    .attr('cx', _xScale)
    .attr('cy', _height/2);

    // exit
    circle
    .exit()
    .remove();
  }

  // function medianLine() {
  //   var medianLine = _bodyG.selectAll('line.median')
  //   .data([_quartiles[1]]);

  //   // enter
  //   medianLine.enter().append('line')
  //   .attr('class', 'median')
  //   .attr('x1', _xScale)
  //   .attr('y1', 0)
  //   .attr('x2', _xScale)
  //   .attr('y2', _height);

  //   // update
  //   medianLine.selectAll('line.median')
  //   .data([_quartiles[1]]);

  // }

  // getter
  _chart.scale = function() {
    return _xScale;
  };

  _chart.domain = function(x) {
      if (!arguments.length) {
          return _domain;
      }
      _domain = x;
      setXScale();
      return _chart;
  };

  _chart.quartiles = function(x) {
      if (!arguments.length) {
          return _quartiles;
      }
      _quartiles = x;
      return _chart;
  };

  _chart.pvalue = function(x) {
      if (!arguments.length) {
          return _pvalue;
      }
      _pvalue = x;
      return _chart;
  };

  _chart.margins = function(x) {
      if (!arguments.length) {
          return _margins;
      }
      _margins = x;
      return _chart;
  };

  _chart.variable = function(x) {
      if (!arguments.length) {
          return _variable;
      }
      _variable = x;
      return _chart;
  };

  _chart.color = function(x) {
      if (!arguments.length) {
          return _color;
      }
      _color = x;
      return _chart;
  };

  _chart.remove = function() {
    // not supported yet:
    // _tooltip.remove();
    _svg.remove();
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

  return _chart;
}