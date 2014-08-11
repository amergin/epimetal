var visu = angular.module('plotter.vis.plotting', 
  [
  'plotter.vis.windowing',
  'plotter.vis.plotting.histogram', 
  'plotter.vis.plotting.scatterplot', 
  'plotter.vis.plotting.heatmap',
  'plotter.vis.plotting.som',
  'services.dimensions', 
  'services.dataset', 
  'services.urlhandler',
  'services.window'
  ]);

// handles crossfilter.js dimensions/groupings and keeps them up-to-date
visu.service('PlotService', ['$injector', 'DimensionService', 'DatasetFactory', 'UrlHandler', 'WindowService',
  function($injector, DimensionService, DatasetFactory, UrlHandler, WindowService) {

    this.drawScatter = function(config) {
      // emit signal to create a new window:
      $rootScope = $injector.get('$rootScope');
      var type = 'scatterplot';
      UrlHandler.createWindow( type, config );
      config.size = 'normal';
      config.type = 'scatterplot';
      WindowService.add(config);
    };

    this.drawHistogram = function(config) {
      // emit signal to create a new window:
      $rootScope = $injector.get('$rootScope');
      var type = 'histogram';
      UrlHandler.createWindow( type, config );
      config.size = 'normal';
      config.type = type;
      WindowService.add(config);
    };

    this.drawHeatmap = function(config) {
      // emit signal to create a new window:
      $rootScope = $injector.get('$rootScope');
      var type = 'heatmap';
      config.size = config.variables.x.length > 10 ? 'double' : 'normal';
      config.type = type;
      UrlHandler.createWindow( type, config );
      WindowService.add(config);
    };

    this.drawSOM = function(config) {
      // emit signal to create a new window:
      $rootScope = $injector.get('$rootScope');
      config.size = 'normal';
      config.type = 'somplane';
      UrlHandler.createWindow( 'somplane', config );
      WindowService.add(config);
    };    


  }
]);