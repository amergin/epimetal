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