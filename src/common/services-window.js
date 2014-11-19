var mod = angular.module('services.window', []);

mod.factory('WindowHandler', ['$injector', 'constants', '$rootScope', '$timeout',
  function ($injector, constants, $rootScope, $timeout, name) {

    function WindowHandler(name) {
      var windows = [];
      var _name = name;
      var that = this;
      var _filtersEnabled = true;

      this.add = function(config) {
        var id = _.uniqueId('win_');
        windows.push( angular.extend(
          config, 
          { '_winid': id, 
          handler: that,
          position: { row: 0, col: 2 * windows.length },
          size: { x: 4, y: 4 },
          filterEnabled: _filtersEnabled
        }) );

        $rootScope.$emit('variable:add', config.type, config.variables);
        return id;
      };

      this.getName = function() {
        return _name;
      };

      this.filtersEnabled = function(val) {
        if(!arguments.length) { return _filtersEnabled; }
        _filtersEnabled = val;
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

      this.get = function() {
        return windows;
      };
    } // function

    return  {
      create: function(name) {
        return new WindowHandler(name);
      }
    };






  }
]);