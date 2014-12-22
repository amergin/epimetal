var mod = angular.module('services.som', ['services.dataset', 'services.dimensions', 'services.notify']);

mod.factory('SOMService', ['$injector', 'constants', '$rootScope', 'NotifyService', '$q',
  function ($injector, constants, $rootScope, NotifyService, $q) {

    var that = this;

    this.som = {};
    that.somSelection = {
      variables: [],
      samples: undefined
    };
    that.SOMPlanes = {};
    that.dimensionService = undefined;

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

    service.getSomId = function() {
      return that.som.id;
    };

    service.setDimensionService = function(dimensionService) {
      that.dimensionService = dimensionService;
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

    service.getSOM = function() {
      var defer = $q.defer();

      function getSamples() {
        return _.map( that.dimensionService.getSampleDimension().top(Infinity), function(obj) {
          return _.pick( obj, 'dataset', 'sampleid');
        });
      }

      function doCall(samples) {
        NotifyService.addTransient('Starting SOM computation', 'The computation may take a while.', 'success');

        var selection = that.somSelection.variables;
        var datasets = _.map(DatasetFactory.activeSets(), function(set) {
          return set.getName();
        });

        // remove previous computation
        that.som = {};


        var ws = new WebSocket(constants.som.websocket.url + constants.som.websocket.api.som);

        // don't know whether som exists already
        ws.onopen = function() {
          ws.send(JSON.stringify({
            // 'datasets': datasets,
            'variables': selection,
            'samples': samples
          }));
        };

        ws.onclose = function(evt) {
          console.log("SOM WS closed", evt);
        };

        ws.onmessage = function(evt) {
          var result = JSON.parse(evt.data);
          if (result.result.code == 'error') {
            // SOM computation failed
            NotifyService.addTransient('SOM computation failed', result.result.message, 'danger');
            defer.reject(result.result.message);
          } else {
            // SOM comp is OK
            NotifyService.addTransient('SOM computation ready', 'The submitted SOM computation is ready', 'success');
            var som = result.data;
            $rootScope.$emit('dataset:SOMUpdated', result.data);

            that.dimensionService.addBMUs(som.id, som.bmus);
            that.som = som;
            defer.resolve(som);
          }
        };
      }

      var samples = getSamples();
      var DatasetFactory = $injector.get('DatasetFactory');
      var DimensionService = $injector.get('DimensionService');
      var primary = DimensionService.getPrimary();


      if( samples.length < 10 ) {
        defer.reject('Under 10 samples provided for SOM computation.');
      }
      else if( service.somReady(samples) ) {
        console.log('SOM already computed');
        defer.resolve('SOM already computed');        
      }
      else {
        var primarySamplesCount = primary.getSize() > 0 ? primary.getSampleDimension().groupAll().reduceCount().value() : 0;
        var bmuCount = that.som.bmus ? that.som.bmus.length : 0;
        if( primarySamplesCount == bmuCount ) {
          console.log('SOM already computed');
          defer.resolve('SOM already computed');
        } else {
          doCall(samples);
        }
      }
      return defer.promise;
    };

    service.getPlane = function(testVar) {
      var defer = $q.defer();
      var ws = new WebSocket(constants.som.websocket.url + constants.som.websocket.api.plane);
      ws.onopen = function() {
        ws.send(JSON.stringify({
          'somid': that.som.id,
          'datasets': that.som.datasets,
          'variables': {
            'test': testVar,
            'input': that.som.variables
          }
        }));
      };

      ws.onclose = function(evt) {
        console.log("Plane WS closed", evt);
      };

      ws.onmessage = function(evt) {
        var result = JSON.parse(evt.data);
        if (result.result.code == 'error') {
          defer.reject(result.result.message);
        } else {
          that.SOMPlanes[result.data.id] = result.data;
          defer.resolve( angular.copy(result.data) );
        }
      };
      return defer.promise;
    };    

    return service;
  }
]);
