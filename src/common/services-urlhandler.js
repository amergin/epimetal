var dimMod = angular.module('services.urlhandler', ['services.dataset', 'ui.router']);

// handles crossfilter.js dimensions/groupings and keeps them up-to-date
dimMod.service('UrlHandler', ['$injector', 'constants', '$location', 'DatasetFactory', '$state', '$rootScope',
  function($injector, constants, $location, DatasetFactory, $state, $rootScope) {


    function data() {
      var _data = {
        tabs: {
          'explore': { 'active': true },
          'som': {},
          'regression': {}
        },
        datasets: [],
        filters: {},
        url: {}
      };
      _data['active'] = _data['tabs']['explore'];

      _data.activeTab = function(id) {
        if (!arguments.length) {
          return _data['active'];
        }
        _data.activeTab()['active'] = false;
        _data['tabs'][id]['active'] = true;
        _data['active'] = _data['tabs'][id];
        return _data;
      };

      _data.updateDataset = function() {
        _data['datasets'] = DatasetFactory.getSets();
      };

      _data.window = function(id, d) {
        var act = _data.activeTab();
        if (!arguments.length) {
          return act['windows'];
        }
        act['windows'][id] = d;
        return _data;
      };

      _data.removeWindow = function(id) {
        var act = _data.activeTab();
        delete act['windows'][id];
        return _data;
      };

      return _data;
    }

    var details = data();

    // called on page load to extract the current state from parameters
    this.loadNewPageState = function(path, PlotService) {
    }; // function

    this.clear = function() {
    };

    this.updateDataset = function() {
      details.updateDataset();
    };

    this.createWindow = function(type, config) {
      console.log(type, config);
      // details.window(config.winid, config);
    };

    this.activeTab = function(id) {
      details.activeTab(id);
    };

    this.removeWindow = function(type, selection, filter) {
      console.log(type,selection,filter);
    };

  }
]);