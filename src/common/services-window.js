var mod = angular.module('services.window', ['angularSpinner', 'ui.router.state']);

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

      this.rerenderAll = function(config) {
        if( that.ignoreRedraws() ) { return; }
        $rootScope.$emit('window-handler.rerender', that, config || {});
      };

      this.redrawAll = function() {
        if( that.ignoreRedraws() ) { return; }
         $rootScope.$emit('window-handler.redraw', that);
      };

      this.add = function(config) {
        var id = _.uniqueId('win_');
        windows.push( angular.extend(
          config, 
          { '_winid': id, 
          handler: that,
          grid: {
            // will be overwritten by gridster on layout
            position: {
              row: null,
              col: null
            },
            // use 0 so it will be overwritten by default gridster config
            // (which is specific for each handler)
            size: {
              x: 0,
              y: 0,
            }
          },
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

      this.removeByType = function(type) {
        var ind = Utils.indexOf(windows, function(win) {
          return win.type == type;
        });

        if( ind == -1 ) { return; }

        var win = windows.splice(ind,1);
        win = _.first(win);
        // $rootScope.$emit('variable:remove', win.type, win.variables);
        return that;
      };

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

      this.remove = function(id) {
        var fnd = _findWin(id);
        var win  = fnd[0];
        var wind = fnd[1];
        if( _.isUndefined(win) ) { return; }

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

      this.get = function(id) {
        if(!arguments.length) {
          return windows;
        }
        return _findWin(id)[0];
      };

      this.valueOf = function() {
        return this.getName();
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
      getPrimary: function(name) {
        return _.chain(_handlers).values().find( function(h) {
          var DimensionService = $injector.get('DimensionService');
          return h.getDimensionService() == DimensionService.getPrimary();
        }).value();
      },
      getAll: function() {
        return _handlers;
      },
      // redraws all visible handlers
      reRenderVisible: function(config) {
        var visibles = this.getVisible();
        _.each(visibles, function(hand) {
          hand.rerenderAll(config);
        });
      },

      redrawVisible: function() {
        var visibles = this.getVisible();
        _.each( visibles, function(hand) {
          hand.redrawAll();
        });
      },
      
      getVisible: function() {
        var res = [];
        var re = /((?:\w+).(?:\w+))(?:.\w+)?/i;
        var current = $state.current.name;
        var parent = _.last( re.exec(current) );
        _.each( _handlers, function(hand) {
          var name = _.chain( re.exec( hand.getName() ) ).last().value();
          if( name == parent ) {
            res.push(hand);
          }
        });    
        return res;    
      },
      spinAllVisible: function() {
        _.each(this.getVisible(), function(handler) {
          handler.spinAll();
        });
      },
      stopAllSpins: function() {
        _.each(this.getVisible(), function(handler) {
          handler.stopAllSpins();
        });
      },
      removeAllVisible: function() {
        _.each(this.getVisible(), function(handler) {
          // empty the window array, that'll remove all
          handler.get().splice(0);
        });
      }
    };






  }
]);