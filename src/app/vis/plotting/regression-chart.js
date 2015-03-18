function RegressionChart(element, width, height) {
  var _chart = {};

  var _margins = {
      top: 20,
      right: 20,
      bottom: 90,
      left: 20
    },
    _splitThreshold = 15,
    _noColumns = 3,
    _element = element,
    _width = width || 700,
    _height = height || 300,
    _columns,
    _bodyG,
    _splitData = [],
    _rootRow,
    _domain = [],
    _domainAdjust = 0.10,
    _zeroPoint = 0,
    _variables,
    _variablesLookup,
    // how many col-sm's in are reserved
    _variableColWidth = 4,
    _boxPlotColWidth = 12 - _variableColWidth,
    _groupsLookup,
    _columnAxes = [],

    _boxPlotHeight = 15,
    _boxPlotWidth = 300,
    _boxPlotMargins = {
        top: 0, 
        right: 15, 
        bottom: 0, 
        left: 15
    },
    _circleColors,
    _totalColor;

  _chart.render = function() {
    function addRoot() {
      _rootRow = d3.select(element)
      .append('div')
      .attr('class', 'row');      
    }

    function resetColumns() {
      _columns
      .each(function(d) {
        // reset axes
        _columnAxes = [];

        // remove axes
        d3.select(this)
        .selectAll('box-axis')
        .remove();

        d3.select(this)
        .selectAll('div.var-group')
        .each(function(vg) {
          d3.select(this)
          .selectAll('div.box-row')
          .each(function(br) {
            // remove all charts to avoid redundant objects
            br.charts.total.remove();
            delete br.charts.total;
            _.each(br.charts.circles, function(circle, key) {
              circle.remove();
              delete br.charts.circles[key];
            });
          });
        })
        .remove(); // remove var-group
      })
      .remove(); // remove column
    }

    function createColumns() {
      _columns = _rootRow.selectAll('div.box-col')
      .data(_splitData);

      // enter
      _columns
      .enter()
      .append('div')
      .attr('class', 'col-sm-' + (12/_noColumns) + ' box-col');
    }

    splitData();
    console.log("split data", _splitData);
    computeDomain();
    if (!_rootRow) {
      _rootRow = d3.select(element)
      .append('div')
      .attr('class', 'row');

      createColumns();
    } else {
      // redraw = remove columns and populate them again
      resetColumns();
      createColumns();
    }

    // update
    _rootRow
    .selectAll('div.box-col')
    .attr('class', 'col-sm-' + (12/_noColumns) + ' box-col');

    boxRows();
    return _chart;
  };

  function setAxis() {
    var format = d3.format(",.2f");
    _columns.each(function(d, colInd) {
      if(!_columnAxes[colInd]) {
        var axis = d3.svg.axis()
        .scale( d[0].values[0].charts.total.scale() )
        .orient('bottom')
        .ticks(7)
        .tickFormat(format);
        _columnAxes.push(axis);
      }
    });
  }

  function getColWidth(num) {
    return 'col-sm-' + num;
  }

  function getColOffset(num) {
    return 'col-sm-offset-' + num;
  }

  function zeroLines() {
    // enter
    _columns
    .style('background', 'linear-gradient(90deg, #888, #888, #888)')
    .style('background-repeat', 'no-repeat')
    .style('background-size', '1px 100%')
    .style('background-position', function(d) {
      var scale = d[0].values[0].charts.total.scale(),
      offsetLeft = this.childNodes[this.childNodes.length-1].offsetLeft, // right column starts at this pixel count, no margin included
      bootMargin = 15, // bootstrap margin
      boxPlotMargin = _boxPlotMargins.left,
      scaleOffset = Math.floor(scale(0)),
      position = Number(offsetLeft + bootMargin + boxPlotMargin + scaleOffset).toString();
      return position + "px -40px";
    });
  }

  function boxRows() {
    function columnAxis() {
      // create row: enter
      var rows = _columns.selectAll('div.box-axis')
      .data([null]) // only on column
      .enter()
      .append('div')
      .attr('class', function(d) {
        var base = 'box-row box-axis ';
        return base + getColOffset(_variableColWidth) + " " + getColWidth(_boxPlotColWidth);
      });

      setAxis();

      var axisSvg = rows.selectAll('svg.box-axis')
      .data([null])
      .enter()
      .append('svg')
      .attr('class', 'box-axis boxplot')
      .attr('width', _boxPlotWidth + _boxPlotMargins.left + _boxPlotMargins.right)
      .attr('height', 40);

      var axisBody = axisSvg.selectAll('g.axis-body')
      .data([null])
      .enter()
      .append('g')
      .attr("transform", "translate(" + _boxPlotMargins.left + "," + _boxPlotMargins.top + ")")
      .attr('class', 'x axis');

      // apply axis for each column
      axisBody.each(function(d, sth, colInd) {
        d3.select(this).call(_columnAxes[colInd]);
      });
    }

    function varGroups() {
      var variableGroups = _columns.selectAll('div.var-group')
      .data(function(d, i) { 
        return d;
      });

      variableGroups
      .enter()
      .append('div')
      .attr('class', 'var-group')
      .style('opacity', 0)
      .transition()
      .delay(500)
      .style('opacity', 1);

      // exit
      // variableGroups
      // .exit()
      // .transition()
      // .delay(5000)
      // .style('opacity', 0)
      // .remove();

      return variableGroups;
    }

    function varGroupLabels(variableGroups) {
      var groupLabels = variableGroups.selectAll('div.group-label')
      .data(function(d) {
        return [_groupsLookup[+d.key]];
      });

      // enter
      groupLabels
      .enter()
      .append('div')
      .attr('class', 'group-label')
      .text(function(d) { return d.name; });

      // exit
      groupLabels
      .exit()
      .remove();

      return groupLabels;
    }

    var variableGroups = varGroups();
    var groupLabels = varGroupLabels(variableGroups);


    // create boxrow for each: enter
    var boxRow = variableGroups.selectAll('div.box-row')
    .data(function(d,i) { 
      return d.values;
    })
    .enter()
    .append('div')
    .attr('class', 'box-row clearfix')
    .attr('class', function(d,i) {
      var baseClass = d3.select(this).attr('class');
      return (i % 2 === 0) ?  baseClass + ' even' : baseClass + ' odd';
    });

    boxRow
    .append('div')
    .attr('class', 'box-label ' + getColWidth(_variableColWidth))
    .text(function(d) { return d.variable; });

    boxRow
    .append('div')
    .attr('class', 'box ' + getColWidth(_boxPlotColWidth))
    .each(function(d, i, j) {
      // total box plot
      var el = this,
      totalBox = new HorizontalBoxPlot(el, _boxPlotWidth, _boxPlotHeight )
      .domain(_domain)
      .margins(_boxPlotMargins)
      .variable(d.variable)
      .color(_totalColor)
      .quartiles([ d.total.ci[0], d.total.betas[1], d.total.ci[1] ])
      .pvalue(d.total.pvalue);
      totalBox.render();

      d.charts = {
        total: totalBox,
        circles: {}
      };

      // circle box plots
      _.each(d.circles, function(circle, id) {
        var circleBox = new HorizontalBoxPlot(el, _boxPlotWidth, _boxPlotHeight )
        .domain(_domain)
        .variable(d.variable)
        .margins(_boxPlotMargins)
        .color(_circleColors[id])
        .quartiles([ circle.ci[0], circle.betas[1], circle.ci[1] ])
        .pvalue(circle.pvalue);
        d.charts.circles[id] = circleBox;
        circleBox.render();
      });
    });

    // update
    // variableGroups.selectAll('div.box-row')
    // .data(function(d,i) { return d; })
    // .each(function(d, rowInd, colInd) {
    //   console.log("update called");
    //   d.charts.total
    //   .quartiles([d.total.ci[0], d.total.betas[1], d.total.ci[1]])
    //   .pvalue(d.total.pvalue)
    //   .render();

    //   _.each(d.charts.circles, function(chart, id) {
    //     chart
    //     .quartiles([d.circles[id].ci[0], d.circles[id].betas[1], d.circles[id].ci[1] ])
    //     .pvalue(d.circles[id].pvalue)
    //     .render();
    //   });
    // });

    // last row is axis on each column
    columnAxis();
    zeroLines();
  }

  _chart.onClick = function(fn) {
    if(!arguments.length) { return _onClick; }
    _onClick = fn;
    return _chart;
  };

  _chart.columns = function(d) {
    if(!arguments.length) { return _noColumns; }
    _noColumns = d;
    return _chart;
  };

  _chart.threshold = function(d) {
    if(!arguments.length) { return _splitThreshold; }
    _splitThreshold = d;
    return _chart;
  };

  _chart.variables = function(x) {
    if(!arguments.length) { return _variables; }
    _variables = x;
    _variablesLookup = _.chain(_variables).map(function(d) { return [d.name, d]; }).object().value();
    _groupsLookup = _.chain(_variables).map(function(d) { return [d.group.order, d.group]; }).object().value();
    return _chart;
  };

  _chart.totalColor = function(x) {
    if(!arguments.length) { return _totalColor; }
    _totalColor = x;
    return _chart;
  };

  _chart.circleColors = function(x) {
    if(!arguments.length) { return _circleColor; }
    _circleColors = x;
    return _chart;
  };


  _chart.data = function(data) {
    if(!arguments.length) { return _data; }
    _data = data;
    console.log("Data changed: ", _data);
    return _chart;
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
      return [_.chain(d.circles).values().map(function(c) { return c.ci; }).value(), 
      d.total.ci
      ]; 
    })
    .flatten(true)
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

  function splitData() {
    var groupedData = d3.nest().key(function(d) { 
      return _variablesLookup[d.variable].group.order;
    })
    .sortKeys(d3.ascending)
    .sortValues(sortValues)
    .entries(_data);
    _splitData = subarrays(groupedData, _noColumns);
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