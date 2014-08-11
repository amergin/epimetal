var dimMod = angular.module('services.window', []);

// handles crossfilter.js dimensions/groupings and keeps them up-to-date
dimMod.service('WindowService', ['$injector', 'constants', '$rootScope', '$timeout',
  function ($injector, constants, $rootScope, $timeout) {

    var windows = [];
    var that = this;

    this.add = function(config) {
      var id = _.uniqueId('win_');
      windows.push( angular.extend(config, { '_winid': id }) );

      $rootScope.$emit('variable:add', config.type, config.variables);
      return id;
    };

    this.remove = function(id) {
      var _findWin = function(id) {
        var rwin;
        var rind;
        _.every( windows, function(win,ind) {
          if( win['_winid'] === id ) {
            rwin = win;
            rind = ind;
            return false;
          }
          return true;
        });
        return [rwin, rind];
      };

      var fnd = _findWin(id);
      var win  = fnd[0];
      var wind = fnd[1];
      if( _.isUndefined(win) ) { return; }

      $rootScope.$emit('window:preDelete', id);
      var UrlHandler = $injector.get('UrlHandler');
      if( _.isUndefined( win.variables ) ) {
        UrlHandler.removeWindow( win.type, win.id );
        $rootScope.$emit('dimension:decreaseCount', "som" + win.som_id);
      }
      else {
        UrlHandler.removeWindow(win.type, win.variables, win.filter);
        $rootScope.$emit('variable:remove', win.type, win.variables);
      }

      windows.splice(wind,1);
    };

    this.getId = function(key,val) {
      var ret;
      _.every(windows, function(win) {
        if( win[key] === val ) {
          ret = win['_winid'];
          return false; // stop
        }
        return true;
      });
      return ret;
    };

    /*this.removeByValue = function(key, val) {
      var rem;
      _.every(windows, function(win,id) {
        if( win[key] === val ) {
          rem = id;
          return false; // stop
        }
        return true;
      });
      if( rem ) { 
        delete win[rem]; 
      }
    };*/

    this.get = function() {
      return windows;
    };


  }
]);