// log2 polyfill, see 
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/log2
Math.log2 = Math.log2 || function(x) {
  return Math.log(x) / Math.LN2;
};

// log10 polyfill, see
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/log10
Math.log10 = Math.log10 || function(x) {
  return Math.log(x) / Math.LN10;
};

(function(context) {

  function sliceFloat32Array(source, begin, end) {
    var target = new Float32Array(end - begin);

    for (var i = 0; i < begin + end; ++i) {
        target[i] = source[begin + i];
    }
    return target;
  }

  function get_best_matching_units(M, N, units, samples) {
    var mindist = -1;
    var minind = -1;
    var diffsum = 0;
    var currentbmus = new Float32Array(samples.length / M);
    var n_units = units.length / M;


    for(var s =0;s<currentbmus.length;s++) {
      mindist = -1;
      minind = -1;
      for(var u=0;u<n_units;u++) {
        
        diffsum = 0;

        for(var i=0;i<M;i++) {
          diffsum += (units[u*M + i] - samples[s*M+i])*(units[u*M + i] - samples[s*M+i]);
        }

        if(mindist < 0 || diffsum < mindist ) {

          mindist = diffsum;
          minind = u;
        }
      
      }
      
      currentbmus[s] = minind;
    }
    

    return currentbmus;

  }

  function update_weights(som, radius) {

    som.neighdist = radius;
    var d;

    for(var src_i = 0; src_i < som.rows*som.cols; src_i++) {
      
      for(var dest_i = 0; dest_i < som.rows*som.cols; dest_i++) {

        d = som.distances[ src_i*som.rows*som.cols + dest_i ];

        som.weights[src_i*som.rows*som.cols + dest_i] = Math.exp( - d*d / (radius * radius) );
        

      }
    }

  }

  function init_prototype_vectors(som) {
    // Initializing 4 random centroids

    som.codebook = new Float32Array(som.rows*som.cols*som.M);

    var centroids = new Float32Array(som.M*4);


    // Centroid 1, zero values
    i=0;
    for(var m=0;m<som.M;m++) {
      centroids[i*som.M+m] = 0;
    }

    // Centroid 2, ladder up
    i=1;
    for(var m=0;m<som.M;m++) {
      centroids[i*som.M+m] = m/som.M;
    }

    // Centroid 3, ladder down
    i=2;
    for(var m=0;m<som.M;m++) {
      centroids[i*som.M+m] = 1 - m/som.M;
    }

    // Centroid 4, ones
    i=3;
    for(var m=0;m<som.M;m++) {
      centroids[i*som.M+m] = 1;
    }
    
    // Running k-Means clustering
    
    var kmeans_t = 0, kmeans_T = 1000;
    var current_bmus;


    var centroid_cw = new Float32Array(4);

    while(kmeans_t<kmeans_T) {
    
      current_bmus = SOMUtils.get_best_matching_units(som.M, som.N, centroids, som.samples);

      for(var i=0;i<4;i++) {
        for(var m=0;m<som.M;m++) {
          centroids[i*som.M+m] = 0;
        }
        centroid_cw[i] = 0;
      }

      for(var i=0;i<current_bmus.length;i++) {
        centroid_cw[current_bmus[i]]++;
        for(var m=0;m<som.M;m++) {
          centroids[current_bmus[i]*som.M + m] += som.samples[i*som.M + m];
        }
      }

      for(var i=0;i<4;i++) {
        for(var m=0;m<som.M;m++) {
          centroids[i*som.M+m] = centroids[i*som.M+m] / centroid_cw[i];
        }
      }

      kmeans_t++;
      
    }




    SOMUtils.update_weights(som, som.start_neigh_dist);

    var centroid_bmus = [0,som.cols-1,(som.rows-1)*som.cols + som.cols-1,(som.rows-1)*som.cols];
    
    // Update som
    var cw = 0;
    var w = 0;

    for(var i=0;i<som.rows*som.cols; i++) {

      cw = 0;

      for(var m=0;m<som.M;m++) {
        som.codebook[i*som.M + m] = 0;
      }

      for(var j=0;j<4;j++) {
        w = som.weights[centroid_bmus[j]*som.rows*som.cols + i];
        cw += w;
        for(var m=0;m<som.M;m++) {
          som.codebook[i*som.M + m] += (w * centroids[j*som.M + m]);
        }       
      }

      for(var m=0;m<som.M;m++) {
        som.codebook[i*som.M + m] = som.codebook[i*som.M + m] / cw;
      }


    }

  }

  function preprocess_som_samples(som, original_values) {
    console.log('preprocess');
    som.samples = new Float32Array(som.M * som.N);
    som.input_min = new Float32Array(som.M);
    som.input_max = new Float32Array(som.M);

    var val = 0;

    
    if(som.pivotcolumn) {
      
      console.log('Yes!')

      var category_counts = [];
      var category_indices = [];
      

      for(var i=0; i<som.N; i++) {
        
        if(isNaN(som.pivotcolumn[i])) {
          console.log('No NaN\'s allowed in pivotcolumn');
          break;
        }

        if(!category_counts[som.pivotcolumn[i]]) {
          category_counts[som.pivotcolumn[i]] = 1;
          category_indices[som.pivotcolumn[i]] = [i];
        } else {
          category_counts[som.pivotcolumn[i]]++;
          category_indices[som.pivotcolumn[i]].push(i);
        }
      }

      console.log('There are '+Object.keys(category_counts).length+' categories.');
      console.log(category_counts);
      console.log(category_indices);

      var category_averages = [];

      // Calculating means for each category
      for(var category in category_indices) {

          var sums = new Float32Array(som.M);
          var counts = new Float32Array(som.M);
          
          category_averages[category] = [];

          for(var j=0;j<som.M;j++) {
            
            sums[j] = 0;
            counts[j] = 0;

            for(var n=0;n<category_indices[category].length;n++) {

              if(!isNaN(original_values[j][category_indices[category][n]])) {
                sums[j] += original_values[j][category_indices[category][n]];  
                counts[j]++;
              }
             
            }

            category_averages[category][j] = sums[j]/counts[j];
          }

      }

      console.log('Averages by category : ' + category_averages);

      var category_stdevs = [];

      // Calculating stdevs for each category
      for(var category in category_indices) {

          var sums = new Float32Array(som.M);
          var counts = new Float32Array(som.M);
          
          category_stdevs[category] = [];

          for(var j=0;j<som.M;j++) {
            
            sums[j] = 0;
            counts[j] = 0;

            for(var n=0;n<category_indices[category].length;n++) {


              if(!isNaN(original_values[j][category_indices[category][n]])) {

                sums[j] += Math.pow(original_values[j][category_indices[category][n]] - category_averages[category][j],2);
                counts[j]++;

              }
             
            }

            category_stdevs[category][j] = Math.sqrt(sums[j]/counts[j]);
          }

      }

      console.log('Std. devs by category: ' +category_stdevs);

     // Normalizing
      for(var category in category_indices) {
          for(var j=0;j<som.M;j++) {
            for(var n=0;n<category_indices[category].length;n++) {
              original_values[j][category_indices[category][n]] = (original_values[j][category_indices[category][n]] - category_averages[category][j])/category_stdevs[category][j];
            }
          }
      }

    }



    for(var j=0;j<som.M;j++) {
      console.log(j);

      var arr = original_values[j];

      
      som.input_min[j] = 0; //_.min(arr);
      som.input_max[j] = 1; //_.max(arr);

      var sorted = arr.slice().sort(function(a,b){return b-a});
      var ranks = arr.slice().map(function(v){ return sorted.indexOf(v)+1 });


      for(var i=0;i<som.N;i++) {

        //som.samples[i*som.M+j] = arr[i];
        if(isNaN(arr[i])) {
          som.samples[i*som.M+j] = 0.5;
        } else {
          val = 2 * (ranks[i] / som.N) - 1;
          som.samples[i*som.M+j] = ((val + val*val*val) + 2)/4;

        }
        
      }


    }


  }

  //-------------------------------------------------------------------------------------------------------
  // Precalculates distances between SOM cells
  //
  // See: http://keekerdc.com/2011/03/hexagon-grids-coordinate-systems-and-distance-calculations/
  //
  function precalculate_distances(som)  {

    som.coords = new Array(som.rows*som.cols);

    for (var dest_r=0; dest_r<som.rows; dest_r++) {
          for (var dest_c=0; dest_c<som.cols; dest_c++) {

            var dest_x = 0.5 + dest_c + (1 - dest_r % 2) * 0.5;
            var dest_y = 0.5 + Math.sqrt(0.75)*dest_r;
            
            som.coords[dest_r*som.cols + dest_c] = {x: dest_x, y: dest_y};

              
          }
      }

      var distance;

      for(var src_i = 0; src_i < som.rows*som.cols; src_i++) {
      
      for(var dest_i = 0; dest_i < som.rows*som.cols; dest_i++) {

        distance = (som.coords[dest_i].x - som.coords[src_i].x)*(som.coords[dest_i].x - som.coords[src_i].x) + (som.coords[dest_i].y - som.coords[src_i].y)*(som.coords[dest_i].y - som.coords[src_i].y);
        distance = Math.sqrt(distance);

        /*Math.max(Math.abs(coords[dest_i].x - coords[src_i].x), 
                             Math.abs(coords[dest_i].y - coords[src_i].y),
                             Math.abs(coords[dest_i].z - coords[src_i].z)  ); */
        som.distances[ src_i*som.rows*som.cols + dest_i ] = distance;
        
        if(som.maxdistance < distance) {
          som.maxdistance = distance;
        }


      }
      }

  }

  //-------------------------------------------------------------------------------------------------------
  function calc_weighted_average(som, weights, vectors) {

    var result = _.map(vectors[0], function() {return 0;});
    var wsum = 0;

    for(var i=0;i<vectors.length;i++) {
      for(var j=0;j<result.length;j++) {
        result[j] = result[j] + weights[i] * vectors[i][j];
      }
      wsum += weights[i];   
    }

    result = _.map(result, function(r) { return r/wsum; });
    return result;

  }

  //-------------------------------------------------------------------------------------------------------
  function calc_average(som, vectors) {

    var result = _.map(vectors[0], function() {return 0;});
    var wsum = 0;

    for(var i=0;i<vectors.length;i++) {
      for(var j=0;j<result.length;j++) {
        result[j] = result[j] + vectors[i][j];
      }
      wsum += 1;  
    }

    result = _.map(result, function(r) { return r/wsum; });
    return result;
  }
  //-------------------------------------------------------------------------------------------------------

  context.SOMUtils = {
    "calc_average": calc_average,
    "calc_weighted_average": calc_weighted_average,
    "precalculate_distances": precalculate_distances,
    "preprocess_som_samples": preprocess_som_samples,
    "init_prototype_vectors": init_prototype_vectors,
    "update_weights": update_weights,
    "get_best_matching_units": get_best_matching_units,
    "sliceFloat32Array": sliceFloat32Array
  };
})(self);