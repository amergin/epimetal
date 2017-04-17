angular.module('services.compatibility', [
  'ext.lodash',
  'ui.bootstrap' // don't change this to submodule!
])

.constant('COMPATIBILITY_TEMPLATE', 'compatibility-inform.tpl.html')

.service('CompatibilityService', function CompatibilityService($q, $timeout, $uibModal, usSpinnerService, $templateCache, $rootScope, 
  COMPATIBILITY_TEMPLATE, 
  _) {

  var that = this;

  this.features = {
    webworkers: {
      name: 'Web workers, transferable objects, creation from blobs',
      supported: function() {
        return Modernizr.webworkers && Modernizr.transferables && 
        (Modernizr.blobconstructor || Modernizr.bloburls);
     }
    },

    datauris: {
      name: 'Export figures (data URIs, btoa)',
      supported: function() {
        return  Modernizr.datauri.over32kb && Modernizr.atobbtoa;
     }
    },

    svg: {
      name: 'Scalable Vector Graphics (SVG)',
      supported: function() {
        return Modernizr.svg && Modernizr.svgclippaths && 
        Modernizr.inlinesvg && Modernizr.svgfilters;
      }
    },

    canvas: {
      name: 'HTML5 Canvas and Canvas export',
      supported: function() {
        return Modernizr.canvas && Modernizr.canvastext && 
        Modernizr.todataurlpng && Modernizr.todataurljpeg;
      }
    },

    flexbox: {
      name: 'Flexbox (menus)',
      supported: function() {
        return Modernizr.flexbox && Modernizr.flexwrap;
      }
    },

    browser: {
      name: 'Modern Web browser (Detect outdated Internet Explorer versions)',
      supported: function() {
        var modernBrowser;
        // Detecting IE
        var oldIE;
        if ($('html').is('.ie6, .ie7, .ie8, .ie9, .ie10')) {
          modernBrowser = false;
        } else {
          modernBrowser = true;
        }
        return modernBrowser;
      }
    }

  };

  this.getFeatures = function() {
    return that.features;
  };

  // how this function operates:
  // - this is called on 'vis' resolve
  // - if there are browser comp. issues, this function will open up a
  // modal instance. In the mean time, the 'vis' state will not be resolved
  // - after the modal has been closed, this function will resolve its promise
  // and the state loading will continue.
  this.browserCompatibility = function() {
    var defer = $q.defer();

    var createModal = function() {

      // isolated scope
      that.scope = $rootScope.$new(true);
      that.scope.features = that.features;
      that.scope.close = function() {
        that.modal.close();
        usSpinnerService.spin('main');
        defer.resolve();
      };

      that.modal = $uibModal.open({
        scope: that.scope,
        templateUrl: COMPATIBILITY_TEMPLATE,
        show: true,
        backdrop: 'static',
        keyboard: false,
        placement: 'center',
        animation: 'am-fade-and-scale'
      });
    };


    $timeout(function() {
      var _compatible = true;
      _.each(that.features, function(feat) {
        if (!feat.supported()) {
          _compatible = false;
        }
      });

      if (!_compatible) {
        usSpinnerService.stop('main');
        createModal();
      } else {
        defer.resolve('Compatible');
      }

    }, 10);

    return defer.promise;
  };

});