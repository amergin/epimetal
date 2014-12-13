var mod = angular.module('services.window', ['angularSpinner']);

mod.factory('WindowHandler', ['$injector', 'constants', '$rootScope', '$timeout', 'usSpinnerService', '$state',
  function ($injector, constants, $rootScope, $timeout, usSpinnerService, $state, name) { // notice 'name'

    var _handlers = {};

    function WindowHandler(name) {
      var windows = [];
      var _name = name;
      var that = this;
      var _filtersEnabled = true;
      var _dimensionService = null;
      var _ignoreRedraws = false;

      this.setDimensionService = function(service) {
        _dimensionService = service;
      };

      this.ignoreRedraws = function(set) {
        if(!arguments.length) { return _ignoreRedraws; }
        _ignoreRedraws = set;
      };

      this.getService = function() {
        return $injector.get('WindowHandler');
      };

      this.getDimensionService = function() {
        return _dimensionService;
      };

      this.redrawAll = function(config) {
        if( that.ignoreRedraws() ) { return; }
        console.log("window handler ", that.getName(), " redrawing all");
        $rootScope.$emit('window-handler.redraw', that, config);
      };

      this.add = function(config) {
        var id = _.uniqueId('win_');
        windows.push( angular.extend(
          config, 
          { '_winid': id, 
          handler: that,
          // position: { row: 0, col: 4 * windows.length },
          // size: { x: 4, y: 4 },
          filterEnabled: _filtersEnabled
        }) );

        $rootScope.$emit('variable:add', config.type, config.variables);
        return id;
      };

      this.getName = function() {
        return _name;
      };

      this.startSpin = function(id) {
        usSpinnerService.spin(id);
        return that;
      };

      this.stopSpin = function(id) {
        usSpinnerService.stop(id);
        return that;
      };

      this.spinAll = function() {
        _.each(windows, function(win) {
          usSpinnerService.spin(win['_winid']);
        });
        return that;
      };

      this.stopAllSpins = function() {
        _.each(windows, function(win) {
          usSpinnerService.stop(win['_winid']);
        });
        return that;
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
        return that;
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
        var handler = new WindowHandler(name);
        _handlers[name] = handler;
        return handler;
      },
      get: function(name) {
        return _handlers[name];
      },
      getAll: function() {
        return _handlers;
      },
      // redraws all visible handlers
      redrawVisible: function(config) {
        var visibles = this.getVisible();
        _.each(visibles, function(hand) {
          hand.redrawAll(config);
        });
      },

      getVisible: function() {
        var res = [];
        var re = /((?:\w+).(?:\w+))(?:.\w+)?/i;
        var current = $state.current.name;
        var parent = _.last( re.exec(current) );
        _.each( _handlers, function(hand) {
          if( hand.getName() == parent ) {
            res.push(hand);
          }
        });    
        return res;    
      }

    };






  }
]);