(function(context) {
  var root = {};

  root.getNaNIndices = function(data) {
    var nans = [],
      val;
    for (var i = 0; i < data.length; ++i) {
      val = +data[i];
      if (_.isNaN(val)) {
        nans.push(i);
      }
    }
    return nans;
  };

  root.stripNaNs = function(data, indices) {
    return _.filter(data, function(d, ind) {
      return !_.contains(indices, ind);
    });
  };

  root.getStrippedAdjust = function(data, nanIndices) {
    var ret = [];
    _.each(data, function(array) {
      var copy = array.slice(0);
      ret.push(stripNaNs(copy, nanIndices));
    });
    return ret;
  };

  root.getCIAndPvalue = function(dotInverse, xMatrix, xMatrixTransposed, yMatrixTransposed, n, k, beta) {
    var VARIABLE_INDEX = 1;

    var hMatrix = numeric.dot( numeric.dot(xMatrix, dotInverse), xMatrixTransposed );
    // dispSize("hMatrix", hMatrix);

    var _identity = numeric.identity( _.size(hMatrix) );
    // dispSize("identity", _identity);

    var _subtracted = numeric.sub(_identity, hMatrix);
    // dispSize("subtracted", _subtracted);

    var yMatrix = numeric.transpose(yMatrixTransposed);

    // var _yMatrixTransp = numeric.transpose([yMatrix]);
    // dispSize("yTrans", _yMatrixTransp);
    // dispSize("y", yMatrix);

    var sigma = numeric.dot( numeric.dot( yMatrixTransposed, _subtracted ), yMatrix )[0][0] / (n-(k+1));
    // console.log("sigma=", sigma);
    var cMatrix = numeric.mul(sigma, dotInverse);
    // console.log("cmatrix=", JSON.stringify(cMatrix));

    var alpha = 0.05 / k;

    var _sqrt = Math.sqrt( cMatrix[VARIABLE_INDEX][VARIABLE_INDEX] ); //numeric.getDiag(cMatrix)[1] );
    var degrees = n-(k+1);
    var ci = statDist.tdistr(degrees, alpha/2) * _sqrt;

    // See http://reliawiki.org/index.php/Multiple_Linear_Regression_Analysis 
    // -> p value = 2 * (1-P(T <= |t0|)
    var t = beta / _sqrt;
    var pvalue = statDist.tprob(degrees, t);

    // console.log("CI before [sub, add] of beta = ", ci);
    return {
      ci: [ beta - ci, beta + ci ],
      pvalue: pvalue
    };
  };

  root.dispSize = function(title, matrix) {
    var isArray = function(d) {
      return _.isArray(d);
    };
    console.log(title + ": ", isArray(matrix) ? _.size(matrix) : 1, " x ", isArray(matrix[0]) ? _.size(matrix[0]) : 1);
  };

  root.mean = function(arr) {
    var num = arr.length, sum = 0;
    for(var i = 0; i < arr.length; i++) {
      var val = +arr[i];
      sum += val;
    }
    return sum / num;
  };

  root.getNormalizedData = function(data) {
    var process = function(array) {
      var ret = [],
      avg = regressionUtils.mean(array),
      stDev = mathUtils.stDeviation(array, avg, function(d) { return +d; });
      for(var i = 0; i < array.length; ++i) {
        ret.push( (+array[i] - avg)/stDev );
      }
      return ret;
    };

    var normalized = [];
    // matrix = array with vertical columns
    if( _.isArray(data[0]) ) {
      _.each(data, function(array) {
        normalized.push( process(array) );
      });
    } else {
      normalized = process(data);
    }
    return normalized;
  };


  context.regressionUtils = root;
})(self);