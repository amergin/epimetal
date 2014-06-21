var dimMod = angular.module('services.urlhandler', ['services.dataset', 'ui.router']);

// handles crossfilter.js dimensions/groupings and keeps them up-to-date
dimMod.service('UrlHandler', ['$injector', 'constants', '$location', 'DatasetFactory', '$state',
  function($injector, constants, $location, DatasetFactory, $state) {

    // regular expressions for url routing:
    var regexpStrings = {
      dataset: "(ds)(?:;set=((?:[A-Za-z0-9_-]+,)+[A-Za-z0-9_-]+|[A-Za-z0-9_-]+))?\/",
      scatterplot: "(?:(sca);var=([A-Za-z0-9_-]+),([A-Za-z0-9_-]+)(?:;p=(t|f))?)\/",
      heatmap: "(?:(hea);var=((?:[A-Za-z0-9_-]+,)+[A-Za-z0-9_-]+|[A-Za-z0-9_-]+)(?:;f=((?:[A-Za-z0-9_-]+,)+[A-Za-z0-9_-]+|[A-Za-z0-9_-]+))?)\/",
      histogram: "(his);var=([A-Za-z0-9_-]+)(?:;f=(\\d+\\.?\\d*)-(\\d+\\.?\\d*))?(?:;p=(t|f))?\/"
    };

    var regexps = {
      dataset: new RegExp(regexpStrings['dataset']),
      scatterplot: new RegExp(regexpStrings['scatterplot'], 'g'),
      heatmap: new RegExp(regexpStrings['heatmap'], 'g'),
      histogram: new RegExp(regexpStrings['histogram'], 'g')
    };

    var consts = {
      varDelim: ',',
      separator: ';',
      error: {
        title: 'Invalid URL',
        message: 'The URL you followed is invalid. Please re-check the URL.'
      }
    };

    var _loadingNewState = false;

    var that = this;

    this._createError = function() {
      var NotifyService = $injector.get('NotifyService');
      NotifyService.addTransient(consts.error.title, consts.error.message, 'danger');      
    };

    this._activeDsetNames = function() {
      return _.map(DatasetFactory.activeSets(), function(set) {
        return set.getName();
      }).join() || null;
    };

    this.loadNewPageState = function(path, PlotService) {

      if(path === "" || _.isNull(path)) {
        return;
      }

      that._loadingNewState = true;

      var activeVariables = [];
      var windowsToCreate = [];
      var illegalVars = false;

      // 1. check/update the dataset info
      var res = regexps['dataset'].exec(path);
      if (_.isNull(res)) {
        this._createError();
        that.clear();
        return;
      }

      // clear previous url
      //that.clear();

      var datasets = res[2].split(consts.varDelim);
      if( _.first( datasets ) == 'null' ) { 
        that.clear();
        return;
      }

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
                windowsToCreate.push({
                  type: 'histogram',
                  variables: { x: result[2] },
                  filter: !_.isUndefined(result[3]) ? [+result[3], +result[4]] : null,
                  pooled: !_.isUndefined(result[5]) && ( result[5] == 't' ) ? true : false
                });
                activeVariables.push(result[2]);
              }
              break;

            case 'sca':
              if (!DatasetFactory.legalVariables([result[2], result[3]])) {
                illegalVars = true;
              } else {
                windowsToCreate.push({
                  type: 'scatterplot',
                  variables: { x: result[2], y: result[3] },
                  pooled: !_.isUndefined(result[4]) && ( result[4] == 't' ) ? true : false
                });
                activeVariables.push(result[2], result[3]);
              }
              break;

            case 'hea':
              var vars = result[2].split(consts.varDelim);
              if (!DatasetFactory.legalVariables(vars)) {
                illegalVars = true;
              } else {
                windowsToCreate.push({
                  type: 'heatmap',
                  variables: {x: vars},
                  filter: !_.isUndefined(result[3]) ? result[3].split(consts.varDelim) : null
                });
                activeVariables.push(vars);
              }
              break;
          }
        });
      });

      if (illegalVars) {
        this._createError();
        return;
      }

      activeVariables = _.unique(_.flatten(activeVariables));

      // load active variables:
      var NotifyService = $injector.get('NotifyService');
      NotifyService.addSpinnerModal('Loading samples and drawing figures...');
      DatasetFactory.getVariableData(activeVariables).then(function success(res) {

        _.each(windowsToCreate, function(win) {
          switch (win.type) {
            case 'scatterplot':
              PlotService.drawScatter(win);
              break;

            case 'heatmap':
              PlotService.drawHeatmap(win);
              break;

            case 'histogram':
              PlotService.drawHistogram(win);
              break;
          }
        });
        NotifyService.closeModal();

      }, function err(res) {
        NotifyService.closeModal();
        this._createError();
        that.clear();
      })
      .finally( function() {
        that._loadingNewState = false;
      });

    }; // function

    this.clear = function() {
      that._loadingNewState = false;
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

    this.createWindow = function(type, config) {

      if( that._loadingNewState ) { return; }

      var str = '';
      switch (type) {
        case 'scatterplot':
          str = $location.url() + 'sca;var=' + config.variables.x + "," + config.variables.y;
          if( config.pooled ) {
            str += ";p=t";
          }
          str += "/";
          $location.url( str );
          // $location.url($location.url() + 'sca;var=' + config.x + "," + config.y + "/");
          break;

        case 'histogram':
          str += $location.url() + 'his;var=' + config.variables.x;
          if( config.pooled ) {
            str += ";p=t";
          }
          str += "/";
          $location.url( str );
          // $location.url($location.url() + 'his;var=' + config.x + "/");
          break;

        case 'heatmap':
          $location.url($location.url() + 'hea;var=' + config.variables.x.join() + "/");
          break;
      }
    };

    this.removeWindow = function(type, selection, filter) {
      var removed = false;
      var newUrl = decodeURIComponent($location.url()).replace(regexps[type], function(a, b, c, d) {
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