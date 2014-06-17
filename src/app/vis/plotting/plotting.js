var visu = angular.module('plotter.vis.plotting', ['plotter.vis.plotting.histogram', 'plotter.vis.plotting.scatterplot', 'plotter.vis.plotting.heatmap', 'services.dimensions', 'services.dataset', 'services.urlhandler']);

// handles crossfilter.js dimensions/groupings and keeps them up-to-date
visu.service('PlotService', ['$injector', 'DimensionService', 'DatasetFactory', 'UrlHandler',
  function($injector, DimensionService, DatasetFactory, UrlHandler) {

    // var config = { dimension: sth, reducedGroup: sth, varX: sth, varY: sth, pooled: false|true };
    this.drawScatter = function(config) { //, pooled) {
      // emit signal to create a new window:
      $rootScope = $injector.get('$rootScope');
      var type = 'scatterplot';
      UrlHandler.createWindow( type, config );
      config.size = 'normal';
      config.type = 'scatterplot';
      $rootScope.$emit('packery.add', config); //, type, 'normal', null, pooled);
    };

    // var config = { dimension: sth, reducedGroup: sth, varX: sth, pooled: false|true };
    this.drawHistogram = function(config) { //, filter, pooled) {
      // emit signal to create a new window:
      $rootScope = $injector.get('$rootScope');
      var type = 'histogram';
      UrlHandler.createWindow( type, config );
      config.size = 'normal';
      config.type = type;
      $rootScope.$emit('packery.add', config); //, type, 'normal', filter, pooled);
    };

    this.drawHeatmap = function(config) { //, filter) {
      // emit signal to create a new window:
      $rootScope = $injector.get('$rootScope');
      var type = 'heatmap';
      config.size = config.variables.x.length > 10 ? 'double' : 'normal';
      config.type = type;
      UrlHandler.createWindow( type, config );
      $rootScope.$emit('packery.add', config); //, type, windowSize, filter;
    };


  }
]);