function PolylinearColorBar() {
  function init(selection) {
    function getNoGradients() {
      return priv.domain.length - 1;
    }

    function getColorScale() {
      return d3.scale.linear()
      .domain(priv.domain)
      .range(priv.range);
    }

    function getXScale() {
      return d3.scale.linear()
      .domain([priv.domain[0], priv.domain[priv.domain.length-1]])
      .range([0, priv.width]);
    }

    function getYScale() {
      return d3.scale.linear()
      .domain([priv.domain[0], priv.domain[priv.domain.length-1]])
      .range([0, priv.height]);
    }

    function addGradientDef(ind) {
      return defs.append('svg:linearGradient')
      .attr('id', 'gradient' + ind)
      .attr('gradientTransform', 'rotate(90)');
    }

    function addSVGStop(gradient, ind, start) {
      gradient.append('svg:stop')
      .datum({
        domain: priv.domain 
      })
      .attr('stop-color', function(d) {
        return colorScale(d.domain[ind]);
      })
      .attr('offset', function(d) {
        return start ? '0%' : '100%';
      });
    }

    function addSVGRect(gradient, ind) {
      svg
      .datum({
        domain: priv.domain
      })
      .append('svg:rect')
      .attr('id', 'gradient' + ind + '-bar')
      .attr('fill', 'url(#gradient' + ind + ')')
      .attr('width', function(d) { 
        if(priv.orient == 'horizontal') {
          if(ind === 0) {
            return xScale(d.domain[ind+1]);
          }
          else {
            return xScale(d.domain[ind+1]) - xScale(d.domain[ind]);
          }
        }
        else if(priv.orient == 'vertical') {
          return priv.width;
        }
      })
      .attr('height', function(d) {
        if(priv.orient == 'horizontal') {
          return priv.height;
        }
        else if(priv.orient == 'vertical') {
          return yScale(d.domain[ind+1]) - yScale(d.domain[ind]);
        }
      })
      .attr('transform', function(d) { 
        if(priv.orient == 'horizontal') {
          return 'translate(' + xScale(d.domain[ind]) + ',0)';
        } else if(priv.orient == 'vertical') {
          return 'translate(' + priv.paddingLeft + ',' + yScale(d.domain[ind]) + ')';
        }
      });

    }

    var svg = selection
    .append('svg')
    .attr('width', priv.paddingLeft + priv.width + 10)
    .attr('height', priv.height + 20);

    var defs = svg
    .datum({
      domain: priv.domain
    })
    .append('svg:defs');

    var noGradients = getNoGradients(),
    colorScale = getColorScale(),
    xScale = getXScale(),
    yScale = getYScale(),
    gradients = [],
    gradient;

    if(noGradients % 2 !== 0) {
      throw new Error('Incorrect number of pivot points');
    }

    _.times(noGradients, function(ind) {
      gradient = addGradientDef(ind);
      gradients[ind] = gradient;

      addSVGStop(gradient, ind, true);
      addSVGStop(gradient, ind + 1, false);

      addSVGRect(gradient, ind);

    });

    var axis = d3.svg.axis();

    if(priv.orient == 'horizontal') {
      axis.scale(xScale);
    }
    else if(priv.orient == 'vertical') {
      axis.scale(yScale)
      .orient('left');
    }

    axis
    .tickFormat(d3.format(".1f"))
    .ticks(12);

    svg
    .append('g')
    .attr('class', 'axis');

    svg.selectAll('.axis')
    .attr('transform', function(d) { 
      if(priv.orient == 'horizontal') {
        return 'translate(0,' + (priv.height) + ')';
      }
      else if(priv.orient == 'vertical') {
        return 'translate(' + priv.paddingLeft + ',0)';
      }
    })
    .call(axis);
  }

  var obj = {};
  var priv = {
      domain: [],
      range: [],
      width: 50,
      height: 150,
      orient: 'vertical',
      paddingLeft: 30
  };

  obj.domain = function(x) {
    if(!arguments.length) { return priv.domain; }
    priv.domain = x;
    return obj;
  };

  obj.range = function(x) {
    if(!arguments.length) { return priv.range; }
    priv.range = x;
    return obj;
  };

  obj.height = function(x) {
    if(!arguments.length) { return priv.height; }
    priv.height = x;
    return obj;
  };

  obj.width = function(x) {
    if(!arguments.length) { return priv.width; }
    priv.width = x;
    return obj;
  };

  obj.orient = function(x) {
    if(!arguments.length) { return priv.orient; }
    if( x !== 'horizontal' && x !== 'vertical') {
      throw new Error('Wrong option on orient!');
    }
    priv.orient = x;
    return obj;
  };

  obj.init = function(selection) {
    init(selection);
    return obj;
  };

  return obj;
}