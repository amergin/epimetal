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
      var samples = {};
      var active = false;

      // --------------------------------------
      // functions
      // --------------------------------------

      this.setSamples = function (samp) {
        samples = samp;
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
      //debugger;
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

    service.getSets = function() {
      return that.sets;
    };

    service.toggle = function(name) {
      that.sets[name].toggle();
    };

    service.isActive = function(name) {
      return that.sets[name].active();
    };

    service.activeSets = function() {
      return _.filter( that.sets, function(set) { return set.isActive(); } );
    };



    return service;
  }
]);








