angular.module('services.color-scale', [
  'ext.d3',
  'ext.lodash'
  ])

.factory('ColorScaleFactory', function ColorScaleFactoryFn(_, d3) {

  function BaseColorScale() {
    var priv = this.privates = {},
    obj = this.obj = {};

    obj.scale = function(x) {
      if(!arguments.length) { return priv.colorScale; }
      priv.colorScale = x;
      return obj;
    };

    priv.domain = function(x) {
      if(!arguments.length) { return priv.scaleDomain; }
      priv.scaleDomain = x;
      return obj;
    };

    priv.init = function(scale, domain, call) {
      obj.scale(scale);
      priv.domain(domain);
      if(call === false) {
        obj.scale(scale.domain(priv.domain()));
      } else {
        obj.scale(scale().domain(priv.domain()));
      }

      // init every ind to false
      priv.used = _.chain(domain)
      .map(function(d) {
        return [d, false];
      })
      .object()
      .value();

      priv.accessor = {};
    };

    obj.type = function() {
      throw new Error("not implemented");
    };

    obj.load = function(state) {
      priv.used = state.used;
      priv.accessor = state.accessor;

      return obj;
    };

    priv.get = function() {
      return {
        used: priv.used,
        accessor: priv.accessor
      };
    };

    obj.useColor = function(name) {
      function nextIndex() {
        return _.chain(priv.used)
        .pick(function(val, key) { return !val; })
        .keys()
        .first()
        .value();
      }
      var ind = nextIndex();
      priv.used[ind] = true;
      priv.accessor[name] = ind;

      return obj.scale()(ind);
    };

    obj.freeColor = function(color) {
      var ind = _.indexOf(obj.scale().range(), color);
      if(ind != -1) {
        priv.used[ind] = false;
        var accessorKey = _.invert(priv.accessor)[ind];
        delete priv.accessor[accessorKey];
      }
      return obj;
    };

    obj.getAccessor = function(name) {
      return priv.accessor[name];
    };

    return obj;
  }

  function Cat20cColorScale() {
    BaseColorScale.call(this);
    var obj = this.obj,
    priv = _.extend(this.privates, {

    });

    obj.type = function() {
      return "20c";
    };

    obj.init = function() {
      priv.init(d3.scale.category20c, _.range(0,10), true);
      return obj;
    };

    obj.get = function() {
      return _.extend(priv.get(), {
        type: obj.type()
      });
    };

    return obj;
  }

  function Cat20ColorScale() {
    BaseColorScale.call(this);
    var obj = this.obj,
    priv = _.extend(this.privates, {

    });

    obj.type = function() {
      return "20";
    };

    obj.init = function() {
      priv.init(d3.scale.category20, _.range(0,20), true);
      return obj;
    };

    obj.get = function() {
      return _.extend(priv.get(), {
        type: obj.type()
      });
    };

    return obj;
  }

  function Cat10ColorScale() {
    BaseColorScale.call(this);
    var obj = this.obj,
    priv = _.extend(this.privates, {

    });

    obj.type = function() {
      return "10";
    };

    obj.init = function() {
      priv.init(d3.scale.category10, _.range(0,10), true);
      return obj;
    };

    obj.get = function() {
      return _.extend(priv.get(), {
        type: obj.type()
      });
    };

    return obj;
  }

  function CustomColorScale1() {
    BaseColorScale.call(this);
    var obj = this.obj,
    colors = ["#75D3E6", "#FF7B61", "#FFD633", "#BCF07D", "#F09DB2", "#006D9C", 
    "#FC8A03", "#23A61C", "#821A2E", "#5E8271", "#002642", "#CFB85F", "#C3FFFF", 
    "#FFC8B3", "#FFFF66", "#FDFFCA", "#FFE3F4", "#5EB6DC", "#FFD467", "#7CE676", 
    "#C26E7E", "#A5C2B4", "#4D6B82", "#E1F9B1"],

    priv = _.extend(this.privates, {

    });

    obj.type = function() {
      return "custom1";
    };

    obj.init = function() {
      priv.init(d3.scale.ordinal().range(colors), _.range(0,colors.length), false);
      return obj;
    };

    obj.get = function() {
      return _.extend(priv.get(), {
        type: obj.type()
      });
    };

    return obj;
  }

  function CustomColorScale2() {
    BaseColorScale.call(this);
    var obj = this.obj,
    // override this array to your liking
    colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#D3D3D3'],
    //d3.scale.category10().range(),
    priv = _.extend(this.privates, {

    });

    obj.type = function() {
      return "custom1";
    };

    obj.init = function() {
      priv.init(d3.scale.ordinal().range(colors), _.range(0,colors.length), false);
      return obj;
    };

    obj.get = function() {
      return _.extend(priv.get(), {
        type: obj.type()
      });
    };

    return obj;
  }

  return {
    createCategory20c: function() {
      return new Cat20cColorScale()
      .init();
    },

    createCategory20: function() {
      return new Cat20ColorScale()
      .init();
    },

    createCategory10: function() {
      return new Cat10ColorScale()
      .init();
    },

    createCustom1: function() {
      return new CustomColorScale1()
      .init();
    },

    createCustom2: function() {
      return new CustomColorScale2()
      .init();
    }

  };
});