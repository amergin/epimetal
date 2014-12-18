var visu = angular.module('plotter.vis.plotting', 
  [
  'plotter.vis.windowing',
  'plotter.vis.plotting.histogram', 
  'plotter.vis.plotting.scatterplot', 
  'plotter.vis.plotting.heatmap',
  'plotter.vis.plotting.som',
  'plotter.vis.plotting.profile-histogram',
  'services.dimensions', 
  'services.dataset', 
  'services.urlhandler',
  'services.window',
  'services.som'
  ]);

// handles crossfilter.js dimensions/groupings and keeps them up-to-date
visu.service('PlotService', ['$injector', 'DimensionService', 'DatasetFactory', 'UrlHandler', 'NotifyService', 'SOMService',
  function($injector, DimensionService, DatasetFactory, UrlHandler, NotifyService, SOMService) {

    this.drawScatter = function(config, windowHandler) {
      var draw = function(config, windowHandler) {
        var type = 'scatterplot';
        config.size = 'normal';
        config.type = 'scatterplot';
        windowHandler.add(config);
        UrlHandler.createWindow( type, config );
      };

      NotifyService.addSpinnerModal('Loading...');

      var plottingDataPromise = DatasetFactory.getVariableData([config.variables.x, config.variables.y]);
      plottingDataPromise.then(function successFn(res) {
          // draw the figure
          draw(config, windowHandler);
          NotifyService.closeModal();
        },
        function errorFn(variable) {
          NotifyService.closeModal();

          var title = 'Variable ' + variable + ' could not be loaded\n',
          message = 'Please check the selected combination is valid for the selected datasets.',
          level = 'danger';
          NotifyService.addTransient(title, message, level);
        });

    };

    this.drawHistogram = function(config, windowHandler) {
      var draw = function(config, windowHandler) {
        var type = 'histogram';
        config.size = 'normal';
        config.type = type;
        config.somSpecial = config.somSpecial || false;
        windowHandler.add(config);

        UrlHandler.createWindow( type, config );
      };

      NotifyService.addSpinnerModal('Loading...');//, _callback);

      var plottingDataPromise = DatasetFactory.getVariableData([config.variables.x]);
      plottingDataPromise.then(function successFn(res) {
          // draw the figure
          NotifyService.closeModal();
          draw(config, windowHandler);
        },
        function errorFn(variable) {
          NotifyService.closeModal();

          var title = 'Variable ' + variable + ' could not be loaded\n',
          message = 'Please check the selected combination is valid for the selected datasets.',
          level = 'danger';
          NotifyService.addTransient(title, message, level);
        });
    };

    this.drawHeatmap = function(config, windowHandler) {
      var draw = function() {
        var type = 'heatmap';
        config.size = config.variables.x.length > 10 ? 'double' : 'normal';
        config.type = type;
        windowHandler.add(config);
        UrlHandler.createWindow( type, config );
      };

      NotifyService.addSpinnerModal('Loading...');//, _callback);
      var plottingDataPromise = DatasetFactory.getVariableData(config.variables.x);
      plottingDataPromise.then(function successFn(res) {
          // draw the figure
          NotifyService.closeModal();
          draw(config, windowHandler);
        },
        function errorFn(variable) {
          NotifyService.closeModal();

          var title = 'Variable ' + variable + ' could not be loaded\n',
          message = 'Please check the selected combination is valid for the selected datasets.',
          level = 'danger';
          NotifyService.addTransient(title, message, level);
        });

    };

    this.drawProfileHistogram = function(config, windowHandler) {
      var draw = function() {
        var type = 'profile-histogram';
        config.type = type;
        windowHandler.add(config);
        UrlHandler.createWindow( type, config );
      };

      NotifyService.addSpinnerModal('Loading...');//, _callback);
      var plottingDataPromise = DatasetFactory.getVariableData(config.variables.x);
      plottingDataPromise.then(function successFn(res) {
          // draw the figure
          NotifyService.closeModal();
          draw(config, windowHandler);
        },
        function errorFn(variable) {
          NotifyService.closeModal();

          var title = 'Variable ' + variable + ' could not be loaded\n',
          message = 'Please check the selected combination is valid for the selected datasets.',
          level = 'danger';
          NotifyService.addTransient(title, message, level);
        });

    };    

    this.drawSOM = function(config, windowHandler) {
      var draw = function(config, windowHandler) {
        config.size = 'normal';
        config.type = 'somplane';
        windowHandler.add(config);
        UrlHandler.createWindow( 'somplane', config );
      };

      SOMService.getPlane(config.variables.x).then(
        function succFn(res) {
          NotifyService.addTransient('Plane computation ready', 'The requested new plane has now been drawn.', 'success');
          angular.extend(config, res);
          draw(config, windowHandler);
        },
        function errFn(res) {
          NotifyService.addTransient('Plane computation failed', res, 'danger');
        }
      );
    };

  }
]);