var dimMod = angular.module('services.urlhandler', ['services.dataset', 'ui.router']);

// handles crossfilter.js dimensions/groupings and keeps them up-to-date
dimMod.service('UrlHandler', ['$injector', 'constants', '$location', 'DatasetFactory', '$state', 'NotifyService',
  function($injector, constants, $location, DatasetFactory, $state, NotifyService) {

    // regular expressions for url routing:
    var regexpStrings = {
      dataset: "(ds)(?:;set=((?:[A-Za-z0-9_-]+,)+[A-Za-z0-9_-]+|[A-Za-z0-9_-]+))?\/",
      scatterplot: "(?:(sca);var=([A-Za-z0-9_-]+),([A-Za-z0-9_-]+))\/",
      heatmap: "(?:(hea);var=((?:[A-Za-z0-9_-]+,)+[A-Za-z0-9_-]+|[A-Za-z0-9_-]+)(?:;f=((?:[A-Za-z0-9_-]+,)+[A-Za-z0-9_-]+|[A-Za-z0-9_-]+))?)\/",
      histogram: "(his);var=([A-Za-z0-9_-]+)(?:;f=(\\d+\\.?\\d*)-(\\d+\\.?\\d*))?\/"
    };

    var regexps = {
      dataset: new RegExp(regexpStrings['dataset']),
      scatterplot: new RegExp(regexpStrings['scatterplot'], 'g'),
      heatmap: new RegExp(regexpStrings['heatmap'], 'g'),
      histogram: new RegExp(regexpStrings['histogram'], 'g')
    };

    var consts = {
      varDelim: ',',
      separator: ';'
    };

    var errorMessage = 'The URL you followed is invalid. Please re-check the URL.';
    var that = this;

    this._activeDsetNames = function() {
      return _.map(DatasetFactory.activeSets(), function(set) {
        return set.getName();
      }).join() || null;
    };

    this.loadNewPageState = function(path, PlotService) {

      if (path === "") {
        return;
      }

      var addWindow = function(arr, type, variables, filter) {
        arr.push({
          type: type,
          variables: variables,
          filter: filter
        });
      };


      var activeVariables = [];
      var windowsToCreate = [];
      var illegalVars = false;

      // 1. check/update the dataset info
      var res = regexps['dataset'].exec(path);
      if (_.isNull(res)) {
        NotifyService.addTransient(errorMessage, 'error');
        that.clear();
        return;
      }

      // clear previous url
      that.clear();

      var datasets = res[2].split(consts.varDelim);
      _.each(datasets, function(name) {
        DatasetFactory.getSet(name).toggle();
      });
      this.updateDataset(datasets);

      // 2. gather active variables
      _.each(regexps, function(regex, rname) {
        if (rname == 'dataset') {
          return;
        }
        _.each(regex.execAll(path), function(result) {
          switch (result[1]) {
            case 'his':
              if (!DatasetFactory.legalVariables([result[2]])) {
                illegalVars = true;
              } else {
                addWindow(windowsToCreate, 'histogram', {
                  x: result[2]
                }, !_.isUndefined(result[3]) ? [+result[3], +result[4]] : null);
                activeVariables.push(result[2]);
              }
              break;

            case 'sca':
              if (!DatasetFactory.legalVariables([result[2], result[3]])) {
                illegalVars = true;
              } else {
                addWindow(windowsToCreate, 'scatterplot', {
                  x: result[2],
                  y: result[3]
                });
                activeVariables.push(result[2], result[3]);
              }
              break;

            case 'hea':
              var vars = result[2].split(consts.varDelim);
              if (!DatasetFactory.legalVariables(vars)) {
                illegalVars = true;
              } else {
                addWindow(windowsToCreate, 'heatmap', {
                    x: vars
                  }, !_.isUndefined(result[3]) ? result[3].split(consts.varDelim) : null);
                activeVariables.push(vars);
              }
              break;
          }
        });
      });

      if (illegalVars) {
        NotifyService.addTransient(errorMessage, 'error');
        return;
      }

      activeVariables = _.unique(_.flatten(activeVariables));

      // load active variables:
      DatasetFactory.getVariableData(activeVariables).then(function success(res) {

        _.each(windowsToCreate, function(win) {
          switch (win.type) {
            case 'scatterplot':
              PlotService.drawScatter(win.variables);
              break;

            case 'heatmap':
              PlotService.drawHeatmap(win.variables, win.filter);
              break;

            case 'histogram':
              PlotService.drawHistogram(win.variables, win.filter);
              break;
          }
        });

      }, function err(res) {
        NotifyService.addTransient(errorMessage, 'error');
        that.clear();
      });
    };

    this.clear = function() {
      $location.url( '/vis/' );
    };

    this.updateDataset = function() {

      // switch url component
      // var regexStr = "(ds)(?:;set=((?:[A-Za-z0-9_-]+,)+[A-Za-z0-9_-]+|[A-Za-z0-9_-]+))?\/";
      // var regex = new RegExp( regexStr, 'g' );

      // var activeSetNames = _.map( DatasetFactory.activeSets(), function(set) { return set.getName(); } ).join() || null;
      var newUrl = '';

      // previously untouched
      if (_.isNull(decodeURIComponent($location.url()).match(regexps['dataset']))) {
        newUrl = '/vis/' + 'ds;set=' + this._activeDsetNames() + "/";
      } else {
        // exists already, replace
        newUrl = decodeURIComponent($location.url()).replace(regexps['dataset'], 'ds;set=' + this._activeDsetNames() + "/");
      }
      $location.url(newUrl);
    };

    this.createWindow = function(type, selection) {
      switch (type) {
        case 'scatterplot':
          $location.url($location.url() + 'sca;var=' + selection.x + "," + selection.y + "/");
          break;

        case 'histogram':
          $location.url($location.url() + 'his;var=' + selection.x + "/");
          break;

        case 'heatmap':
          $location.url($location.url() + 'hea;var=' + selection.x.join() + "/");
          break;
      }
    };

    this.removeWindow = function(type, selection, filter) {
      console.log("remove", type, selection);
      var removed = false;
      var newUrl = decodeURIComponent($location.url()).replace(regexps[type], function(a, b, c, d) {
        console.log(a, b, c, d);
        switch (b) {
          case 'his':
            if (c == selection.x && !removed) {
              removed = true;
              return '';
            }
            return a;
          case 'sca':
            if (c == selection.x && d == selection.y && !removed) {
              removed = true;
              return '';
            }
            return a;
          case 'hea':
            var orig = _.sortBy(c.split(","));
            var selec = _.sortBy(selection.x);
            if ((_.difference(orig, selec).length === 0) && !removed) {
              removed = true;
              return "";
            }
            return a;
        }
      });
      $location.url(newUrl);
    };

  }
]);