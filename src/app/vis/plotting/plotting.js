var visu = angular.module('plotter.vis.plotting', ['plotter.vis.plotting.histogram', 'plotter.vis.plotting.scatterplot', 'plotter.vis.plotting.heatmap', 'services.dimensions', 'services.dataset', 'services.urlhandler']);

// handles crossfilter.js dimensions/groupings and keeps them up-to-date
visu.service('PlotService', ['$injector', 'DimensionService', 'DatasetFactory', 'UrlHandler',
  function($injector, DimensionService, DatasetFactory, UrlHandler) {

    // var config = { dimension: sth, reducedGroup: sth, varX: sth, varY: sth, pooled: false|true };
    this.drawScatter = function(config) {
      // emit signal to create a new window:
      $rootScope = $injector.get('$rootScope');
      var type = 'scatterplot';
      UrlHandler.createWindow( type, config );
      $rootScope.$emit('packery.add', config, type, 'normal');
    };

    // var config = { dimension: sth, reducedGroup: sth, varX: sth, pooled: false|true };
    this.drawHistogram = function(config, filter) {
      // emit signal to create a new window:
      $rootScope = $injector.get('$rootScope');
      var type = 'histogram';
      UrlHandler.createWindow( type, config );
      $rootScope.$emit('packery.add', config, type, 'normal', filter);
    };

    this.drawHeatmap = function(config, filter) {
      // emit signal to create a new window:
      $rootScope = $injector.get('$rootScope');
      var type = 'heatmap';
      var windowSize = config.x.length > 10 ? 'double' : 'normal';
      UrlHandler.createWindow( type, config );
      $rootScope.$emit('packery.add', config, type, windowSize, filter);
    };


  }
]);