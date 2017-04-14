angular.module('plotter.vis.windowing', ['services.window',
  'services.dataset',
  'mgcrea.ngStrap.dropdown',
  'mgcrea.ngStrap.tooltip',
  'angularSpinner',
  'angular-svg-round-progressbar',
  'ext.lodash'
])

.constant('EXPORT_CONFIG', {
  'svg': '/API/export/svg',
  'png': '/API/export/png',
  'tsv': '/API/export/tsv'
})

.constant('EXPORT_PNG_BACKGROUND_COLOR', '#FFFFFF')
  .constant('EXPORT_FILENAME_MAX_LENGTH', 80)
  .constant('GRID_WINDOW_PADDING', 35)

.directive('plGridWindow', function plGridWindow() {
  return {
    restrict: 'A',
    controller: 'PlGridWindowCtrl',
    scope: {
      'window': '=plWindow'
    },
    templateUrl: 'vis/windowing/grid.window.tpl.html',
    link: function(scope, element, attrs) {
      scope.element = element;
    }
  };
})

.controller('PlGridWindowCtrl', function PlGridWindowCtrl($scope) {

  $scope.close = function() {
    $scope.window.object.remove();
  };

  $scope.resetFilter = function() {
    $scope.window.object.resetFn();
  };

  $scope.getCircleInlineCSS = function(radius) {
    var width = $scope.element[0].offsetWidth,
      height = $scope.element[0].offsetHeight;
    return {
      'top': Math.ceil((height - radius * 2) / 2),
      'left': Math.ceil((width - radius * 2) / 2)
    };
  };

})


.directive('plExport', function plExport() {
  return {
    restrict: 'AE',
    controller: 'PlExportCtrl',
    scope: {
      "source": "=plExportSource",
      "target": "=plExportTarget",
      "window": "=plExportWindow",
      "selector": "=plExportSelector",
      "filename": "=plExportFilename"
    },
    link: function($scope, element, attrs) {
      $scope.element = element;
      $scope.doExport();
    }
  };
})

.controller('PlExportCtrl', function PlExportCtrl($scope, EXPORT_CONFIG, EXPORT_PNG_BACKGROUND_COLOR, $q, _) {

  function removeDirective() {
    console.log("destroying export instance");
    $scope.$destroy();
    $scope.element.removeAttr('pl-export');
    $scope.element.removeAttr('pl-export-source');
    $scope.element.removeAttr('pl-export-target');
    $scope.element.removeAttr('pl-export-window');
    $scope.element.removeAttr('pl-export-selector');
    $scope.element.removeAttr('pl-export-filename');
  }

  function getSelection() {
    return angular.element('body').find($scope.selector + ":not(.round-progress)");
    //return angular.element('body').find($scope.selector); 
  }

  function getWidth(ele) {
    var vb = ele.viewBox.baseVal === null ? 0 : ele.viewBox.baseVal.width;
    var px = ele.width.baseVal.value;
    return (px > vb) ? px : vb;
  }

  function getHeight(ele) {
    var vb = ele.viewBox.baseVal === null ? 0 : ele.viewBox.baseVal.height;
    var px = ele.height.baseVal.value;
    return (px > vb) ? px : vb;
  }

  var sendFile = function(b64, url, filename) {
    //create a hidden form that is submitted to get the file.
    var form = angular.element('<form/>')
      .attr('action', url)
      .attr('method', 'POST');

    var input = angular.element('<input/>')
      .attr('name', 'payload')
      .attr('value', b64)
      .attr('type', 'hidden');
    var input2 = angular.element('<input/>')
      .attr('name', 'filename')
      .attr('type', 'text')
      .attr('value', filename)
      .attr('type', 'hidden');

    form.append(input);
    form.append(input2);
    $scope.element.parent().append(form);
    form.submit();
    form.remove();
  };

  $scope.exportSVG = function() {
    var elements = getSelection(),
      exportStr,
      b64str,
      url = EXPORT_CONFIG.svg;
    _.each(elements, function(ele) {
      exportStr = new SVGExport(ele).get();
      b64str = btoa(unescape(encodeURIComponent(exportStr))); //btoa(exportStr);
      sendFile(b64str, url, $scope.filename);
    });
    removeDirective();
  };

  $scope.exportPNG = function() {
    var svgToCanvas = function(svgElement) {
      var DOMURL = window.URL || window.webkitURL || window;

      var svgXml = new SVGExport(svgElement).get();

      var image = new Image(),
        data = "data:image/svg+xml;utf8," + encodeURIComponent(svgXml);
      // this won't work on Safari
      // var svg = new Blob([svgXml], {
      //   type: 'image/svg+xml;charset=utf-8'
      // });
      // var url = DOMURL.createObjectURL(svg);

      var defer = $q.defer();

      image.onload = function() {
        image.width = getWidth(svgElement);
        image.height = getHeight(svgElement);
        var canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        var context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        // DOMURL.revokeObjectURL(url);
        defer.resolve(canvas);
      };

      // image.src = url;
      image.src = data;
      return defer.promise;
    };

    // sets background color from transparent to white
    // see http://www.mikechambers.com/blog/2011/01/31/setting-the-background-color-when-generating-images-from-canvas-todataurl/
    var canvasToBase64 = function(canvas, backgroundColor, w, h) {
      // var w = canvas.width;
      // var h = canvas.height;

      var context = canvas.getContext('2d');
      //get the current ImageData for the canvas.
      var data = context.getImageData(0, 0, w, h);

      //store the current globalCompositeOperation
      var compositeOperation = context.globalCompositeOperation;

      //set to draw behind current content
      context.globalCompositeOperation = "destination-over";

      //set background color
      context.fillStyle = backgroundColor;

      //draw background / rect on entire canvas
      context.fillRect(0, 0, w, h);

      var regex = new RegExp('data:image\/png;base64,', 'g');
      return canvas.toDataURL("image/png").replace(regex, '');
    };

    function getCombined(element) {
      var combinedEl = document.createElement('canvas'),
        combinedCtx = combinedEl.getContext('2d'),
        canvases = element.getElementsByTagName('canvas'),
        width, height;


      _.each(canvases, function(canvas, ind) {
        if (ind === 0) {
          combinedEl.setAttribute('width', canvas.width);
          combinedEl.setAttribute('height', canvas.height);
          width = canvas.width;
          height = canvas.height;
        }
        if (canvas.style.display !== 'none') {
          // dont draw hidden datasets
          combinedCtx.drawImage(canvas, 0, 0);
        }
      });

      return canvasToBase64(combinedEl, EXPORT_PNG_BACKGROUND_COLOR, width, height);
    }

    function sourceSVG() {
      var elements = getSelection(),
        base64str,
        url = EXPORT_CONFIG.png,
        filename = $scope.filename,
        promises = [],
        width, height;

      _.each(elements, function(ele) {
        width = getWidth(ele);
        height = getHeight(ele);
        var promise = svgToCanvas(ele);
        promise.then(function(canvas) {
          var base64str = canvasToBase64(canvas, EXPORT_PNG_BACKGROUND_COLOR, width, height);
          sendFile(base64str, url, filename);
        });
        promises.push(promise);
      });

      $q.all(promises).then(function() {
        removeDirective();
      });

    }

    function sourceCanvas() {
      // combine the canvas images:
      var selection = getSelection(),
        base64str,
        url = EXPORT_CONFIG.png,
        filename = $scope.filename;

      _.each(selection, function(ele) {
        base64str = getCombined(ele);
        sendFile(base64str, url, filename);
      });
    }

    switch ($scope.source) {
      case 'svg':
        sourceSVG();
        break;

      case 'canvas':
        sourceCanvas();
        break;

      default:
        throw new Error('Unsupported figure type on export.');
    }
  };



  $scope.doExport = function() {
    switch ($scope.target) {
      case 'svg':
        $scope.exportSVG();
        break;

      case 'png':
        $scope.exportPNG();
        break;

      default:
        throw new Error('unsupported type for export.');
    }
  };

});