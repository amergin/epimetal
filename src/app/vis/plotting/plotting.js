angular.module('plotter.vis.plotting', 
  [
  'plotter.vis.windowing',
  'plotter.vis.plotting.histogram', 
  'plotter.vis.plotting.scatterplot', 
  'plotter.vis.plotting.heatmap',
  'plotter.vis.plotting.som',
  'plotter.vis.plotting.profile-histogram',
  'plotter.vis.plotting.regression',
  'plotter.vis.plotting.classedbarchart',
  'plotter.vis.plotting.boxplot',
  'services.dimensions', 
  'services.dataset',
  'services.variable',
  'services.window',
  'services.som',
  'services.tab',
  'ext.lodash'
  ])

.service('PlotService', function PlotService($injector, DimensionService, DatasetFactory, VariableService, NotifyService, SOMService, $q, TabService, EXPLORE_DEFAULT_SIZE_X, EXPLORE_DEFAULT_SIZE_Y, REGRESSION_DEFAULT_X, REGRESSION_DEFAULT_Y, _) {

    var that = this;

    // function that determines which drawing function should be called based on the figure type.
    // used by urlhandler
    this.draw = function(type, config, windowHandler) {
      var callFn = null;
      switch(type) {
        case 'scatterplot':
          callFn = that.drawScatter;
          break;

        case 'histogram':
        case 'classed-bar-chart':
          callFn = that.drawHistogram;
          break;

        case 'heatmap':
          callFn = that.drawHeatmap;
          break;

        case 'profile-histogram':
          callFn = that.drawProfileHistogram;
          break;

        case 'somplane':
          callFn = that.drawSOM;
          break;

        case 'regression-plot':
          callFn = that.drawRegression;
          break;

        case 'boxplot':
          callFn = that.drawBoxplot;
          break;

        default:
          throw new Error('Undefined plot type');
      }

      return callFn.apply(this, Array.prototype.slice.call(arguments,1));
    };

    function showAllSameTypeWindows(windowHandler, type) {
      _.each(windowHandler.get(), function(win) {
        if(win.object.figure() == type) {
          win.object.show();
        }
      });
    }

    this.drawScatter = function(config, windowHandler) {
      var draw = function(config, windowHandler) {
        var gridWindow = windowHandler.add(),
        type = 'pl-scatterplot';

        gridWindow
        .figure(type)
        .variables(config.variables)
        .pooled(config.pooled || false);

        showAllSameTypeWindows(windowHandler, type);
      };

      var defer = $q.defer();

      var plottingDataPromise = DatasetFactory.getVariableData(
        [config.variables.x, config.variables.y], windowHandler);
      plottingDataPromise.then(function successFn(res) {
          // draw the figure
          draw(config, windowHandler);
          defer.resolve();
        },
        function errorFn(res) {
          NotifyService.closeModal();

          var title = 'Could not load variables\n',
          message = 'Please check the selected combination is valid for the selected datasets.',
          level = 'error';
          NotifyService.addTransient(title, message, level);
          defer.reject();
        });

      return defer.promise;
    };

    this.drawHistogram = function(config, windowHandler) {
      var draw = function(config, windowHandler) {
        var type;

        if( config.variable.classed() ) {
          type = 'classed-bar-chart';
        } else {
          type = 'histogram';
        }

        var gridWindow = windowHandler.add(),
        canFilter = _.isUndefined(config.filterEnabled) ? true : config.filterEnabled;

        gridWindow
        .figure('pl-' + type)
        .variables(config.variable)
        .pooled(config.pooled)
        .extra({ somSpecial: config.somSpecial, filterEnabled: canFilter });

        showAllSameTypeWindows(windowHandler, 'pl-' + type);
      };

      var defer = $q.defer();

      var promises = [];
      var plottingDataPromise = DatasetFactory.getVariableData([config.variable], windowHandler);
      promises.push(plottingDataPromise);

      if( config.somSpecial ) {
        // need from primary as well
        var primaryHandler = windowHandler.getService().getPrimary();
        var primaryPromise = DatasetFactory.getVariableData([config.variable], primaryHandler);
        promises.push(primaryPromise);
      }

      var dim = DimensionService.getPrimary();
      var samp = dim.getSampleDimension();

      $q.all(promises).then(function successFn(res) {
          // draw the figure
          NotifyService.closeModal();
          draw(config, windowHandler);
          defer.resolve();
        },
        function errorFn(res) {
          NotifyService.closeModal();

          var title = 'Variable ' + config.variable.labelName() + ' could not be loaded\n',
          message = 'Please check the selected combination is valid for the selected datasets.',
          level = 'error';
          NotifyService.addTransient(title, message, level);
          defer.reject();
        });
      return defer.promise;
    };

    this.drawHeatmap = function(config, windowHandler) {
      function getScale(size) {
        var scale;
        if( _.inRange(size, 0, 25) ) {
          scale = 1.4;
        } else if( _.inRange(size, 25, 50) ) {
          scale = 2.1;
        } else if( _.inRange(size, 50, 75) ) {
          scale = 2.4;
        } else {
          scale = 3;
        }
        return {
          x: Math.ceil(EXPLORE_DEFAULT_SIZE_X * scale),
          y: Math.ceil(EXPLORE_DEFAULT_SIZE_Y * scale)
        };
      }

      function draw(cfg, windowHandler) {
        var gridWindow = windowHandler.add(),
        type = 'pl-heatmap';

        gridWindow
        .figure(type)
        .variables(cfg.variables)
        .size(getScale(cfg.variables.length))
        .pooled(false)
        .extra({ separate: cfg.separate, dataset: cfg.dataset, correlationType: 'spearman-rank' });

        showAllSameTypeWindows(windowHandler, type);
      }

      function dispError() {
          var title = 'Could not load variables\n',
          message = 'Please check the selected combination is valid for the selected datasets.',
          level = 'error';
          NotifyService.addTransient(title, message, level);
      }

      function separateMaps() {
        // fetch each set separately and draw individual maps
        var promises = [],
        configs = [],
        copyConfig;
        _.each(DatasetFactory.activeSets(), function(set) {
          copyConfig = angular.copy(config);
          copyConfig.dataset = set;
          configs.push(copyConfig);
          var promise = DatasetFactory.getVariableData(config.variables, windowHandler, 
          { getRawData: false, singleDataset: true, dataset: set });
          promises.push(promise);
        });

        $q.all(promises).then(function succFn() {
          // do after looping all
          windowHandler.getDimensionService().rebuildInstance();

          _.each(configs, function(d) {
            draw(d, windowHandler);
          });
          defer.resolve();
        }, function errFn() {
          dispError();
          defer.reject();
        })
        .finally(function() {
          TabService.lock(false);
        });        
      }

      function combinedMap() {
        var plottingDataPromise = DatasetFactory.getVariableData(config.variables, windowHandler,
        { getRawData: false });
        plottingDataPromise.then(function successFn(res) {
            draw(config, windowHandler);
            defer.resolve();
          },
          function errorFn(res) {
            dispError();
            defer.reject();
          })
        .finally(function() {
          // release tab change lock
          TabService.lock(false);
        });        
      }

      var defer = $q.defer();

      var title = "Loading correlation plot",
      message = 'Please wait',
      level = 'info';
      NotifyService.addTransient(title, message, level);
      // don't allow tab change when fetching
      TabService.lock(true);
      if(config.separate === true) {
        separateMaps();
      } else if(config.separate === false) {
        combinedMap();
      }
      return defer.promise;
    };

    this.drawProfileHistogram = function(config, windowHandler) {
      var draw = function() {
        var gridWindow = windowHandler.add(),
        type = 'pl-profile-histogram';

        gridWindow.figure(type)
        .size({ x: 4, y: 6 })
        .variables(config.variables)
        .extra({ name: config.name });

        showAllSameTypeWindows(windowHandler, type);
      };

      var defer = $q.defer();

      // will need the data for the SOM dimensionservice 
      var promiseSOM = DatasetFactory.getVariableData(config.variables, windowHandler);
      // also for primary, for computing std etc. values
      var primaryHandler = windowHandler.getService().getPrimary();
      var promisePrimary = DatasetFactory.getVariableData(config.variables, primaryHandler);

      $q.all([promiseSOM, promisePrimary]).then(function successFn(res) {
          // draw the figure
          NotifyService.closeModal();
          windowHandler.spinAll();
          draw(config, windowHandler);
          defer.resolve();
        },
        function errorFn(res) {
          NotifyService.closeModal();

          var title = 'Variables could not be loaded\n',
          message = 'Please check the selected combination is valid for the selected datasets.',
          level = 'error';
          NotifyService.addTransient(title, message, level);
          defer.reject();
        })
        .finally( function() {
          windowHandler.stopAllSpins();
        });
        return defer.promise;
    };

    this.drawSOM = function(config, windowHandler) {
      var draw = function(config, windowHandler) {
        var gridWindow = windowHandler.add(config),
        type = 'pl-somplane';

        gridWindow
        .figure(type)
        .variables(config.variable);

        showAllSameTypeWindows(windowHandler, type);
      };

      draw(config, windowHandler);
    };

    this.drawRegression = function(config, windowHandler) {
      var gridWindow = windowHandler.add(),
      type = 'pl-regression';

      gridWindow
      .figure(type)
      .variables(config.variables)
      .size({ x: REGRESSION_DEFAULT_X, y: REGRESSION_DEFAULT_Y })
      .extra({ source: config.source });

      showAllSameTypeWindows(windowHandler, type);
    };

    this.drawBoxplot = function(config, windowHandler) {
      var draw = function(config, windowHandler) {
        var gridWindow = windowHandler.add(),
        type = 'pl-boxplot';

        gridWindow
        .figure(type)
        .variables(config.variable)
        .extra({ somSpecial: config.somSpecial });

        showAllSameTypeWindows(windowHandler, type);
      };

      var defer = $q.defer();

      var promises = [];
      var plottingDataPromise = DatasetFactory.getVariableData([config.variable], windowHandler);
      promises.push(plottingDataPromise);

      if( config.somSpecial ) {
        // need from primary as well
        var primaryHandler = windowHandler.getService().getPrimary();
        var primaryPromise = DatasetFactory.getVariableData([config.variable], primaryHandler);
        promises.push(primaryPromise);
      }

      var dim = DimensionService.getPrimary();
      var samp = dim.getSampleDimension();

      $q.all(promises).then(function successFn(res) {
          // draw the figure
          NotifyService.closeModal();
          draw(config, windowHandler);
          defer.resolve();
        },
        function errorFn(res) {
          NotifyService.closeModal();

          var title = 'Variable ' + config.variable.labelName() + ' could not be loaded\n',
          message = 'Please check the selected combination is valid for the selected datasets.',
          level = 'error';
          NotifyService.addTransient(title, message, level);
          defer.reject();
        });
      return defer.promise;
    };

});