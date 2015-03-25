var mod = angular.module('services.urlhandler', ['services.dataset', 'ui.router']);

// handles crossfilter.js dimensions/groupings and keeps them up-to-date
mod.factory('UrlHandler', ['$injector', '$location', 'DatasetFactory', 'DimensionService', '$rootScope', '$state', 'SOMService',
  function($injector, $location, DatasetFactory, DimensionService, $rootScope, $state, SOMService) {

    var _service = {};

    // gathers the current state of the application
    _service.create = function() {
      // emits an event that provides a callback for each figure/component
      // to present its current state on this service
      var windows = [];
      function emitGather() {
        var callback = function(win) {
          console.log("callback called, args=", arguments);
          windows.push(win);
        };
        $rootScope.$emit('UrlHandler:getState', callback);
      }

      function getDBFormat() {
        var groupedByHandler = _.chain(windows)
        .map(function(win) {
          // handler object to its name so the object is serializable later
          return _.assign(win, { handler: win.handler.getName() });
        })
        .groupBy('handler')
        .value();

        var activeSets = _.chain( DatasetFactory.getSets() )
        .values()
        .filter(function(set) { return set.isActive(); })
        .map(function(set) { return set.getName(); })
        .value();

        return {
          active: $state.current.name,
          views: groupedByHandler,
          datasets: activeSets,
          som: {
            bmus: SOMService.getBMUs()
          },
          samples: DimensionService.getPrimary().getSampleInfo().active
        };
      }
      emitGather();
      var result = getDBFormat();
      console.log(result);

      return _service;
    };




    return _service;
  }]);