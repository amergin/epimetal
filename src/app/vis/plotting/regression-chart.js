function RegressionChart() {
  var _chart = {};

  var _margins = {
      top: 30,
      right: 5,
      bottom: 0,
      left: 0
    },
    _element,
    // _callback,
    _width,
    _indent = 15,
    _axis,
    _data,
    _header,
    _headerVarRowCount = 2,
    _headerHeight = null,
    _headerSpacing = 30,
    _groupedData,
    _groupSpacing = 30,
    _groupStartYOffset = 30,
    _svg,
    _bodyG,
    _axisHeight = 40,
    _domain = [],
    _domainAdjust = 0.10,
    _zeroPoint = 0,
    _variables,
    _variablesLookup,
    _boxLabelPercentage = 0.4,
    _groupsLookup,
    _boxPlotHeight = 15,
    _boxPlotPadding = 4,
    _boxPlotMargins = {
        top: 0, 
        right: 0, 
        bottom: 0, 
        left: 0
    },
    _circleColors,
    _datasetColors;

  _chart.render = function() {
    function root() {
      // update
      _svg = d3.select(_element)
      .selectAll('svg.regression')
      .data([null])
      .attr('height', _chart.estimatedHeight() + _margins.top + _margins.bottom)
      .attr('width', _width + _margins.left + _margins.right);

      // enter
      _svg
      .enter()
      .append('svg')
      .attr('class', 'regression')
      .attr('height', _chart.estimatedHeight() + _margins.top + _margins.bottom)
      .attr('width', _width + _margins.left + _margins.right);

      // exit
      _svg.exit().remove();
    }

    function bodyG() {
      // update
      _bodyG = _svg.selectAll('g.body')
      .data([null])
      .attr("transform", "translate(" + _margins.left + "," + _margins.top + ")")
      .attr('class', 'body');

      // enter
      _bodyG
      .enter()
      .append('g')
      .attr("transform", "translate(" + _margins.left + "," + _margins.top + ")")
      .attr('class', 'body');

      // exit
      _bodyG.exit().remove();
    }

    function resetRows() {
      function removeAxis() {
        d3.select(_element)
        .selectAll('g.axis')
        .remove();
      }

      function removeGroups() {
        d3.select(_element)
        .selectAll('g.var-group')
        .remove();
      }

      function removeZeroline() {
        d3.select(_element)
        .selectAll('g.zeroline')
        .remove();
      }

      function removeCharts() {
        d3.select(_element)
        .selectAll('g.box-row')
        .each(function(d, elInd) {
          d.charts.forEach(function(chart) {
            chart.remove();
          });
        })
        .remove();
      }

      removeCharts();
      removeGroups();
      removeZeroline();
      removeAxis();
    }

    // function doCallback() {
    //   var height = d3.select(_element).select('svg').attr('height');
    //   _callback(height);
    // }

    sortData();
    computeDomain();
    root();
    bodyG();
    if(_svg) {
      resetRows();
    }

    header();
    boxRows();
    // if(_callback) { doCallback(); }
    return _chart;
  };

  function getHeaderHeight() {
    var lastHeaderStart = (_header.length - 1) * _headerSpacing,
    estRowHeight = 17,
    lastHeight = _header[_header.length-1]._chunked.length * estRowHeight;

    var ret = lastHeaderStart + lastHeight;
    console.log("getHeaderHeight = ", ret);
    return ret;
  }

  function header() {

    var info = getChartMeasurements();

    // enter
    var group = _bodyG.selectAll('g.header')
    .data([_header])
    .enter()
    .append('g')
    .attr('class', 'header');

    var rows = group.selectAll('g.header-row')
    .data(function(d) { return d; })
    .enter()
    .append('g')
    .attr('class', 'header-row');

    var text = rows
    .append('svg:text')
    .attr('x', 0)
    .attr('y', function(d, ind) { return ind * _headerSpacing; });

    text.append('svg:tspan')
    .attr('x', _indent)
    .attr('class', 'title')
    .attr('dy', 0)//10)
    .text(function(d) { return d.title; });

    text.each(function(d) {
      d3.select(this)
      .selectAll('tspan.content')
      .data(function(d) {
        if(!d._chunked.length) { return [[]]; }
        else { return d._chunked; }
      })
      .enter()
      .append('svg:tspan')
      .attr('x', info.xOffset)
      .attr('dy', function(d, ind) {
        return !ind ? 0 : 15;
      })
      .attr('class', 'content')
      .text(function(cont, ind) {
        console.log("cont = ", cont);
        if(!cont.length && ind === 0) {
          return "(None)";
        } else {
          return cont.join(", ");
        }
      });
    });

  }

  function zeroLine() {
    function xOffset() {
      var scale = getScale(),
      scaleOffset = scale(0),
      boxPadding = _boxPlotMargins.left,
      chartOffset = getChartMeasurements().xOffset;
      return chartOffset + scaleOffset + boxPadding - 1;
    }
    var g = _bodyG.selectAll('g.zeroline')
    .data([null])
    .enter()
    .append('g')
    .attr('class', 'zeroline');

    g.selectAll('line')
    .data(function(d) { return [d]; })
    .enter()
    .append('line')
    .attr('x1', xOffset)
    .attr('x2', xOffset)
    .attr('y1', getGroupY(0).firstRow)
    .attr('y2', function(d) {
      var noGroups = _groupedData.length;
      return getGroupY(noGroups-1).end;
    });
  }

  function getGroupY(groupInd) {
    function getSum() {
      var sum = headerHeight;
      for(var i = groupInd-1; i >= 0; --i) {
        sum += getGroupHeight(i);
        sum += _groupSpacing;
      }
      return sum;
    }
    var headerHeight = getHeaderHeight(),
    start = headerHeight, //_headerHeight,
    firstRow = start + getBoxRowY(0, 0).start,
    end,
    labelConst = _groupStartYOffset;

    if(groupInd === 0) {
    } else {
      start = getSum();
    }
    end = start + labelConst + getGroupHeight(groupInd);

    return {
      start: start,
      firstRow: firstRow,
      end: end
    };
  }

  function getDrawWidth() {
    return _width - _margins.left - _margins.right;
  }

  function getGroupHeight(groupInd) {
    return _groupedData[groupInd].values.length * getBoxRowHeight(groupInd);
  }

  function getScale() {
    return _groupedData[0].values[0].charts[0].scale();
  }

  function getChartMeasurements() {
    var rawWidth = _width - _margins.left - _margins.right,
    boxLabelXOffset = Math.floor(_boxLabelPercentage* rawWidth),
    boxWidth = rawWidth - boxLabelXOffset;
    return {
      xOffset: boxLabelXOffset,
      width: boxWidth
    };
  }

  function getChartOffset(ind) {
    var val = (_boxPlotPadding * ind) + (_boxPlotHeight * ind);
    return val;
  }

  function getBoxRowHeight(groupInd) {
    var amount = _groupedData[groupInd].values[0].payload.length,
    boxHeights = amount * _boxPlotHeight,
    paddings  = _boxPlotPadding * (amount-1);
    return  boxHeights + paddings;
  }

  function getBoxRowY(groupInd, elInd) {
    var start =  elInd * getBoxRowHeight(groupInd) + _groupStartYOffset,
    end = start + getBoxRowHeight(groupInd),
    middle = Math.floor((end - start)/2);

    return {
      start: start,
      middle: middle,
      end: end
    };
  }

  function boxRows() {
    function axis() {
      function getAxisYOffset() {
        return _chart.estimatedHeight() - _axisHeight;
      }

      function setAxis() {
        var format = d3.format(",.2f"),
        scale = getScale();
        _axis = d3.svg.axis()
        .scale(scale)
        .orient('bottom')
        .ticks(6)
        .tickFormat(format);
      }

      var chartMeasurements = getChartMeasurements();

      setAxis();

      // create row: enter
      var axisEl = _bodyG.selectAll('g.box-axis')
      .data([_groupedData])
      .enter()
      .append('g')
      .attr('transform', function(d) {
        var x = chartMeasurements.xOffset + _boxPlotMargins.left - 1,
        y = getAxisYOffset();
        return 'translate(' + x + "," + y + ")";
      })
      .attr('class', 'box-row box-axis')
      .attr('width', chartMeasurements.width + _boxPlotMargins.right + _boxPlotMargins.left)
      .attr('height', _axisHeight)
      .attr('class', 'x axis')
      .call(_axis);

    }

    function varGroups() {
      var variableGroups = _bodyG
      .selectAll('g.var-group')
      .data(_groupedData);

      variableGroups
      .enter()
      .append('g')
      .attr('class', 'var-group')
      .attr('transform', function(d, groupInd) {
        var y = getGroupY(groupInd);
        return "translate(" + 0 + "," + y.start + ")";
      })
      .style('opacity', 0)
      .transition()
      .delay(500)
      .style('opacity', 1);

      return variableGroups;
    }

    function varGroupLabels(variableGroups) {
      var groupLabels = variableGroups.selectAll('g.group-label')
      .data(function(d) {
        return [_groupsLookup[+d.key]];
      });

      // enter
      groupLabels
      .enter()
      .append('text')
      .attr('class', 'group-label')
      .attr("dominant-baseline", "central")
      .attr('x', 0)
      .attr('dy', 15)
      .text(function(d) { return d.name; });

      // exit
      groupLabels
      .exit()
      .remove();

      return groupLabels;
    }

    function boxChart(boxRow) {
      var chartMeasurements = getChartMeasurements();

      boxRow
      .append('g')
      .attr('class', 'chart-box')
      .attr('transform', function(d, elInd, groupInd) {
        var x = chartMeasurements.xOffset;
        return "translate(" + x + "," + 0 + ")";
      })
      .each(function(d, i, j) {
        var el = this;
        d.charts = [];

        _.each(d.payload, function(pay, index) {
          var colorFn = pay.type === 'som' ? _circleColors : _datasetColors,
          boxChart = new HorizontalBoxPlot()
          .element(el)
          .width(chartMeasurements.width)
          .height(_boxPlotHeight)
          .transform({ 'x': 0, 'y': getChartOffset(index) })
          .domain(_domain)
          .margins(_boxPlotMargins)
          .variable(d.variable)
          .color(colorFn(pay.name))
          .quartiles([ pay.ci[0], pay.betas[1], pay.ci[1] ])
          .pvalue(pay.pvalue)
          .render();

          d.charts.push(boxChart);
        });

      });
    }

    function boxLabel(boxRow) {
      boxRow
      .append('text')
      .attr('class', 'box-label')
      .attr("dominant-baseline", "central")
      .attr('x', _indent)
      .attr('transform', function(d, elInd, groupInd) {
        var offset = getBoxRowY(groupInd, elInd);
        return "translate(0," + offset.middle + ")";
      })

      .text(function(d) { return d.variable; });
    }

    function rows() {
      // create boxrow for each: enter
      var boxRow = variableGroups.selectAll('g.box-row')
      .data(function(d,i) { 
        return d.values;
      })
      .enter()
      .append('g')
      .attr('class', 'box-row')
      .attr('class', function(d,i) {
        var baseClass = d3.select(this).attr('class');
        return (i % 2 === 0) ?  baseClass + ' even' : baseClass + ' odd';
      })
      .attr('transform', function(d, elInd, groupInd) {
        var offset = getBoxRowY(groupInd, elInd);
        return "translate(0," + offset.start + ")";
      });
      return boxRow;
    }

    function bgRects(boxRow) {
      var info = getChartMeasurements();
      boxRow
      .append('rect')
      .attr('class', 'bg')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', getDrawWidth())
      .attr('height', function(d, elInd, groupInd) {
        return getBoxRowHeight(groupInd);
      });

    }

    var variableGroups = varGroups();
    var groupLabelYOffset = 40;
    var groupLabels = varGroupLabels(variableGroups);

    var boxRow = rows();
    bgRects(boxRow);
    boxLabel(boxRow);
    boxChart(boxRow);

    // last row is axis on each column
    axis();
    zeroLine();
  }

  _chart.onClick = function(fn) {
    if(!arguments.length) { return _onClick; }
    _onClick = fn;
    return _chart;
  };

  _chart.element = function(x) {
    if(!arguments.length) { return _element; }
    _element = x;
    return _chart;
  };

  _chart.width = function(x) {
    if(!arguments.length) { return _width; }
    _width = x;
    return _chart;
  };

  _chart.threshold = function(d) {
    if(!arguments.length) { return _splitThreshold; }
    _splitThreshold = d;
    return _chart;
  };

  _chart.remove = function(d) {
    function remSVG() {
      _svg.remove();
    }

    function remCharts() {
      _data.forEach(function(d) {
        d.charts.forEach(function(chart) {
          chart.remove();
        });
      });
    }

    remCharts();
    remSVG();
  };

  _chart.variables = function(x) {
    if(!arguments.length) { return _variables; }
    _variables = x;
    _variablesLookup = _.chain(_variables).map(function(d) { return [d.name, d]; }).object().value();
    _groupsLookup = _.chain(_variables).map(function(d) { return [d.group.order, d.group]; }).object().value();

    sortData();
    return _chart;
  };

  _chart.callback = function(fn) {
    if(!arguments.length) { return _callback; }
    _callback = fn;
    return _chart;
  };

  _chart.datasetColors = function(x) {
    if(!arguments.length) { return _datasetColors; }
    _datasetColors = x;
    return _chart;
  };

  _chart.circleColors = function(x) {
    if(!arguments.length) { return _circleColors; }
    _circleColors = x;
    return _chart;
  };

  _chart.header = function(x) {
    if(!arguments.length) { return _header; }
    _header = x;
    _.each(_header, function(group) {
      // split to subarrays
      group['_chunked'] = _.chunk(group.content.sort(), _headerVarRowCount);
    });
    return _chart;
  };

  _chart.data = function(data) {
    if(!arguments.length) { return _data; }
    _data = data;
    return _chart;
  };

  _chart.estimatedHeight = function() {
    sortData(); // ensure calculations are based on fresh data
    var noGroups = _groupedData.length;
    return getGroupY(noGroups-1).end + _axisHeight;
  };

  function computeDomain() {
    function getLowerValue(lowVal) {
      if( lowVal >= _zeroPoint ) {
        return _zeroPoint - _domainAdjust;
      }
      return lowVal - _domainAdjust;
    }

    function getUpperValue(upperVal) {
      if( upperVal <= _zeroPoint ) {
        return _zeroPoint + _domainAdjust;
      }
      return upperVal + _domainAdjust;
    }

    var ciValues = _.chain(_data)
    .map(function(d) {
      return d.payload;
    })
    .flatten()
    .map(function(d) { return d.ci; })
    .flatten()
    .value(),
    extent = d3.extent(ciValues),
    lowerValue = getLowerValue(extent[0]),
    upperValue = getUpperValue(extent[1]);

    _domain = [lowerValue, upperValue];
  }

  function sortValues(a,b) {
    var aOrder = _variablesLookup[a.variable].name_order,
    bOrder = _variablesLookup[b.variable].name_order;

    if(aOrder < bOrder) { return -1; }
    if(aOrder > bOrder) { return 1; }
    return 0;
  }

  function sortData() {
    var groupedData = d3.nest().key(function(d) { 
      return _variablesLookup[d.variable].group.order;
    })
    .sortKeys(d3.ascending)
    .sortValues(sortValues)
    .entries(_data);

    _groupedData = groupedData;
  }

  // utilities
  function subarrays(array, n) {
    var len = array.length, out = [], i = 0;
   
    while (i < len) {
      var size = Math.ceil((len - i) / n--);
      out.push(array.slice(i, i += size));
    }
   
    return out;
  }

  return _chart;
}