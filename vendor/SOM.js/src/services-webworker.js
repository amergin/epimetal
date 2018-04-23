angular.module('services.webworker', [
  'ext.lodash'
])

.constant('WORKER_TEMPLATE', 'web-worker.tpl.html')

.factory('WebWorkerService', ["$q", "$templateCache", "WORKER_TEMPLATE", function WebWorkerService($q, _, $templateCache, WORKER_TEMPLATE) {

  var _instances = [];

  var _ = self["_"];

  function WorkerInstance() {
    var priv = {
        id: _.uniqueId('ww'),
        worker: null,
        script: null,
        dependencies: [],
        busy: false,
        onTerminate: null
      },
      _obj = {};

    _obj.id = function() {
      return priv.id;
    };

    _obj.onTerminate = function(fn) {
      if (!arguments.length) {
        return priv.onTerminate;
      }
      priv.onTerminate = fn;
      return _obj;
    };

    _obj.terminate = function() {
      priv.worker.terminate();
      priv.busy = false;
      priv.onTerminate();
      return _obj;
    };

    _obj.isBusy = function() {
      return priv.busy;
    };

    _obj.run = function(input, transferable) {
      init();
      var deferred = $q.defer();
      priv.busy = true;

      priv.worker.addEventListener('message', function(e) {
        var eventId = e.data.event;

        switch (eventId) {
          case 'success':
            priv.busy = false;
            deferred.resolve(e.data.data);
            break;

          case 'failure':
            priv.busy = false;
            deferred.reject(e.data.data);
            break;

          case 'update':
            deferred.notify(e.data.data);
            break;

          default:
            console.log("default");
            priv.busy = false;
            deferred.reject(e.data.data);
            break;
        }
      });

      priv.worker.onerror = function(error) {
        deferred.reject(error.message);
      };

      priv.worker.postMessage(input, transferable);
      return deferred.promise;
    };

    _obj.addDependency = function(dep) {
      priv.dependencies.push(dep);
      return _obj;
    };

    _obj.script = function(x) {
      if (!arguments.length) {
        return priv.script;
      }
      priv.script = x;
      return _obj;
    };

    var init = _.once(function() {
      function getDependencies() {
        var str = 'importScripts(';
        _.each(priv.dependencies, function(dep, ind, arr) {
          str += "'" + dep + "'";
          if (ind !== arr.length - 1) {
            str += ", ";
          }
        });
        return str + ");\n";
      }

      function getScriptBody() {
        var body = $templateCache.get(WORKER_TEMPLATE),
          bodyStr = $(body).html();
        var compiled = _.template(bodyStr);
        return compiled({
          bodyFn: priv.script.toString()
        });
      }
      var blob,
        scriptBody = getScriptBody(),
        deps = getDependencies();
      try {
        blob = new Blob([deps, scriptBody], {
          type: 'application/javascript'
        });
      } catch (e) { // Backwards-compatibility
        window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
        blob = new BlobBuilder();
        blob.append(deps);
        blob.append(scriptBody);
        blob = blob.getBlob();
      }
      priv.worker = new Worker(URL.createObjectURL(blob));
    });

    console.log("Worker no ", _obj.id(), " initialized");

    return _obj;
  }

  var _service = {
    create: function() {
      var inst = new WorkerInstance();
      _instances.push(inst);
      return inst;
    }
  };
  return _service;

}]);