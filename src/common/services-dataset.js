var serv = angular.module('services.dataset', ['services.notify']);

serv.factory('DatasetFactory', [ '$http', '$q', '$injector',
  function ($http, $q, $injector) {

    // privates
    var that = this;
    that.sets = {};
    that.variables = [];
    that.config = {
      datasetsURL: '/API/datasets',
      variablesURL: '/API/headers/NMR_results'
    };
    that.colors = d3.scale.category20();


    // --------------------------------------
    // class for defining a single dataset
    function Dataset(dsetName, col) {

      // --------------------------------------
      // privates:
      // --------------------------------------

      var config = {
        variableURLPrefix: '/API/list/'
      };

      var name = dsetName;
      var color = col;

      // loaded samples from the api
      var samples = {};

      var active = false;

      // --------------------------------------
      // functions
      // --------------------------------------

      var _restructureSamples = function(samples, variable) {
        var res = {};
        _.each( samples, function(val, sampId) {
          res[sampId] = { dataset: name };
          res[sampId].variables = {};
          res[sampId].variables[variable] = val;
          res[sampId]['id'] = sampId;
        });
        return res;
      };

      // returns a map for the variables asked for,
      // fetches them from api if necessary
      this.getVarSamples = function(variable) {
        // need to get that from api

        // only for active sets
        if( !active ) { return {}; }

        var deferred = $q.defer();
        // check if needed to fetch
        if( _.isUndefined( samples[variable] ) ) {
        $http.get( config.variableURLPrefix + variable + "/in/" + name )
          .success(function (response) {
            samples[variable] = response.result.values;
            //console.log("dset returning", _.size(samples[variable]) );
            deferred.resolve( _restructureSamples( samples[variable], variable ) );
          })
          .error(function (response, status, headers, config) {
            //console.log("dset returning empty");
            // var NotifyService = $injector.get('NotifyService');
            // NotifyService.addSticky('Error receiving data at ' + config.url, 'error' );
            var message = !_.isUndefined( response.result ) ? response.result.error : 
            'Something went wrong while fetching the samples from server. Plotting window will not be drawn.';
            deferred.reject(message);
          });
        }
        else {
          // already available, fetched
          deferred.resolve( _restructureSamples( samples[variable], variable ) );
        }
        return deferred.promise;
      };

      this.getColor = function () {
        return color;
      };

      this.toggle = function() {
        active = !active;
      };

      this.isActive = function() {
        return active;
      };

      this.getName = function() { return name; };
      this.getSize = function() { return _.size( samples ); };


    } // Dataset class ends


    var service = {};

    service.getColorScale = function() {
      return that.colors;
    };

    service.getVariables = function() {
      var deferred = $q.defer();
      $http.get(that.config.variablesURL)
        .success(function (response) {
          console.log("Load variable list");
          // empty just in case it's not empty
          that.variables = [];
          _.each( response.result, function(varNameObj) {
            that.variables.push(varNameObj.name);
          });
          that.variables = _.sortBy( that.variables, function(name) { return name.toLowerCase(); } );
          deferred.resolve(that.variables);
        })
        .error(function (response) {
          deferred.reject('Error in fetching variable list');
        });
      return deferred.promise;      
    };

    service.getDatasets = function() {
      var deferred = $q.defer();
      $http.get(that.config.datasetsURL)
        .success(function (response) {
          console.log("load dataset names");
          _.each(response.result, function (nameObj) {
            // create a dataset stub
            that.sets[nameObj.name] = new Dataset(nameObj.name, that.colors(nameObj.name));
          });
          deferred.resolve(that.sets);
        })
        .error(function () {
          deferred.reject('Error in fetching dataset list');
        });
      return deferred.promise;
    };

    service.variables = function() {
      return that.variables;
    };

    // returns the variable data for the active datasets 
    // and fetches it beforehand from the API if necessary
    service.getVariableData = function(variableX, variableY) {

      // for x & y selection this is called twice with different
      // parameters
      var getCoordPromise = function(selection) {
        var defer = $q.defer();
        var promises = [];
        var sets = service.activeSets();

        _.each( sets, function(set) {
          // returns a promise
          promises.push( set.getVarSamples(selection) );
        });

      $q.all(promises).then( function(resArray) {
        var result = {};

        // combine the results
        _.each( resArray, function(varMap) {
          _.extend( result, varMap );
        });

        // resolve the whole function
        defer.resolve(result); 
      }, function errorFn(res) {
        defer.reject(res);
      } );
      // return the promise, the receiver can then decide
      // what to do when it's filled
      return defer.promise;
      };


      var combinedDefer = $q.defer();
      var DimensionService = $injector.get('DimensionService');
      var xPromise = getCoordPromise( variableX );
      if( !_.isUndefined( variableX ) && !_.isUndefined( variableY ) )
      {
        // x & y
        var yPromise = getCoordPromise( variableY );

        $q.all([xPromise, yPromise]).then( function(resArray) {

          // pass the new data to dimensionService:
          // IMPORTANT: this priv function passes the variables of getVariableData
          // to DimensionService so that the samples are re-added with the new variables
          DimensionService.addVariableData( variableX, resArray[0] );
          DimensionService.addVariableData( variableY, resArray[1] );
          DimensionService.rebuildInstance();

          // resolve this this outer function promise only when both x&y are fetched
          combinedDefer.resolve([
          { coord: 'x', samples: resArray[0] },
          { coord: 'y', samples: resArray[1] } 
          ]);
        }, function errorFn(res) {
          combinedDefer.reject(res);
        } );
      }
      else if( !_.isUndefined( variableX ) )
      {
        // only x
        xPromise.then( function(res) {
          DimensionService.addVariableData( variableX, res );
          DimensionService.rebuildInstance();

          combinedDefer.resolve([
          { coord: 'x', samples: res }
          ]);
        }, function errorFn(res) {
          combinedDefer.reject(res);
        });
      }
      return combinedDefer.promise;
    };

    // assumes getDatasets is called and therefore the service is initialized
    service.getSets = function() {
      return that.sets;
    };

    // get all dset names, whether active or not
    service.getSetNames = function() {
      return _.map( service.getSets(), function(set) {
        return set.getName();
      });
    };

    service.toggle = function(name) {
      that.sets[name].toggle();
    };

    service.activeSets = function() {
      return _.filter( that.sets, function(set) { return set.isActive(); } );
    };

    service.isActive = function(name) {
      return that.sets[name].active();
    };



    return service;
  }
]);
