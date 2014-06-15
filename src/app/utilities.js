// Utilities
var Utils = Utils || {};

Utils.getVariables = function(windowType, selection, splitScatter) {
  if( windowType === 'scatterplot' ) {
    if( splitScatter ) {
      return [selection.x + "|" + selection.y];
    }
    return [selection.x, selection.y];
  }
  else if( windowType === 'histogram' ) {
    return [selection.x];
  }
  else if( windowType === 'heatmap' ) {
    return selection.x;
  }
  else {
    console.log("Undefined type!");
  }
};

Utils.stDeviation = function(array, mean, variable) {
  var dev = array.map(function(item) {
    var val = +item.variables[variable];
    return (val - mean) * (val - mean);
  });

  return Math.sqrt(dev.reduce(function(a, b) {
    return a + b;
  }) / (array.length - 1));
};

Utils.sampleCorrelation = function(samples, varA, meanA, stdA, varB, meanB, stdB) {
  var val = 0;
  _.each(samples, function(samp) {
    var valA = +samp.variables[varA];
    var valB = +samp.variables[varB];
    if (_.isUndefined(valA) || _.isUndefined(valB)) {
      return;
    }
    val += (valA - meanA) * (valB - meanB);
  });
  return val / (stdA * stdB * (samples.length - 1));
};

RegExp.prototype.execAll = function(string) {
    var match = null;
    var matches = [];//new Array();
    while (match = this.exec(string)) {
        var matchArray = [];
        for (var i in match) {
            if (parseInt(i) == i) {
                matchArray.push(match[i]);
            }
        }
        matches.push(matchArray);
    }
    return matches;
};