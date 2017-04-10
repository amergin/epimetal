angular.module('services.window', [
  'angularSpinner',
  'ui.router.state',
  'ext.lodash'
])

.factory('WindowHandler', function WindowHandlerFn($injector, $log, $rootScope, usSpinnerService, $state, EXPORT_FILENAME_MAX_LENGTH, DatasetFactory, _) {

  function GridWindow() {
      var obj = {},
        priv = {
          reference: null,
          type: null,
          privFn: null,
          hidden: false,
          id: null,
          variables: null,
          pooled: false,
          headerText: [],
          dropdown: [],
          resetButton: false,
          resetFn: null,
          circleSpin: {
            spinning: false,
            maxValue: 100,
            value: 0
          },
          extra: {}
        };

      function initGrid() {
        _.defaults(priv.reference, {
          grid: {
            position: {
              row: null,
              col: null
            },
            size: {
              x: 0,
              y: 0
            }
          }
        });
      }

      obj.injector = function(x) {
        if(!arguments.length) { return priv.injector; }
        priv.injector = x;
        return obj;
      };

      obj.reference = function(x) {
        if (!arguments.length) {
          return priv.reference;
        }
        priv.reference = x;
        initGrid();
        return obj;
      };

      obj.circleSpin = function(x) {
        if (!arguments.length) {
          return priv.circleSpin.spinning;
        }
        priv.circleSpin.spinning = x;
        return obj;
      };

      obj.circleSpinMax = function(x) {
        if (!arguments.length) {
          return priv.circleSpin.maxValue;
        }
        priv.circleSpin.maxValue = x;
        return obj;
      };

      obj.circleSpinValue = function(x) {
        if (!arguments.length) {
          return priv.circleSpin.value;
        }
        if (x > priv.circleSpin.maxValue) {
          x = priv.circleSpin.maxValue;
        }
        priv.circleSpin.value = x;
        return obj;
      };

      function emitShowWindow(obj) {
        var $rootScope = obj.injector().get('$rootScope');
        $rootScope.$emit('grid-window.show', obj);
      }

      function emitHideWindow(obj) {
        var $rootScope = obj.injector().get('$rootScope');
        $rootScope.$emit('grid-window.hide', obj);        
      }

      obj.toggleVisibility = function() {
        priv.hidden = !priv.hidden;
        if(priv.hidden === true) { emitHideWindow(obj); }
        if(priv.hidden === false) { emitShowWindow(obj); }
        return obj;
      };

      obj.hide = function() {
        priv.hidden = true;
        emitHideWindow(obj);
        return obj;
      };

      obj.show = function() {
        priv.hidden = false;
        emitShowWindow(obj);
        return obj;
      };

      obj.hidden = function(x) {
        if(!arguments.length) {
          return priv.hidden;
        }
        priv.hidden = x;
        if(priv.hidden === false) { emitShowWindow(obj); }
        return obj;
      };

      obj.spin = function(x) {
        if (!arguments.length || x === true) {
          obj.injector().get('usSpinnerService').spin(obj.id());
        } else {
          obj.injector().get('usSpinnerService').stop(obj.id());
        }
        return obj;
      };

      obj.handler = function(x) {
        return priv.reference.handler;
      };

      obj.resetButton = function(x) {
        if (!arguments.length) {
          return priv.resetButton;
        }
        priv.resetButton = x;
        return obj;
      };

      obj.resetFn = function(x) {
        if (!arguments.length) {
          priv.resetFn();
          return obj;
        }
        priv.resetFn = x;
        return obj;
      };

      obj.remove = function(x) {
        if (!arguments.length) {
          priv.removeFn(obj);
          return obj;
        }
        priv.removeFn = x;
        return obj;
      };

      obj.size = function(x) {
        if (!arguments.length) {
          return priv.reference.grid.size;
        }
        priv.reference.grid.size = x;
        return obj;
      };

      function getFileName(windowInst) {
        function getVariables(variables) {
          var hasX = !_.isUndefined(variables.x),
            hasY = !_.isUndefined(variables.y),
            hasTarget = !_.isUndefined(variables.target);

          if (hasX && hasY) {
            return _.template('X_<%= x %>_Y_<%= y %>')({
              x: variables.x.labelName(),
              y: variables.y.labelName()
            });
          }
          if (hasTarget) {
            var template = _.template('target_<%= target %>_association_<%= assoc %>_vars_adjusted_<%= adjust %>_vars');
            return template({
              target: _.first(variables.target).name(),
              assoc: variables.association.length,
              adjust: variables.adjust.length
            });
          } else {
            if(_.isArray(variables)) {
              return _.map(variables, function(v) { return v.labelName(); })
              .join("_");
            } else {
              return variables.name();
            }
          }
        }
        var setNames = _.map(DatasetFactory.activeSets(),
            function(set) {
              return set.name();
            }).join("_"),
          template = _.template('<%= type %>_of_<%= variable %>_on_<%= datasets %>'),
          fullLength = template({
            type: windowInst.figure(),
            variable: getVariables(windowInst.variables()),
            datasets: setNames
          });

        return _.trunc(fullLength, {
          'length': EXPORT_FILENAME_MAX_LENGTH,
          'omission': '[...]'
        });
      }

      function exportFn(cfg) {
        var directiveEl = angular.element('<div/>');
        directiveEl.attr('pl-export', '');
        directiveEl.attr('pl-export-source', "'" + cfg.source + "'");
        directiveEl.attr('pl-export-target', "'" + cfg.type + "'");
        directiveEl.attr('pl-export-window', 'window');
        if(cfg.type == 'tsv') {
          directiveEl.attr('pl-export-tsv-payload', 'payload');//cfg.payload);
        }
        directiveEl.attr('pl-export-selector', "'" + cfg.selector + "'");
        directiveEl.attr('pl-export-filename', "'" + getFileName(cfg.window) + "'");
        angular.element('body').append(directiveEl);
        $compile = $injector.get('$compile');
        $compile(directiveEl)(cfg.scope);
      }

      function exportSVG(cfg) {
        cfg.type = 'svg';
        exportFn(cfg);
      }

      function exportPNG(cfg) {
        cfg.type = 'png';
        exportFn(cfg);
      }

      function exportTSV(cfg) {
        cfg.type = 'tsv';
        console.log("export TSV", cfg);
        exportFn(cfg);
      }

      function togglePooling(window) {
        window.pooled(!window.pooled());
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

        function getTSV(cfg) {
          return {
            'text': '<i class="fa fa-download"></i> Download regression data in a ZIP file',
            'click': _.wrap(cfg.callback, doCallback),
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

        function getPlaneHighlight(cfg) {
          return {
            'text': '<i class="fa fa-adjust"></i> Toggle hexagon highlighting',
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
        switch (cfg.type) {
          case 'export:svg':
            return getSVG(cfg);

          case 'export:png':
            return getPNG(cfg);

          case 'export:tsv':
            return getTSV(cfg);

          case 'correlation':
            return getCorrelation(cfg);

          case 'colorscale':
            return getColorScale(cfg);

          case 'pooling':
            return getPooling(cfg);

          case 'plane-highlight':
            return getPlaneHighlight(cfg);

          default:
            throw new Error("Unexpected dropdown type!");
        }
      }

      obj.getDropdown = function(type) {
        if (!arguments.length) {
          throw new Error("no parameter");
        }
        return _.chain(priv.dropdown)
          .filter(function(d) {
            return d['type'] == type;
          })
          .first()
          .value();
      };

      obj.addDropdown = function(x) {
        if (!arguments.length) {
          throw new Error("no parameter");
        }
        priv.dropdown.push(getDropdown(x));
        return obj;
      };

      obj.removeDropdown = function(x) {
        if (!arguments.length) {
          throw new Error("no parameter");
        }
        _.remove(priv.dropdown, function(drop) {
          return drop.type == x;
        });
        return obj;
      };

      obj.modifyDropdown = function(type, key, val, text) {
        if (!arguments.length) {
          throw new Error("no parameter");
        }
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
        if (!arguments.length) {
          return priv.dropdown;
        }
        priv.dropdown = x;
        return obj;
      };

      obj.position = function(x) {
        if (!arguments.length) {
          return priv.reference.grid.position;
        }
        priv.reference.grid.position = x;
        return obj;
      };

      obj.headerText = function(x) {
        if (!arguments.length) {
          return priv.headerText;
        }
        priv.headerText = x;
        return obj;
      };

      obj.id = function(x) {
        if (!arguments.length) {
          return priv.id;
        }
        priv.id = x;
        return obj;
      };

      obj.pooled = function(x) {
        if (!arguments.length) {
          return priv.pooled;
        }
        priv.pooled = x;
        return obj;
      };

      obj.variables = function(x) {
        if (!arguments.length) {
          return priv.variables;
        }
        priv.variables = x;
        return obj;
      };

      obj.extra = function(x) {
        if (!arguments.length) {
          return priv.extra;
        }
        priv.extra = x;
        return obj;
      };

      obj.figure = function(x) {
        if (!arguments.length) {
          return priv.type;
        }
        priv.type = x;
        return obj;
      };

      // get state
      obj.get = function() {
        function getVariables() {
          function mapper(v) { return v.get(); }

          var vars = obj.variables();
          // is variable
          if(vars.type) {
            return mapper(vars);
            // return _.map([].concat(vars), mapper);
          }
          else if(_.isArray(vars)) {
            return _.chain(obj.variables())
            .map(function(vari) {
              return vari.get();
            })
            .value();
          }
          else if(_.has(vars, 'x') && _.has(vars, 'y')) {
            // x & y
            return _.chain(vars)
            .map(function(v, key) {
              return [key, v.get()];
            })
            .object()
            .value();
          }
          else if(_.isObject(vars)) {
            // pick variable state instead of the whole object
            // while preserving the structure
            return _.chain(obj.variables())
            .map(function(arr,key) { 
              var vals = _.map(arr, function(v) { return v.get(); }); 
              return [key, vals];
            })
            .object()
            .value();
          }
        }

        function getExtra() {
          var extra = obj.extra();

          if(extra.dataset) {
            return _.extend(extra, {
              'dataset': extra.dataset.state()
            });
          } 
          else {
            return extra;
          }
        }
        return {
          id: obj.id(),
          figure: obj.figure(),
          extra: getExtra(),
          variables: getVariables(),
          pooled: obj.pooled(),
          position: obj.position(),
          size: obj.size(),
          hidden: obj.hidden()
        };
      };

      return obj;
    } // GridWindow

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
        if (!arguments.length) {
          return _ignoreRedraws;
        }
        _ignoreRedraws = set;
      };

      this.getService = function() {
        return $injector.get('WindowHandler');
      };

      this.getDimensionService = function() {
        return _dimensionService;
      };

      this.rerenderAll = function(config) {
        if (that.ignoreRedraws()) {
          return;
        }
        $rootScope.$emit('window-handler.rerender', that, config || {});
      };

      this.redrawAll = function() {
        if (that.ignoreRedraws()) {
          return;
        }
        $rootScope.$emit('window-handler.redraw', that);
      };

      this.add = function(config) {
        function removeFn(object) {
          _.remove(windows, function(win) {
            return win.object === object;
          });
        }

        // Only a stub: fixed y size: TODO = calculate it.
        // don't try to use outside SOM vertical
        function prependVertical(prependWindow) {
          var ySize = 4,
          minPositionRow = Infinity,
          positionCol,
          positionRow;

          _.each(windows, function(win) {
            positionRow = win.grid.position.row;
            if(positionRow < minPositionRow) {
              minPositionRow = positionRow;
              positionCol = win.grid.position.col;
            }
          });

          _.each(windows, function(win) {
            win.grid.position.row += ySize;
          });

          prependWindow.reference().grid.position.col = positionCol;
          prependWindow.reference().grid.position.row = minPositionRow;

          windows.unshift(prependWindow.reference());
        }

        var gridWindow = new GridWindow()
          .injector($injector)
          .id(_.uniqueId("win_")),
          reference = {
            'handler': that,
            'object': gridWindow
          },
        prepend = arguments.length && config.prepend === true,
        prependMode = prepend ? (config.prependMode || 'vertical') : null;

        gridWindow
        .reference(reference)
        .remove(removeFn);

        if(prepend) {
          if(prependMode == 'vertical') {
            prependVertical(gridWindow);
          }
        }
        else {
          windows.push(reference);
        }

        return gridWindow;
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
        });
        return that;
      };

      this.stopAllSpins = function() {
        _.each(windows, function(win) {
          win.object.spin(false);
        });
        return that;
      };

      this.removeByType = function(type) {
        var ind = Utils.indexOf(windows, function(win) {
          return win.type() == type;
        });

        if (ind == -1) {
          return;
        }

        win.remove();
        return that;
      };

      this.remove = function(id) {
        throw new Error("remove");
      };

      this.getState = function() {
        return {
          name: that.getName(),
          windows: _.map(windows, function(win) {
            return win.object.get();
          })
        };
      };

      this.load = function(state) {
        function getVariables(vars) {
          function mapper(v) {
            return $injector.get('VariableService').getVariable(v.id || v.name);
          }

          // is variable
          if(vars.type) {
            return mapper(vars);
          }
          else if(_.isArray(vars)) {
            return _.chain(vars)
            .map(mapper)
            .value();
          }
          else if(_.has(vars, 'x') && _.has(vars, 'y')) {
            // x & y
            return _.chain(vars)
            .map(function(v, key) {
              return [key, mapper(v)];
            })
            .object()
            .value();
          }
          else if(_.isObject(vars)) {
            // pick variable state instead of the whole object
            // while preserving the structure
            return _.chain(vars)
            .map(function(arr,key) { 
              var vals = _.map(arr, function(v) { return mapper(v); }); 
              return [key, vals];
            })
            .object()
            .value();
          }
        }

        function getExtra(state) {
          var dataset = state.dataset;

          if(dataset) {
            return _.extend(state, {
              'dataset': $injector.get('DatasetFactory').getSet(dataset.name)
            });
          } else {
            return state;
          }
        }

        _.each(state.windows, function(win) {
          var variables = getVariables(win.variables),
          extra = getExtra(win.extra);

          // add new grid win and init it
          var winObj = that.add()
          .figure(win.figure)
          .extra(extra)
          .pooled(win.pooled || false)
          .variables(variables)
          .size(win.size)
          .position(win.position)
          .hidden(win.hidden);

          // overwrite the state id and keep the old one
          win.oldId = win.id;
          win.id = winObj.id();
        });
        return that;
      };

      this.get = function() {
        return windows;
      };

      this.valueOf = function() {
        return this.getName();
      };
    } // function

  return {
    create: function(name) {
      if (_.isUndefined(_handlers[name])) {
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
      return _.chain(_handlers).values().find(function(h) {
        return h.getDimensionService() == DimensionService.getPrimary();
      }).value();
    },
    getSecondary: function() {
      return this.get('vis.som');
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
    }, 300, {
      leading: false,
      trailing: true
    }),

    redrawVisible: _.debounce(function() {
      var visibles = this.getVisible();
      _.each(visibles, function(hand) {
        hand.redrawAll();
      });
    }, 300, {
      leading: false,
      trailing: true
    }),

    getVisible: function() {
      var res = [];
      var re = /((?:\w+).(?:\w+))(?:.\w+)?/i;
      var current = $state.current.name;
      var parent = _.last(re.exec(current));
      _.each(_handlers, function(hand) {
        var name = _.chain(re.exec(hand.getName())).last().value();
        if (name == parent) {
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
    },
    removeWindowsFromHandlers: function(rejectFn) {
      var variables;
      _.each(_handlers, function(handler) {
        _.remove(handler.get(), function(win) {
          return rejectFn(win.object);
        });
      });
    }
  };

});