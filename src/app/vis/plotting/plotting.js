var visu = angular.module('plotter.vis.plotting', 
  [
  'plotter.vis.windowing',
  'plotter.vis.plotting.histogram', 
  'plotter.vis.plotting.scatterplot', 
  'plotter.vis.plotting.heatmap',
  'plotter.vis.plotting.som',
  'plotter.vis.plotting.profile-histogram',
  'plotter.vis.plotting.regression',
  'services.dimensions', 
  'services.dataset', 
  'services.window',
  'services.som',
  'services.regression',
  'services.tab'
  ]);

// handles crossfilter.js dimensions/groupings and keeps them up-to-date
visu.service('PlotService', ['$injector', 'DimensionService', 'DatasetFactory', 'NotifyService', 'SOMService', '$q', 'RegressionService', 'TabService',
  function($injector, DimensionService, DatasetFactory, NotifyService, SOMService, $q, RegressionService, TabService) {

    this.drawScatter = function(config, windowHandler) {
      var draw = function(config, windowHandler) {
        var type = 'scatterplot';
        config.size = 'normal';
        config.type = 'scatterplot';
        windowHandler.add(config);
      };


      var plottingDataPromise = DatasetFactory.getVariableData([config.variables.x, config.variables.y], windowHandler);
      plottingDataPromise.then(function successFn(res) {
          // draw the figure
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

      var dim = DimensionService.getPrimary();
      var samp = dim.getSampleDimension();

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
      };

      // NotifyService.addSpinnerModal('Loading...');//, _callback);
      var title = "Loading correlation plot",
      message = 'Please wait',
      level = 'info';
      NotifyService.addTransient(title, message, level);
      // don't allow tab change when fetching
      TabService.lock(true);
      var plottingDataPromise = DatasetFactory.getVariableData(config.variables.x, windowHandler);
      plottingDataPromise.then(function successFn(res) {
          // draw the figure
          // NotifyService.closeModal();
          draw(config, windowHandler);
        },
        function errorFn(variable) {
          // NotifyService.closeModal();

          var title = 'Variable ' + variable + ' could not be loaded\n',
          message = 'Please check the selected combination is valid for the selected datasets.',
          level = 'danger';
          NotifyService.addTransient(title, message, level);
        })
      .finally(function() {
        // release tab change lock
        TabService.lock(false);
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
      };

      NotifyService.addTransient('Starting plane computation', 'The computation may take a while.', 'info');
      SOMService.getPlane(config.variables.x, windowHandler).then(
        function succFn(res) {
          NotifyService.addTransient('Plane computation ready', 'The requested new plane has now been drawn.', 'success');
          config['plane'] = res.plane;
          draw(config, windowHandler);
        },
        function errFn(res) {
          NotifyService.addTransient('Plane computation failed', res, 'error');
        }
      );
    };

    // this should only be called once, otherwise duplicate charts will appear on the handler
    this.drawRegression = function(config, windowHandler) {
      NotifyService.addTransient('Regression analysis started', 'Regression analysis computation started.', 'info');
      RegressionService.compute(config, windowHandler).then( function succFn(result) {
        NotifyService.addTransient('Regression analysis completed', 'Regression computation ready.', 'success');
        var config = {
          computation: result,
          type: 'regression-plot'
        };
        windowHandler.add(config);
        
      }, function errFn(result) {
        var message = result.result[0].result.reason;
        NotifyService.addSticky('Regression analysis failed', message, 'error');
      });
    };

  }
]);