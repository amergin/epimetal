var serv = angular.module('services.dataset', []);

serv.factory('DatasetFactory', [ '$http', '$q',
  function ($http, $q) {

    // privates
    var that = this;
    that.sets = {};
    that.variables = {};
    that.config = {
      datasetsURL: '/API/datasets',
      variablesURL: '/API/headers/NMR_results'
    };


    // --------------------------------------
    // class for defining a single dataset
    function Dataset(dsetName) {

      // --------------------------------------
      // privates:
      // --------------------------------------

      var config = {
        variableURLPrefix: '/API/list/'
      };

      var name = dsetName;
      var color = null;
      // key: variable name, val: map of samples
      var samples = {};


      // --------------------------------------
      // functions
      // --------------------------------------

      this.setSamples = function (samp) {
        samples = samp;
      };

      this.getColor = function () {
        return color;
      };

    } // Dataset class ends


    var service = {};

    service.getVariables = function() {
      var deferred = $q.defer();
      //debugger;
      $http.get(that.config.variablesURL)
        .success(function (response) {
          console.log("Load variable list");
          that.variables = response.data;
          deferred.resolve(response.data);
        })
        .error(function (response) {
          deferred.resolve(response.data);
          //deferred.reject('Error in fetching variable list');
        });
      return deferred.promise;      
    };

    service.getDatasets = function() {
      var deferred = $q.defer();
      $http.get(that.config.datasetsURL)
        .success(function (response) {
          console.log("load dataset names");
          _.each(response.data, function (name) {
            that.sets.push(new Dataset(name));
          });
          deferred.resolve(that.sets);
        })
        .error(function () {
          deferred.reject('Error in fetching dataset list');
        });
      return deferred.promise;
    };

    return service;
  }
]);








