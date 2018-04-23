angular.module('akangas.services.som', [
  'services.webworker',
  'ext.lodash'
])

.factory('SOMComputeService', ["$q", "WebWorkerService", "_", "$log", function SOMComputeService($q, WebWorkerService, _, $log) {

  var _num_workers = 4,
    retobj = {},
    _planeWorkers = [],
    _trainWorkers = [],
    _initWorker = null,
    _initQueue = [],
    _planeQueue = [],
    _trainQueue = [],
    _dependencies = [];



  function cancel() {
    _.chain(_.union(_planeWorkers, _trainWorkers, [_initWorker]))
      .each(function(worker) {
        // could be null, do a little checking
        if(worker) {
          worker.terminate();
        }
      })
      .value();
    _planeWorkers.length = 0;
    _planeQueue.length = 0;
    _trainWorkers.length = 0;
    _trainQueue.length = 0;
    _initWorker = null;
    _initQueue.length = 0;
    return retobj;
  }

  function dependencies(x) {
    if(!arguments.length) { return _dependencies; }
    _dependencies = x;
    initWorkers();
    return retobj;
  }

  function noWorkers(x) {
    if (!arguments.length) {
      return _num_workers;
    }
    _num_workers = x;
    return retobj;
  }

  function inProgress(promises, workers) {
    return !_.isEmpty(promises) ||
      _.any(workers, function(ww) {
        return ww.isBusy();
      });
  }

  function initWorkers(count) {
    function getInitWorker() {
      var worker = WebWorkerService.create()
        .script(set_training_data)
        .onTerminate(function() {});

      _.each(_dependencies, function(dep) {
        worker.addDependency(dep);
      });
      return worker;
    }

    function getTrainWorkers() {
      var absUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
      return _.times(count, function() {
        var worker = WebWorkerService
          .create()
          .script(get_best_matching_units_ww)
          .onTerminate(function() {});

        _.each(_dependencies, function(dep) {
          worker.addDependency(dep);
        });
        return worker;
      });
    }

    function getPlaneWorkers() {
      var absUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
      return _.times(count, function() {
        var worker = WebWorkerService
          .create()
          .script(calculate_permutations)
          .onTerminate(function() {});

        _.each(_dependencies, function(dep) {
          worker.addDependency(dep);
        });
        return worker;
      });
    }

    _initWorker = getInitWorker();
    _trainWorkers = getTrainWorkers();
    _planeWorkers = getPlaneWorkers();
  }

  function checkWorkers() {
    if (!_trainWorkers.length) {
      initWorkers(_num_workers);
    }
  }



  function init(rows,cols,sampleids,bmus,codebook,distances,weights) {
      console.log('Initializing SOM..');

      var som = {};
      som.epoch = 0;
      som.rows = rows;
      som.cols = cols;

      som.M = codebook.length / (rows*cols);
      som.N = bmus.length;

      som.sampleids = sampleids;
      
      som.codebook = codebook;
      som.distances = distances;
      som.weights = weights;
      som.bmus = bmus;


      return som;

  }


  function create(rows, cols, sampleids, data, pivotcolumn) {

    function doDefault(deferred, payload) {
      var workerPromise = _initWorker.run(payload);

      workerPromise.then(function succFn(result) {
            // worker.terminate();
            // worker = undefined;
            deferred.resolve({
              'som': result.payload.som
            });
          },
          function errFn(err) {
            $log.error('SOM object init failed', err);
            deferred.reject(err);
          },

          function notifyFn(progress) {
            deferred.notify(progress);
          }
        )
        .finally(function() {
          _.remove(_initQueue, function(d) {
            return d == deferred.promise;
          });
        });
    }

    function doQueue(deferred, payload) {
      var queueWithoutMe = _.without(_initQueue, deferred.promise);
      $q.all(queueWithoutMe).then(function succFn(res) {
          doDefault(deferred, payload);
        }, function errFn(reason) {
          console.log("error!", reason);
        })
        .finally(function() {
          _.remove(_initQueue, function(p) {
            return p !== deferred.promise;
          });
        });
    }

    function getObject() {
      console.log('Initializing SOM..');
      

      var som = {};
      som.epoch = 0;
      som.rows = rows;
      som.cols = cols;
      som.pivotcolumn = pivotcolumn;
      som.M = data.length;
      som.N = sampleids.length;
      // som.batch_sample_size = 200;
      som.sampleids = [];

      console.log('Creating SOM of ' + sampleids.length + ' samples');

      som.variablenames = [];

      som.codebook = [];
      som.distances = [];
      som.weights = [];

      som.maxdistance = 0;
      som.coords = [];
      som.samples = new Float32Array(som.N * som.M);

      som.numEpochs = som.rows * som.cols * 0.5;
      som.start_neigh_dist = Math.max(som.rows, som.cols);
      som.end_neigh_dist = 0.5;
      som.input_min = [];
      som.input_max = [];
      som.neighdist = som.start_neigh_dist;
      som.bmus = new Float32Array(som.N);

      return som;
    }

    var withworker = true,
      som = getObject();

    if (withworker) {
      console.log('Using worker to init SOM');

      checkWorkers();

      var payload = {
        'num_workers': _num_workers,
        'som': som,
        'sampleids': sampleids,
        'data': data
      };

      var deferred = $q.defer();
      // _queueWindows.push(windowObject);
      _initQueue.push(deferred.promise);

      if (inProgress(_initQueue, [_initWorker])) {
        doQueue(deferred, payload);
      } else {
        doDefault(deferred, payload);
      }

      return deferred.promise;

    } else {

      console.log('Not using a worker to init SOM');

      set_training_data({
        'som': som,
        'data': data,
        'sampleids': sampleids
      });


      return som;

    }

  }




  function normalcdf(mean, sigma, to) {
    var z = (to - mean) / Math.sqrt(2 * sigma * sigma);
    var t = 1 / (1 + 0.3275911 * Math.abs(z));
    var a1 = 0.254829592;
    var a2 = -0.284496736;
    var a3 = 1.421413741;
    var a4 = -1.453152027;
    var a5 = 1.061405429;
    var erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
    var sign = 1;
    if (z < 0) {
      sign = -1;
    }
    return (1 / 2) * (1 + sign * erf);
  }



  //-------------------------------------------------------------------------------------------------------
  function get_formatter_bmus(som) {


    var return_values = [];

    for (var i = 0; i < som.N; i++) {

      return_values.push({
        'x': som.bmus[i] % som.cols,
        'y': Math.floor(som.bmus[i] / som.cols),
        'sample': som.sampleids[i]
      });
    }

    return return_values;


  }



  //-------------------------------------------------------------------------------------------------------
  function get_best_matching_units_ww(input, output) {


    if (input.samples) {
      self.samples = new Float32Array(input.samples.buffer);
    }

    var units = new Float32Array(input.units.buffer);


    var somobj = {
      M: input.M,
      N: input.N
    };
    var currentbmus = SOMUtils.get_best_matching_units(input.M, input.N, units, self.samples);

    var retObj = {
      result: {
        'success': true
      },
      payload: {
        'bmus': currentbmus
      }
    };

    output.success(retObj);

  }



  //-------------------------------------------------------------------------------------------------------
  function ensureFloat32Array(obj) {

    var t = Object.prototype.toString.call(obj);


    switch (t) {

      case "[object Array]":
      case "[object Object]":


        var newarr = new Float32Array(Object.keys(obj).length);

        var i = 0;
        for (var p in obj) {
          newarr[i] = obj[p];
          i++;
        }
        return newarr;


      case "[object Float32Array]":

        return obj;

      default:
        console.log('ensureFloat32Array warning: Unidentified type');

    }
    return obj;

  }


  function calculate_permutations(input, output) {



    var currentbmus = new Float32Array(input.bmus.buffer);
    var values = new Float32Array(input.values.buffer);
    var weights = new Float32Array(input.weights.buffer);


    var average_values = new Float32Array(input.rows * input.cols);
    var samples_in_cell = new Int16Array(input.rows * input.cols);


    // Random permutations

    var Nperm = input.nperm,
      shuffled_bmus,
      variances = new Float32Array(Nperm),
      plane_mean,
      plane_variance, i = 0;


    for (var it = 0; it < Nperm; it++) {

      if(it % 50 == 0) {
        output.notify(Math.floor(it / Nperm * 100));
      }

      for (i = 0; i < input.rows * input.cols; i++) {
        average_values[i] = 0;
        samples_in_cell[i] = 0;
      }

      shuffled_bmus = _.shuffle(currentbmus);


      for (i = 0; i < shuffled_bmus.length; i++) {
        if (!isNaN(values[i])) {
          average_values[shuffled_bmus[i]] += values[i];
          samples_in_cell[shuffled_bmus[i]] ++;
        } else {
          console.log('NaN');
        }
      }

      plane_mean = 0;

      // Calculating averages for each cell
      for (i = 0; i < input.rows * input.cols; i++) {

        if (samples_in_cell[i] > 0) {

          average_values[i] = average_values[i] / samples_in_cell[i];
        }
      }


      for (i = 0; i < input.rows * input.cols; i++) {

        /* If no samples in cell, interpolate value from 
        surroundings */
        if (samples_in_cell[i] === 0) {

          average_values[i] = 0;
          var cw = 0;
          for (var j = 0; j < input.rows * input.cols; j++) {

            if (samples_in_cell[j] > 0) {
              w = weights[j * input.rows * input.cols + i];
              cw += w;
              average_values[i] += w * average_values[j];
            }
          }

          average_values[i] = average_values[i] / cw;
        }


        plane_mean += average_values[i];
      }



      plane_mean = plane_mean / (input.rows * input.cols);


      plane_variance = 0;

      for (i = 0; i < input.rows * input.cols; i++) {

        plane_variance += ((average_values[i] - plane_mean) * (average_values[i] - plane_mean));
      }

      plane_variance = plane_variance / (input.rows * input.cols);

      variances[it] = plane_variance;

    }


    var retObj = {
      result: {
        'success': true
      },
      payload: {
        'variances': variances
      }
    };


    output.success(retObj);


  }


  //-------------------------------------------------------------------------------------------------------
  function calculate_component_plane(som, sampleids, data_column, variable_name) {
    function doQueue(deferred, som, data_column) {
      var queueWithoutMe = _.without(_planeQueue, deferred.promise);
      $q.all(queueWithoutMe).then(function succFn(res) {
          doDefault(deferred, som, data_column);
        }, function errFn(reason) {
          console.log("error!", reason);
        })
        .finally(function() {
          _.remove(_planeQueue, function(p) {
            return p !== deferred.promise;
          });
        });
    }

    function doDefault(deferred, som, data_column) {
      
      data_column = ensureFloat32Array(data_column);
      som.codebook = ensureFloat32Array(som.codebook);
      som.distances = ensureFloat32Array(som.distances);
      som.bmus = ensureFloat32Array(som.bmus);
      som.weights = ensureFloat32Array(som.weights);

      //som.bmus = SOMUtils.get_best_matching_units(som.M, som.N, som.codebook, som.samples);

      
      valuearr = [];
      var index, i = 0;

      var currentbmusarr = [];

      for (i = 0; i < data_column.length; i++) {

       /*index = _.findIndex(som.sampleids, sampleids[i]);
        if (index < 0) {
          console.log('Sample' + sampleids[i] + " not found");
          continue;
        }*/

        if (!isNaN(data_column[i])) {
          valuearr.push(data_column[i]);
          currentbmusarr.push(som.bmus[i]);
        }

      }

      values = new Float32Array(valuearr.length);
      currentbmus = new Float32Array(valuearr.length);


      for (i = 0; i < valuearr.length; i++) {
        values[i] = valuearr[i];
        currentbmus[i] = currentbmusarr[i];
      }

      

      var color_scale = ["#001FFF", "#0225FF", "#052CFF", "#0A33FF", "#103BFF", 
      "#1744FF", "#1E4DFF", "#2658FF", "#2F63FF", "#386EFF", "#427BFF", 
      "#4C87FF", "#5794FF", "#62A1FF", "#6EAEFF", "#7ABAFF", "#86C6FF", 
      "#93D1FF", "#A0DCFF", "#AEE5FF", "#BCEDFF", "#CAF4FF", "#D8F9FF", 
      "#E7FDFF", "#F7FFFF", "#FFFFF7", "#FFFDE7", "#FFF9D8", "#FFF4CA", 
      "#FFEDBC", "#FFE5AE", "#FFDCA0", "#FFD193", "#FFC686", "#FFBA7A", 
      "#FFAE6E", "#FFA162", "#FF9457", "#FF874C", "#FF7B42", "#FF6E38", 
      "#FF632F", "#FF5826", "#FF4D1E", "#FF4417", "#FF3B10", "#FF330A", 
      "#FF2C05", "#FF2502", "#FF1F00"
      ];

      var average_values = new Float32Array(som.rows * som.cols);
      var samples_in_cell = new Int16Array(som.rows * som.cols);

      // Random permutations

      var Nperm = 4000;
      var shuffled_bmus;
      var variances = new Float32Array(Nperm);
      var plane_mean;
      var plane_variance;

      // Running workers, storing promises
      var workerPromises = [];

      for (w = 0; w < _num_workers; w++) {

        var obj = {
          rows: som.rows,
          cols: som.cols,
          bmus: currentbmus,
          codebook: som.codebook,
          weights: som.weights,
          values: values,
          nperm: Nperm / _num_workers
        };
        workerPromises[w] = _planeWorkers[w].run(obj);

      }

      // so that all workers can pass notify information
      _.each(workerPromises, function(prom) {
        prom.then(function succFn() {}, function errFn(err) {
          $log.error('Worker promise failed', err);
        }, function notifyFn(progress) {
          deferred.notify(progress);
        });
      });

      var date1 = new Date();

      $q.all(workerPromises).then(function succFn(results) {
          deferred.notify(100);
          var plane = calculate_plane_summary(results);

          deferred.resolve(plane);
        }, function errFn(reasons) {
          $log.error('Plane computation failed', reasons);
          deferred.reject(reasons);
        })
        .finally(function() {
          // finished, clear from queue
          _.remove(_planeQueue, function(d) {
            return d == deferred.promise;
          });
        });

      function calculate_plane_summary(results) {
        var variances = results[0].payload.variances;

        for (var w = 1; w < _num_workers; w++) {

          variances = Float32Concat(variances, results[w].payload.variances);
          // workers[w].terminate();
          // workers[w] = undefined;
        }


        var null_mean = 0;
        var null_stddev = 0;

        for (var it = 0; it < Nperm; it++) {
          null_mean += variances[it];
        }

        null_mean = null_mean / Nperm;

        for (it = 0; it < Nperm; it++) {
          null_stddev += ((variances[it] - null_mean) * (variances[it] - null_mean));
        }

        null_stddev = Math.sqrt(null_stddev / Nperm);

        // Final coloring

        var data_mean = 0;
        var N_not_nan = 0;

        for (var i = 0; i < som.rows * som.cols; i++) {
          average_values[i] = 0;
          samples_in_cell[i] = 0;
        }

        for (i = 0; i < currentbmus.length; i++) {
          average_values[currentbmus[i]] += values[i];
          samples_in_cell[currentbmus[i]] ++;
          data_mean += values[i];
          N_not_nan++;
        }

        data_mean = data_mean / N_not_nan;

        plane_mean = 0;
        plane_variance = 0;


        // Calculating averages for each cell
        for (i = 0; i < som.rows * som.cols; i++) {

          if (samples_in_cell[i] > 0) {

            average_values[i] = average_values[i] / samples_in_cell[i];
          }
        }


        for (i = 0; i < som.rows * som.cols; i++) {
          // If no samples in cell, interpolate value from surroundings
          if (samples_in_cell[i] === 0) {

            average_values[i] = 0;
            cw = 0;
            for (var j = 0; j < som.rows * som.cols; j++) {

              if (samples_in_cell[j] > 0) {
                w = som.weights[j * som.rows * som.cols + i];
                cw += w;
                average_values[i] += w * average_values[j];
              }
            }

            average_values[i] = average_values[i] / cw;
          }


          plane_mean += average_values[i];
        }


        plane_mean = plane_mean / (som.rows * som.cols);

        plane_variance = 0;

        for (i = 0; i < som.rows * som.cols; i++) {

          plane_variance += ((average_values[i] - plane_mean) * (average_values[i] - plane_mean));
        }

        plane_variance = plane_variance / (som.rows * som.cols);


        /*  console.log('Real variance');
        console.log(plane_variance);


        console.log('Norm cdf ');
        console.log(normalcdf(null_mean, null_stddev, plane_variance));
        */

        var pvalue = 1 - normalcdf(null_mean, null_stddev, plane_variance);

        console.log('pvalue ', pvalue);
        // SMoothing

        SOMUtils.update_weights(som, 1.5);
        /*    som.neighdist = 2;
        var map_distance_to_weight = new Float32Array(som.maxdistance+1); 
        for(var i=0;i<=som.maxdistance;i++) {
          map_distance_to_weight[i] = get_neighbourhood_coeff(i);
        }

        console.log("Weights");
        console.log(map_distance_to_weight); */

        var cw = 0;
        w = 0;

        var smooth_averages = new Float32Array(som.rows * som.cols);

        for (i = 0; i < som.rows * som.cols; i++) {

          cw = 0;

          smooth_averages[i] = 0;

          for (var n = 0; n < som.rows * som.cols; n++) {

            w = som.weights[n * som.rows * som.cols + i];
            cw += w;
            smooth_averages[i] += w * average_values[n];

          }

          smooth_averages[i] = smooth_averages[i] / cw;


        }

        // -- drawing the plane
        var maxvalue = _.max(smooth_averages);
        var minvalue = _.min(smooth_averages);

        var range = _.max([maxvalue - data_mean, data_mean - minvalue]) * 2;

        // Adjusting the color range according to the statistical significance (p-value)

        range = _.max([range, (-0.5 * (-Math.log10(pvalue) - 3) - 0.5) * range + range]);

        var color_indices = new Float32Array(som.rows * som.cols);

        var plane_object = {};
        plane_object.cells = [];
        plane_object.labels = [];
        plane_object.variable = variable_name;
        plane_object.pvalue = pvalue;
        plane_object.size = {
          'm': som.rows,
          'n': som.cols
        };


        for (i = 0; i < som.rows * som.cols; i++) {

          color_indices[i] = Math.floor( (color_scale.length - 1) * (0.5 + (smooth_averages[i] - data_mean) / range));

          plane_object.cells.push({
            'x': i % som.cols + 1,
            'y': Math.floor(i / som.cols) + 1,
            'color': color_scale[color_indices[i]]
          });

        }

        var step = (maxvalue - minvalue) / 7;
        var stops = [minvalue, maxvalue].concat(_.range(minvalue + step, maxvalue - step, step));


        var label_places = _.range(1, som.rows * som.cols);

        function doSort(l) {
          return _.chain(label_places)
            .sortBy(function(n) {
              return Math.abs(smooth_averages[n] - stops[l]);
            })
            .first()
            .value();
        }

        for (var l = 0; l < stops.length; l++) {

          i = doSort(l);
          var new_places = [];

          for (var k = 1; k < label_places.length; k++) {
            if (som.distances[i * som.rows * som.cols + label_places[k]] > 2) {
              new_places.push(label_places[k]);
            }
          }

          label_places = new_places;

          plane_object.labels.push({
            'x': i % som.cols + 1,
            'y': Math.floor(i / som.cols) + 1,
            'color': '#000000',
            'label': nice_round(smooth_averages[i])
          });

          if (label_places.length === 0) {
            break;
          }

        }

        return {
          'plane': plane_object
        };

      }



    }

    checkWorkers();

    var deferred = $q.defer();
    _planeQueue.push(deferred.promise);

    if (inProgress(_planeQueue, _planeWorkers)) {
      doQueue(deferred, som, data_column);
    } else {
      doDefault(deferred, som, data_column);
    }

    return deferred.promise;
  }


  function nice_round(val) {

    var ret = "";

    var exp = Math.floor(Math.log10(val));

    if (Math.abs(exp) > 3) {
      ret = Math.round(val * Math.pow(10, -exp) * 100) / 100 + "E" + exp;
    } else {
      ret = Math.round(val * Math.pow(10, -exp) * 100) / (100 * Math.pow(10, -exp));
    }

    return ret;

  }


  function train_ww(som) {
    function doDefault(deferred, som) {
      console.log('Starting SOM training');
      som.codebook = ensureFloat32Array(som.codebook);
      som.samples = ensureFloat32Array(som.samples);
      som.distances = ensureFloat32Array(som.distances);
      som.bmus = ensureFloat32Array(som.bmus);
      som.weights = ensureFloat32Array(som.weights);


      var currentsamples = som.samples;

      var current_bmus,
        new_neighbourhood_radius = som.start_neigh_dist,
        cw = 0;

      w = 0;


      var total_number_of_epochs = Math.ceil(-Math.log2(som.end_neigh_dist / som.start_neigh_dist)) * som.numEpochs;

      var workerPromises = [];
      for (w = 0; w < _num_workers; w++) {
        obj = {
          M: som.M,
          N: som.N,
          samples: som.sample_slices[w],
          units: som.codebook
        };
        workerPromises[w] = _trainWorkers[w].run(obj, [som.sample_slices[w].buffer]);
      }

      var date1 = new Date();

      $q.all(workerPromises).then(iterate,
        function errFn(reasons) {
          console.log('error', reasons);
        });

      function iterate(results) {
        var current_bmus = results[0].payload.bmus;

        for (var w = 1; w < _num_workers; w++) {
          current_bmus = Float32Concat(current_bmus, results[w].payload.bmus);
        }

        deferred.notify(Math.round(som.epoch / total_number_of_epochs * 100));
        new_neighbourhood_radius = som.start_neigh_dist / Math.pow(2, Math.floor(((som.epoch + 1) / som.numEpochs)));

        if (new_neighbourhood_radius != som.neighdist) {
          SOMUtils.update_weights(som, new_neighbourhood_radius);
        }

        // Update som
        cw = 0;
        w = 0;
        var m = 0;

        for (var i = 0; i < som.rows * som.cols; i++) {
          cw = 0;

          for (m = 0; m < som.M; m++) {
            som.codebook[i * som.M + m] = 0;
          }

          for (var j = 0; j < current_bmus.length; j++) {
            w = som.weights[current_bmus[j] * som.rows * som.cols + i];
            cw += w;
            for (m = 0; m < som.M; m++) {
              som.codebook[i * som.M + m] += w * currentsamples[j * som.M + m];
            }
          }

          for (m = 0; m < som.M; m++) {
            som.codebook[i * som.M + m] = som.codebook[i * som.M + m] / cw;
          }


        }

        som.epoch = som.epoch + 1;
        console.log(som.epoch);

        if (new_neighbourhood_radius > som.end_neigh_dist) {
          for (w = 0; w < _num_workers; w++) {
            obj = {
              M: som.M,
              N: som.N,
              units: som.codebook
            };
            workerPromises[w] = _trainWorkers[w].run(obj);
          }

          $q.all(workerPromises).then(iterate, function errFn(reasons) {
            console.log('error', reasons);
          });

        } else {
          var date2 = new Date();
          var diff = date2 - date1; //milliseconds interval
          console.log('Training duration: ' + diff);

          som.bmus = SOMUtils.get_best_matching_units(som.M, som.N, som.codebook, som.samples);


          // finished, clear from queue
          _.remove(_trainQueue, function(d) {
            return d == deferred.promise;
          });

          deferred.notify(100);
          deferred.resolve({
            message: "SOM is trained"
          });

        }
      }

    }

    function doQueue(deferred, som) {
      var queueWithoutMe = _.without(_trainQueue, deferred.promise);
      $q.all(queueWithoutMe).then(function succFn(res) {
          doDefault(deferred, som);
        }, function errFn(reason) {
          console.log("error!", reason);
        })
        .finally(function() {
          _.remove(_trainQueue, function(p) {
            return p !== deferred.promise;
          });
        });
    }

    var deferred = $q.defer();
    _trainQueue.push(deferred.promise);

    if (inProgress(_trainQueue, _trainWorkers)) {
      doQueue(deferred, som);
    } else {
      doDefault(deferred, som);
    }

    return deferred.promise;
  }

  function Float32Concat(first, second) {
    var firstLength = first.length,
      result = new Float32Array(firstLength + second.length);

    result.set(first);
    result.set(second, firstLength);

    return result;
  }

  //-------------------------------------------------------------------------------------------------------
  function set_training_data(input, output) {
    console.log('setting training data');
    var som = input.som;
    var data_columns = input.data;
    var sampleids = input.sampleids;

    som.sampleids = sampleids;

    som.N = sampleids.length;
    som.M = data_columns.length;

    // som.batch_sample_size = _.min([som.N, 2000]);
    som.bmus = new Float32Array(som.N);

    // console.log(data_columns);

    if (output) output.notify(10);
    SOMUtils.precalculate_distances(som);

    if (output) output.notify(30);
    SOMUtils.preprocess_som_samples(som, data_columns);

    if (output) output.notify(65);
    SOMUtils.init_prototype_vectors(som);

    if (output) output.notify(95);

    som.sample_slices = [];

    var slice_length = Math.ceil(som.N / input.num_workers);

    for (var s = 0; s < input.num_workers; s++) {

      start_index = s * slice_length * som.M;
      end_index = (s + 1) * slice_length * som.M;

      if (end_index < som.samples.length) {
        som.sample_slices[s] = SOMUtils.sliceFloat32Array(som.samples, start_index, end_index);
      } else {
        som.sample_slices[s] = SOMUtils.sliceFloat32Array(som.samples, start_index, som.samples.length);
      }


    }

    if (output) output.notify(100);
    console.log('done!');

    var retObj = {
      result: {
        'success': true
      },
      payload: {
        'som': som
      }
    };

    if (output) output.success(retObj);
    return retObj;
  }

  retobj = {
    "create": create,
    "init": init,
    // "set_training_data": set_training_data,
    "train": train_ww,
    "get_formatter_bmus": get_formatter_bmus,
    "calculate_component_plane": calculate_component_plane,
    "noWorkers": noWorkers,
    "dependencies": dependencies,
    "cancel": cancel
  };

  return retobj;

}]);