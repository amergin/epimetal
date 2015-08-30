(function(context) {
  var root = {};

  root.stDeviation = function(array, mean, accessFn) {
    // for loop is actually fastest vs js map-reduce
    // http://stackoverflow.com/questions/3762589/fastest-javascript-summation
    var dev = [];
    for (var i = array.length; i--;) {
      var val = accessFn.apply(null, [ array[i] ] );
      // var val = +array[i][variable];
      dev.push((val - mean) * (val - mean));
    }

    var count = 0;
    for (var j = dev.length; j--;) {
      count += dev[j] || 0;
    }

    var retval = Math.sqrt(count / (array.length - 1));
    return retval;
  };

  root.mean = function(arr, variable) {
    var num = arr.length, sum = 0;
    for(var i = 0; i < arr.length; i++) {
      var val = (variable === undefined) ? +arr[i] : +arr[i][variable];
      if( _.isNaN(val) ) {
        --num;
      } else {
        sum += val;
      }
    }
    return sum / num;
  };

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

  root.sampleCorrelation = function(samples, varA, meanA, stdA, varB, meanB, stdB) {
    var val = 0;
    _.each(samples, function(samp, ind) {
      var valA = +samp[varA];
      var valB = +samp[varB];

      var sum = (valA - meanA) * (valB - meanB);
      if (_(sum).isNaN()) {
        return;
      }
      val += sum;
    });
    return val / (stdA * stdB * (samples.length - 1));
  };  

  root.atanh = function(x) {
    return 0.5 * Math.log((1+x)/(1-x));
  };


  /*
  * Approximation for cumulative univariate normal distribution.
  * (G. West : BETTER APPROXIMATIONS TO CUMULATIVE NORMAL FUNCTIONS,
  * https://lyle.smu.edu/~aleskovs/emis/sqc2/accuratecumnorm.pdf)
  */
  root.normCumulativeApprox = function(x) {

    var xabs = Math.abs(x);
    var cm;

    if(xabs > 37) {

      cm = 0;

    } else {

      exponential = Math.exp(- (xabs*xabs) / 2);

      if(xabs < 7.07106781186547) {

        build = 0.0352624965998911 * xabs + 0.700383064443688;
        build = build * xabs + 6.37396220353165;
        build = build * xabs + 33.912866078383;
        build = build * xabs + 112.079291497871;
        build = build * xabs + 221.213596169931;
        build = build * xabs + 220.206867912376;
        cm = exponential * build;
        build = 0.0883883476483184 * xabs + 1.75566716318264;
        build = build * xabs + 16.064177579207;
        build = build * xabs + 86.7807322029461;
        build = build * xabs + 296.564248779674;
        build = build * xabs + 637.333633378831;
        build = build * xabs + 793.826512519948;
        build = build * xabs + 440.413735824752;
        cm = cm / build;
      } else {
        build = xabs + 0.65;
        build = xabs + 4 / build;
        build = xabs + 3 / build;
        build = xabs + 2 / build;
        build = xabs + 1 / build;
        cm = exponential / build / 2.506628274631;
      }
    }

    if(x > 0) {
      cm = 1 - cm;
    }

    return cm;
  };

  root.calcPForPearsonR = function(r,n) {
    var absr = Math.abs(r);
    var zscore = root.atanh(absr) * Math.sqrt(n-3) ;
    return 2*root.normCumulativeApprox(-zscore);
  };

  context.mathUtils = root;

})(self); 