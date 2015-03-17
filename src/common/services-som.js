var mod = angular.module('services.som', ['services.dataset', 'services.dimensions', 'services.notify', 'services.tab']);

mod.factory('SOMService', ['$injector', 'constants', '$rootScope', 'NotifyService', '$q', 'DatasetFactory', 'TabService',
  function ($injector, constants, $rootScope, NotifyService, $q, DatasetFactory, TabService) {

    var that = this;

    this.som = {};
    this.trainSamples = [];
    that.somSelection = {
      variables: [],
      samples: undefined
    };
    that.SOMPlanes = {};
    that.dimensionService = undefined;
    that.sampleDimension = undefined;
    that.defaultPlanes = ['Serum-C', 'Serum-TG', 'HDL-C', 'LDL-C', 'Glc'];

    var _colors = d3.scale.category10();

    var service = {};

    service.somReady = function(samples) {
      var empty = _.isEmpty(that.som);
      if(!empty && samples) { return samples.length == that.som.bmus.length; }
      return !empty;
    };

    service.getBMUs = function() {
      return that.som.bmus || [];
    };

    service.defaultPlanes = function(x) {
      if(!arguments.length) { return that.defaultPlanes; }
      that.defaultPlanes = x;
      return service;
    };

    service.getSomId = function() {
      return that.som.id;
    };

    service.setDimensionService = function(dimensionService) {
      that.dimensionService = dimensionService;
      that.sampleDimension = that.dimensionService.getSampleDimension().get();
      return service;
    };

    service.updateVariables = function(variables) {
      function sameVariables(variables) {
        return _.isEmpty( _.difference(variables, that.somSelection.variables) );
      }

      if( sameVariables(variables) ) {
        return;
      }
      that.somSelection['variables'] = variables;
    };

    service.getVariables = function() {
      return angular.copy(that.somSelection.variables);
    };

    service.getSOM = function(windowHandler) {
      TabService.lock(true);
      var defer = $q.defer();

      function getSampleIds() {
        return _.map( that.sampleDimension.top(Infinity), function(obj) {
          return _.pick( obj, 'dataset', 'sampleid');
        });
      }

      function removePrevious() {
        // remove previous computation
        that.som = {};
      }

      function getData(skipNaNs) {
        var variables = that.somSelection.variables,
        retObj = {
          samples: [],
          columns: new Array(variables.length)
        };

        _.each(that.sampleDimension.top(Infinity), function(obj, ind) {
          var sampValues = _.chain(obj.variables)
          .pick(variables)
          .map(function(val,key) { return [key, val]; })
          .sortBy(_.first)
          .map(_.last)
          .value(),
          containsNaNs = _.some(sampValues, function(d) { return _.isNaN(+d); }),
          sampleId;

          // don't record this one
          if(skipNaNs && containsNaNs) { return; }

          sampleId = _.pick(obj, 'dataset', 'sampleid');
          retObj.samples.push(sampleId);
          _.each(sampValues, function(d,i) {
            // initialize the array on first time
            if( _.isUndefined(retObj.columns[i]) ) { retObj.columns[i] = []; }
            retObj.columns[i].push(sampValues[i]);
          });
        });
        return retObj;
      }

      function trainThread(somObject) {
          SOM.train(somObject);
          return somObject;
      }

      function doCall(samples) {
        NotifyService.addTransient('Starting SOM computation', 'The computation may take a while.', 'info');
        // var selection = that.somSelection.variables;
        removePrevious();

        var skipNaNs = false;
        var data = getData(skipNaNs);
        that.trainSamples = data.samples;
        that.som = SOM.create(7, 9, data.samples, data.columns);

        var parallel = new Parallel(that.som, {
          evalPath: 'assets/threads/eval.js'
        })
        .require('underscore-min.js')
        .require('SOM.js')
        .map(trainThread)
        .then(function succFn(somObject) {
          NotifyService.addTransient('SOM computation ready', 'The submitted SOM computation is ready', 'success');
          that.som = somObject;
          var bmuSamples = SOM.get_formatter_bmus(somObject);
          that.dimensionService.addBMUs(bmuSamples);

          // this will force existing planes to redraw
          $rootScope.$emit('dataset:SOMUpdated', that.som);
          TabService.lock(false);
          defer.resolve(that.som);
        }, function errFn(result) {
          var message = '(Message)';
          NotifyService.addTransient('SOM computation failed', message, 'error');
          TabService.lock(false);          
          defer.reject(message);
        });

      }

      // prefetch data and store it in the dimensionservice of that particular handler
      DatasetFactory.getVariableData(that.somSelection.variables, windowHandler)
      .then(function succFn(res) {
        doCall();
      });
      return defer.promise;
    };

    service.getPlane = function(testVar, windowHandler) {
      TabService.lock(true);
      var defer = $q.defer();

      DatasetFactory.getVariableData([testVar], windowHandler)
      .then(function succFn(res) {
        doCall();
      });

      function getThreadData(variable, skipNaNs) {
        function inTrainSamples(sample) {
          return _.any(that.trainSamples, function(d) { return _.isEqual(d, sample); });
        }

        var retObj = {
          som: that.som,
          samples: [],
          data: [],
          variable: variable
        };
        _.each(that.sampleDimension.top(Infinity), function(obj, ind) {
          var sampValue = +obj.variables[variable],
          isNaN = _.isNaN(sampValue),
          sampleid;

          // don't record this one
          if(skipNaNs && isNaN) { return; }

          sampleId = _.pick(obj, 'dataset', 'sampleid');

          if( !inTrainSamples(sampleId) ) { return; }

          retObj.samples.push(sampleId);
          retObj.data.push(sampValue);
        });
        return [retObj];
      }

      function planeThread(threadData) {
        return SOM.calculate_component_plane(global.env.som, global.env.sampleids, threadData.data, threadData.variable);
      }

      function doCall() {
        var skipNaNs = false;
        var threadData = getThreadData(testVar, skipNaNs);
        var parallel = new Parallel(threadData, {
          evalPath: 'assets/threads/eval.js',
          env : {
            som: that.som,
            sampleids: threadData[0].samples // == that.trainSamples
          }
        })
        .require('lodash.min.js')
        .require('SOM.js')
        .map(planeThread)
        .then(function succFn(result) {
          TabService.lock(false);
          defer.resolve({
            variable: testVar,
            plane: result[0]
          });
        }, function errFn(result) {
          TabService.lock(false);
          defer.reject('Plane computation of variable ' + testVar + ' failed');
        });

      }

      return defer.promise;
    };    

    return service;
  }
]);
