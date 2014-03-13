var serv = angular.module('services.dataset', []);

serv.factory('DatasetFactory', [ '$http', '$q',
  function ($http, $q) {

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

      // key: variable name, val: map of samples
      // loaded samples from the api
      var samples = {};

      var active = false;

      // --------------------------------------
      // functions
      // --------------------------------------

      // this.setSamples = function (samp) {
      //   samples = samp;
      // };

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
            console.log("dset returning", _.size(samples[variable]) );
            deferred.resolve(samples[variable]);
          })
          .error(function (response) {
            console.log("dset returning empty");
            deferred.resolve({});
            //growl...
          });
        }
        else {
          // already available, fetched
          deferred.resolve(samples[variable]);
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
          deferred.resolve(response.result);
          //deferred.reject('Error in fetching variable list');
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
    service.getVariableData = function(variable) {
      var sets = service.activeSets();

      var defer = $q.defer();
      var promises = [];

      _.each( sets, function(set) {
        // returns a promise
        promises.push( set.getVarSamples(variable) );
        // extend the current result set with the ones found from
        //_.extend( result, set.getVarSamples(variable) );
      });

      $q.all(promises).then( function(resArray) {
        var result = {};
        _.each( resArray, function(varMap) {
          _.extend( result, varMap );
        });
        defer.resolve(result); 
      } );
      // returns a deferred object
      return defer.promise;
    };

    service.getSets = function() {
      return that.sets;
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








