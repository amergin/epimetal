angular.module('services.notify', [
  'mgcrea.ngStrap.alert',
  'mgcrea.ngStrap.popover',
  'ui.bootstrap', // don't change this to submodule!
  'angular-growl',
  'ext.lodash'
])

.config(['growlProvider', function growlProviderFn(growlProvider) {
  growlProvider.onlyUniqueMessages(false);
  growlProvider.globalTimeToLive(6000);
  growlProvider.globalPosition('bottom-right');
}])

.factory('NotifyService', function NotifyService($injector, growl, _) {

  var _modalInstanceRef = null,
    _disabled = false;

  getAlertFunction = function(msgClass) {
    switch (msgClass) {
      case 'warn':
        return growl.warning;
      case 'info':
        return growl.info;
      case 'success':
        return growl.success;
      case 'error':
        return growl.error;
      default:
        throw 'Unknown alert type';
    }
  };

  return {

    disabled: function(x) {
      if (!arguments.length) {
        return _disabled;
      }
      _disabled = x;
      return this;
    },

    // alerts
    addSticky: function(title, message, level, config) {
      if (_disabled) {
        return;
      }
      var call = getAlertFunction(level);
      var obj = _.extend({
        title: title,
        ttl: -1
      }, config);
      call(message, obj);
    },

    // alerts
    addTransient: function(title, message, level, config) {
      if (_disabled) {
        return;
      }
      var call = getAlertFunction(level);
      var obj = _.extend({
        title: title
      }, config);
      call(message, obj);
    },

    /* THESE ARE FOR MODAL WINDOWS */

    addClosableModal: function(templateUrl, scope, config) {
      var $modal = $injector.get('$uibModal');
      var $q = $injector.get('$q');
      var deferred = $q.defer();

      var applyConfig = {
        scope: scope,
        backdrop: true, //'static',
        keyboard: false,
        templateUrl: templateUrl,
        windowClass: 'modal-wide',
        placement: 'top'
      };
      angular.extend(applyConfig, config);

      _modalInstanceRef = $modal.open(applyConfig);

      _modalInstanceRef.result.then(function(res) {
        deferred.resolve(res);
      }, function(res) {
        deferred.reject(res);
      });

      return deferred.promise;
    },

    closeModal: function() {
      if (_.isNull(_modalInstanceRef)) {
        return;
      }
      // _modalInstanceRef.hide();
      _modalInstanceRef = null;
    }
  };

});