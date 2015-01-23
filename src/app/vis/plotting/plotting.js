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
visu.service('PlotService', ['$injector', 'DimensionService', 'DatasetFactory', 'UrlHandler', 'NotifyService', 'SOMService', '$q',
  function($injector, DimensionService, DatasetFactory, UrlHandler, NotifyService, SOMService, $q) {

    this.drawScatter = function(config, windowHandler) {
      var draw = function(config, windowHandler) {
        var type = 'scatterplot';
        config.size = 'normal';
        config.type = 'scatterplot';
        windowHandler.add(config);
        UrlHandler.createWindow( type, config );
      };

      NotifyService.addSpinnerModal('Loading...');

      var plottingDataPromise = DatasetFactory.getVariableData([config.variables.x, config.variables.y], windowHandler);
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
        config.type = type;
        config.somSpecial = config.somSpecial || false;
        if(config.somSpecial) {
          config.size = {
            width: 400,
            height: 300,
            aspectRatio: 'preserve'
          };
        } else {
          config.size = {
            width: 450,
            height: 375,
            aspectRatio: 'stretch'
          };
        }
        windowHandler.add(config);

        UrlHandler.createWindow( type, config );
      };

      NotifyService.addSpinnerModal('Loading...');//, _callback);

      var promises = [];
      var plottingDataPromise = DatasetFactory.getVariableData([config.variables.x], windowHandler);
      promises.push(plottingDataPromise);

      if( config.somSpecial ) {
        // need from primary as well
        var primaryHandler = windowHandler.getService().getPrimary();
        var primaryPromise = DatasetFactory.getVariableData([config.variables.x], primaryHandler);
        promises.push(primaryPromise);
      }

      $q.all(promises).then(function successFn(res) {
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
      var plottingDataPromise = DatasetFactory.getVariableData(config.variables.x, windowHandler);
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
        config.size = {
          width: 1400,
          height: 400,
          aspectRatio: 'preserve'
        };
        windowHandler.add(config);
        UrlHandler.createWindow( type, config );
      };

      NotifyService.addSpinnerModal('Loading...');//, _callback);
      // will need the data for the SOM dimensionservice 
      var promiseSOM = DatasetFactory.getVariableData(config.variables.x, windowHandler);
      // also for primary, for computing std etc. values
      var primaryHandler = windowHandler.getService().getPrimary();
      var promisePrimary = DatasetFactory.getVariableData(config.variables.x, primaryHandler);

      $q.all([promiseSOM, promisePrimary]).then(function successFn(res) {
          // draw the figure
          NotifyService.closeModal();
          windowHandler.spinAll();
          draw(config, windowHandler);
        },
        function errorFn(variable) {
          NotifyService.closeModal();

          var title = 'Variable ' + variable + ' could not be loaded\n',
          message = 'Please check the selected combination is valid for the selected datasets.',
          level = 'danger';
          NotifyService.addTransient(title, message, level);
        })
        .finally( function() {
          windowHandler.stopAllSpins();
        });
    };    

    this.drawSOM = function(config, windowHandler) {
      var draw = function(config, windowHandler) {
        config.size = 'normal';
        config.type = 'somplane';
        windowHandler.add(config);
        UrlHandler.createWindow( 'somplane', config );
      };

      NotifyService.addTransient('', 'Starting plane computation', 'info');
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