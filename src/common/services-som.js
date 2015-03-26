var mod = angular.module('services.som', ['services.dataset', 'services.dimensions', 'services.notify', 'services.tab']);

mod.constant('PLANE_SIZE', { x: 9, y: 7 });
mod.constant('SOM_DEFAULT_PLANES', ['Serum-C', 'Serum-TG', 'HDL-C', 'LDL-C', 'Glc']);
mod.constant('SOM_DEFAULT_TESTVARS', 
  ['XXL-VLDL-L', 'XL-VLDL-L', 'L-VLDL-L', 'M-VLDL-L', 
    'S-VLDL-L', 'XS-VLDL-L', 'IDL-L', 'L-LDL-L',
    'M-LDL-L', 'S-LDL-L', 'XL-HDL-L', 'L-HDL-L', 
    'M-HDL-L', 'S-HDL-L', 'Serum-C', 'Serum-TG', 
    'HDL-C', 'LDL-C', 'Glc', 'Cit', 'Phe', 'Gp', 'Tyr', 
    'FAw3toFA', 'FAw6toFA', 'SFAtoFA']);

mod.factory('SOMService', ['$injector', '$timeout', 'constants', '$rootScope', 'NotifyService', '$q', 'DatasetFactory', 'TabService', 'PLANE_SIZE', 'SOM_DEFAULT_PLANES', 'SOM_DEFAULT_TESTVARS',
  function ($injector, $timeout, constants, $rootScope, NotifyService, $q, DatasetFactory, TabService, PLANE_SIZE, SOM_DEFAULT_PLANES, SOM_DEFAULT_TESTVARS) {

    var that = this;

    this.som = {};
    this.bmus = [];
    this.trainSamples = [];
    that.inProgress = false;
    that.somSelection = {
      variables: SOM_DEFAULT_TESTVARS,
      samples: undefined
    };
    that.SOMPlanes = {};
    that.dimensionService = undefined;
    that.sampleDimension = undefined;

    var _colors = d3.scale.category10();

    var service = {};

    service.somReady = function(sampleCount) {
      return !that.inProgress;
    };

    service.getBMUs = function() {
      return that.bmus;
    };

    service.defaultPlanes = function() {
      return SOM_DEFAULT_PLANES;
    };

    service.planeSize = function() {
      return PLANE_SIZE;
    };

    service.getSomId = function() {
      return that.som.id;
    };

    service.setDimensionService = function(dimensionService) {
      that.dimensionService = dimensionService;
      that.sampleDimension = that.dimensionService.getSampleDimension().get();
      return service;
    };

    service.updateVariables = function(variables, windowHandler) {
      var currEmpty = _.isUndefined(that.somSelection.variables) || that.somSelection.variables.length === 0,
      sameVariables = _.difference(variables, that.somSelection.variables).length === 0;

      if( sameVariables && !currEmpty ) {
        return;
      }
      that.somSelection['variables'] = variables;
      // recompute
      service.getSOM(windowHandler);
    };

    service.getVariables = function() {
      return angular.copy(that.somSelection.variables);
    };

    service.getSOM = function(windowHandler) {
      var defer = $q.defer();

      function computationNeeded() {
        if( !that.sampleDimension ) {
          // early invoke, even before dimensionservice is initialized
          return false;
        }
        var sampleCount = that.sampleDimension.groupAll().value();        
        if( sampleCount === 0 ) {
          // no samples
          return false;
        } else if( sampleCount <= 10 ) {
          NotifyService.addSticky('Error', 'Please select at least 10 samples.', 'error');
          return false;
        } else if( !service.somReady() ) {
          return false;
        }
        return true;
      }

      function removePrevious() {
        // remove previous computation
        that.som = {};
        that.bmus = [];
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

      function doCall() {
        NotifyService.addTransient('Starting SOM computation', 'The computation may take a while.', 'info');
        // var selection = that.somSelection.variables;
        removePrevious();

        var skipNaNs = false;
        var data = getData(skipNaNs);
        that.trainSamples = data.samples;
        that.som = SOM.create(PLANE_SIZE.y, PLANE_SIZE.x, data.samples, data.columns);

        var parallel = new Parallel(that.som, {
          evalPath: 'assets/threads/eval.js'
        })
        .require('underscore-min.js')
        .require('SOM.js')
        .map(trainThread)
        .then(function succFn(somObject) {
          NotifyService.addTransient('SOM computation ready', 'The submitted SOM computation is ready', 'success');
          that.som = somObject;
          that.bmus = SOM.get_formatter_bmus(somObject);
          that.dimensionService.addBMUs(that.bmus);

          // this will force existing planes to redraw
          $rootScope.$emit('dataset:SOMUpdated', that.som);
          TabService.lock(false);
          that.inProgress = false;          
          defer.resolve(that.som);
        }, function errFn(result) {
          var message = '(Message)';
          NotifyService.addTransient('SOM computation failed', message, 'error');
          TabService.lock(false);
          that.inProgress = false;          
          defer.reject(message);
        });

      }

      if( !computationNeeded() ) {
        $timeout(function() {
          defer.reject('not_needed');
        }, 5);

      } else {
        TabService.lock(true);
        that.inProgress = true;

        // important: without clearing filters there's a risk only the sample that
        // are within the circles get passed
        windowHandler.getDimensionService().clearFilters();

        // prefetch data and store it in the dimensionservice of that particular handler
        DatasetFactory.getVariableData(that.somSelection.variables, windowHandler)
        .then(function succFn(res) {
          doCall();
        });
      }

      return defer.promise;
    };

    service.getPlane = function(testVar, windowHandler) {
      TabService.lock(true);
      var defer = $q.defer();
      that.inProgress = true;

      // important: without clearing filters there's a risk only the sample that
      // are within the circles get passed
      windowHandler.getDimensionService().clearFilters();

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
          that.inProgress = false;
          defer.resolve({
            variable: testVar,
            plane: result[0]
          });
        }, function errFn(result) {
          TabService.lock(false);
          that.inProgress = false;
          defer.reject('Plane computation of variable ' + testVar + ' failed');
        });

      }

      return defer.promise;
    };    

    return service;
  }
]);
