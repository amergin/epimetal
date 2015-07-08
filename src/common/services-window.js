var mod = angular.module('services.window', ['angularSpinner', 'ui.router.state']);

mod.factory('WindowHandler', ['$injector', 'constants', '$rootScope', '$timeout', 'usSpinnerService', '$state',
  function ($injector, constants, $rootScope, $timeout, usSpinnerService, $state, name) { // notice 'name'

    function GridWindow(injector) {
      var obj = {},
      $injector = injector,
      priv = {
        reference: null,
        type: null,
        privFn: null,
        id: null,
        variables: null,
        pooled: false,
        headerText: [],
        dropdown: [],
        resetButton: false,
        resetFn: null,
        extra: {}
      };

      function initGrid() {
        _.defaults(priv.reference, {
          grid: {
            position: { row: null, col: null },
            size: { x: 0, y: 0 }
          }
        });
      }

      obj.reference = function(x) {
        if(!arguments.length) { return priv.reference; }
        priv.reference = x;
        initGrid();
        return obj;
      };

      obj.spin = function(x) {
        if(!arguments.length || x === true ) { 
          $injector.get('usSpinnerService').spin(obj.id()); 
        } else {
          $injector.get('usSpinnerService').stop(obj.id());
        }
        return obj;
      };

      obj.handler = function(x) {
        return priv.reference.handler;
      };

      obj.resetButton = function(x) {
        if(!arguments.length) { return priv.resetButton; }
        priv.resetButton = x;
        return obj;
      };

      obj.resetFn = function(x) {
        if(!arguments.length) { priv.resetFn(); return obj; }
        priv.resetFn = x;
        return obj;
      };

      obj.remove = function(x) {
        if(!arguments.length) { priv.removeFn(obj); return obj; }
        priv.removeFn = x;
        return obj;
      };

      obj.size = function(x) {
        if(!arguments.length) { return priv.reference.grid.size; }
        priv.reference.grid.size = x;
        return obj;
      };

      function exportFn(cfg) {
        if(cfg.element.length > 1) {
          cfg.element = _.first(cfg.element);
        }
        cfg.element.attr('pl-export', '');
        cfg.element.attr('pl-export-source', "'" + cfg.source + "'");
        cfg.element.attr('pl-export-target', "'" + cfg.type + "'");
        cfg.element.attr('pl-export-window', 'window');
        $compile = $injector.get('$compile');
        $compile(cfg.element)(cfg.scope);
      }

      function exportSVG(cfg) {
        cfg.type = 'svg';
        exportFn(cfg);
      }

      function exportPNG(cfg) {
        cfg.type = 'png';
        exportFn(cfg);
      }

      function togglePooling(window) {
        window.pooled( !window.pooled() );
      }

      function toggleCorrelation(window) {
        var value = window.extra().filtered;
        window.extra()['filtered'] = _.isUndefined(value) ? true : !value;
      }

      function doCallback(fn) {
        fn();
      }

      function getCorrelationText(limit) {
        return '<i class="fa fa-sliders"></i> Toggle correlation cutoff of p < ' + limit + '</b>';
      }

      function getDropdown(cfg) {
        function getSVG(cfg) {
          return {
            'text': '<i class="fa fa-download"></i> Export as SVG',
            'click': _.wrap(cfg, exportSVG),
            'type': cfg.type
          };
        }

        function getPNG(cfg) {
          return {
            'text': '<i class="fa fa-download"></i> Export as PNG',
            'click': _.wrap(cfg, exportPNG),
            'type': cfg.type
          };
        }

        function getCorrelation(cfg) {
          return {
            'text': getCorrelationText(cfg.limit),
            'click': _.wrap(cfg.window, toggleCorrelation),
            'type': cfg.type
          };
        }

        function getColorScale(cfg) {
          return {
            'text': '<i class="fa fa-adjust"></i> Toggle color scale stretching',
            'click': _.wrap(cfg.callback, doCallback),
            'type': cfg.type
          };
        }

        function getPooling(cfg) {
          return {
            'text': '<i class="fa fa-adjust"></i> Toggle figure pooling',
            'click': _.wrap(cfg.window, togglePooling),
            'type': cfg.type
          };
        }
        switch(cfg.type) {
          case 'export:svg':
          return getSVG(cfg);

          case 'export:png':
          return getPNG(cfg);

          case 'correlation':
          return getCorrelation(cfg);

          case 'colorscale':
          return getColorScale(cfg);

          case 'pooling':
          return getPooling(cfg);
        }
      }

      obj.getDropdown = function(type) {
        if(!arguments.length) { throw new Error("no parameter"); }
        return _.chain(priv.dropdown)
        .filter(function(d) { return d['type'] == type; })
        .first()
        .value();
      };

      obj.addDropdown = function(x) {
        if(!arguments.length) { throw new Error("no parameter"); }
        priv.dropdown.push(getDropdown(x));
        return obj;
      };

      obj.removeDropdown = function(x) {
        if(!arguments.length) { throw new Error("no parameter"); }
        _.remove(priv.dropdown, function(drop) {
          return drop.type == x;
        });
        return obj;
      };

      obj.modifyDropdown = function(type, key, val, text) {
        if(!arguments.length) { throw new Error("no parameter"); }
        var found = _.chain(priv.dropdown)
        .filter(function(drop) {
          return drop['type'] == type;
        })
        .first()
        .value();

        found[key] = val;
        found['text'] = getCorrelationText(text);
        return obj;
      };

      obj.dropdown = function(x) {
        if(!arguments.length) { return priv.dropdown; }
        priv.dropdown = x;
        return obj;
      };

      obj.position = function(x) {
        if(!arguments.length) { return priv.reference.grid.position; }
        priv.reference.grid.position = x;
        return obj;
      };

      obj.headerText = function(x) {
        if(!arguments.length) { return priv.headerText; }
        priv.headerText = x;
        return obj;
      };

      obj.id = function(x) {
        if(!arguments.length) { return priv.id; }
        priv.id = x;
        return obj;
      };

      obj.pooled = function(x) {
        if(!arguments.length) { return priv.pooled; }
        priv.pooled = x;
        return obj;
      };

      obj.variables = function(x) {
        if(!arguments.length) { return priv.variables; }
        priv.variables = x;
        return obj;
      };

      obj.extra = function(x) {
        if(!arguments.length) { return priv.extra; }
        priv.extra = x;
        return obj;
      };      

      obj.figure = function(x) {
        if(!arguments.length) { return priv.type; }
        priv.type = x;
        return obj;
      };

      return obj;
    }

    var _handlers = {};

    function WindowHandler(name) {
      var windows = [];
      var _name = name;
      var that = this;
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
        function removeFn(object) {
          _.remove(windows, function(win) { 
            return win.object === object;
          });
        }

        var gridWindow = new GridWindow($injector)
        .id( _.uniqueId("win_") ),
        reference = { 'handler': that, 'object': gridWindow };
        windows.push(reference);

        gridWindow.reference(reference)
        .remove(removeFn);

        return gridWindow;

        // var id = _.uniqueId('win_');
        // // provide only default values, if url router
        // // has provided some of these, don't override
        // windows.push( _.defaults(config,
        //   { '_winid': id, 
        //   handler: that,
        //   grid: {
        //     // will be overwritten by gridster on layout
        //     position: {
        //       row: null,
        //       col: null
        //     },
        //     // use 0 so it will be overwritten by default gridster config
        //     // (which is specific for each handler)
        //     size: {
        //       x: 0,
        //       y: 0,
        //     }
        //   }
        // }) );

        // $rootScope.$emit('variable:add', config.type, config.variables);
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
          win.object.spin(true);
          // usSpinnerService.spin(win['_winid']);
        });
        return that;
      };

      this.stopAllSpins = function() {
        _.each(windows, function(win) {
          win.object.spin(false);
          // usSpinnerService.stop(win['_winid']);
        });
        return that;
      };

      this.removeByType = function(type) {
        var ind = Utils.indexOf(windows, function(win) {
          return win.type() == type;
        });

        if( ind == -1 ) { return; }

        win.remove();
        return that;
      };

      // var _findWin = function(id) {
      //   var rwin;
      //   var rind;
      //   _.every( windows, function(win,ind) {
      //     if( win['_winid'] === id ) {
      //       rwin = win;
      //       rind = ind;
      //       return false;
      //     }
      //     return true;
      //   });
      //   return [rwin, rind];
      // };

      this.remove = function(id) {
        throw new Error("remove");
        // var fnd = _findWin(id);
        // var win  = fnd[0];
        // var wind = fnd[1];
        // if( _.isUndefined(win) ) { return; }

        // windows.splice(wind,1);
        // return that;
      }; 

      this.getId = function(key,val) {
        // var ret;
        // _.every(windows, function(win) {
        //   if( win[key] === val ) {
        //     ret = win['_winid'];
        //     return false; // stop
        //   }
        //   return true;
        // });
        // return ret;
      };

      this.get = function() {
        return windows;
        // return _findWin(id)[0];
      };

      this.valueOf = function() {
        return this.getName();
      };
    } // function

    return  {
      create: function(name) {
        if(_.isUndefined(_handlers[name])) {
          var handler = new WindowHandler(name);
          _handlers[name] = handler;
        }
        return _handlers[name];
      },
      get: function(name) {
        return _handlers[name];
      },
      getPrimary: function(name) {
        var DimensionService = $injector.get('DimensionService');
        return _.chain(_handlers).values().find( function(h) {
          return h.getDimensionService() == DimensionService.getPrimary();
        }).value();
      },
      getSecondary: function() {
        return this.get('vis.som.plane');
      },
      getAll: function() {
        return _handlers;
      },
      // redraws all visible handlers
      reRenderVisible: _.debounce(function(config) {
        var visibles = this.getVisible();
        _.each(visibles, function(hand) {
          hand.rerenderAll(config);
        });
      }),

      redrawVisible: _.debounce(function() {
        var visibles = this.getVisible();
        _.each( visibles, function(hand) {
          hand.redrawAll();
        });
      }),
      
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