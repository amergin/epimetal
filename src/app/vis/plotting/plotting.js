var visu = angular.module('plotter.vis.plotting', ['plotter.vis.plotting.histogram', 'plotter.vis.plotting.scatterplot', 'plotter.vis.plotting.heatmap', 'services.dimensions', 'services.dataset']);

// handles crossfilter.js dimensions/groupings and keeps them up-to-date
visu.service('PlotService', ['$injector', 'DimensionService', 'DatasetFactory',
  function($injector, DimensionService, DatasetFactory) {

    // var config = { dimension: sth, reducedGroup: sth, varX: sth, varY: sth, pooled: false|true };
    this.drawScatter = function(config) {
      // emit signal to create a new window:
      $rootScope = $injector.get('$rootScope');
      $rootScope.$emit('packery.add', config, 'scatterplot', 'normal');
    };

    // var config = { dimension: sth, reducedGroup: sth, varX: sth, pooled: false|true };
    this.drawHistogram = function(config) {
      // emit signal to create a new window:
      $rootScope = $injector.get('$rootScope');
      $rootScope.$emit('packery.add', config, 'histogram', 'normal');
    };

    this.drawHeatmap = function(config) {
      // emit signal to create a new window:
      console.log(config);
      $rootScope = $injector.get('$rootScope');
      var windowSize = config.x.length > 10 ? 'double' : 'normal';
      $rootScope.$emit('packery.add', config, 'heatmap', windowSize);
    };


  }
]);