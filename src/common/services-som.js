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

    this.somReady = function() {
      return !_.isEmpty(that.som);
    };

    this.getColor = function(circleId) {
      return _colors(circleId);
    };
    this.getColorScale = function() {
      return _colors;
    };

    this.getBMUs = function() {
      return that.som.bmus;
    };

    this.getSomId = function() {
      return that.som.id;
    };

    this.setDimensionService = function(dimensionService) {
      that.dimensionService = dimensionService;
    };

    this.updateVariables = function(variables) {
      function sameVariables(variables) {
        return _.isEmpty( _.difference(variables, that.somSelection.variables) );
      }

      if( sameVariables(variables) ) {
        return;
      }
      that.somSelection['variables'] = variables;
    };

    that.getVariables = function() {
      return angular.copy(that.somSelection.variables);
    };

    this.getSOM = function() {
      var defer = $q.defer();

      function getSamples() {
        return _.map( that.dimensionService.getSampleDimension().top(Infinity), function(obj) {
          return _.pick( obj, 'dataset', 'sampleid');
        });
      }

      var samples = getSamples();
      var DatasetFactory = $injector.get('DatasetFactory');
      var DimensionService = $injector.get('DimensionService');
      var primary = DimensionService.getPrimary();


      if( samples.length < 10 ) {
        defer.reject('Under 10 samples provided for SOM computation.');
      }
      else if( !_.isUndefined(that.som.bmus) && primary.getSampleDimension().top(Infinity).length == that.som.bmus.length ) {
        console.log('SOM already computed');
        defer.resolve('SOM already computed');
      }
      else if( that.somReady() ) {
        console.log('SOM already computed');
        defer.resolve('SOM already computed');
      }
      else {
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
      return defer.promise;
    };

    this.getPlane = function(testVar) {
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

    return this;
  }
]);
