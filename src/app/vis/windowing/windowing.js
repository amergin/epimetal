var win = angular.module('plotter.vis.windowing', 
  ['services.window', 'services.dataset', 'mgcrea.ngStrap.dropdown', 'mgcrea.ngStrap.tooltip']);

win.controller('WinController', ['$scope', 'WindowService', 'constants', 'DatasetFactory', '$q',
  function($scope, WindowService, constants, DatasetFactory, $q) {

  $scope.close = function(id) {
    WindowService.remove(id);
  };

$scope.exportSVG = function(win) {
  var svg = $scope.element.find('svg')[0].cloneNode(true);
  setNameSpaceOnEl(svg);
  appendCSSRules(svg, getCssRules(svg));
  // var b64str = btoa( svg.outerHTML );
  // var serializer = new XMLSerializer();

  // this is ugly but will do:
  var b64str = btoa($('<div>').append($(svg).clone()).html());

  var filename = win.type + "_of_" + (win.variable || win.variables.x) + "_on_" +
    _.map(DatasetFactory.activeSets(), function(set) {
      return set.getName();
    }).join("_");

  var url = constants.export.svg;
  sendFile(b64str, url, filename);

  svg.remove();
};


var setNameSpaceOnEl = function(element) {
  element.setAttribute("version", "1.1");
  element.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  // element.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
};

var sendFile = function(b64, url, filename) {
  //create a hidden form that is submitted to get the file.
  var form = angular.element('<form/>')
    .attr('action', url)
    .attr('method', 'POST');
  //.attr('enctype', 'application/x-www-form-urlencoded');//'multipart/form-data'); 
  // action="' + constants.export.svg + '" method="POST"/>');
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
  $scope.element.append(form);
  form.submit();
  form.remove();
};


var getCssRules = function(dom) {
  var used = "";
  var sheets = document.styleSheets;
  for (var i = 0; i < sheets.length; i++) {
    var rules = sheets[i].cssRules;

    // don't loop angular rules!
    if (sheets[i].href == null) {
      continue;
    }

    for (var j = 0; j < rules.length; j++) {
      var rule = rules[j];
      if (typeof(rule.style) != "undefined") {
        var elems = dom.querySelectorAll(rule.selectorText);
        if (elems.length > 0) {
          used += rule.selectorText + " { " + rule.style.cssText + " }\n";
        }
      }
    }
  }
  return used;
};


var appendCSSRules = function(dom, rules) {
  var style = document.createElement('style');
  style.setAttribute('type', 'text/css');
  style.innerHTML = "<![CDATA[\n" + rules + "\n]]>";

  var defs = document.createElement('defs');
  defs.appendChild(style);
  dom.insertBefore(defs, dom.firstChild);
};


$scope.settingsDropdown = [];

switch ($scope.window.type) {
  case 'heatmap':
  case 'scatterplot':
    $scope.settingsDropdown.push({
      'text': '<i class="fa fa-download"></i> Export as PNG',
      'click': "exportPNG(window)"
    });
    break;

  case 'histogram':
  case 'somplane':
    $scope.settingsDropdown.push({
      'text': '<i class="fa fa-download"></i> Export as PNG',
      'click': "exportPNG(window)"
    });
    $scope.settingsDropdown.push({
      'text': '<i class="fa fa-download"></i> Export as SVG',
      'click': "exportSVG(window)"
    });
    break;
}

$scope.exportPNG = function(win) {

  var svgToCanvas = function(svgElement) {
    var DOMURL = window.URL || window.webkitURL || window;

    setNameSpaceOnEl(svgElement);
    appendCSSRules(svgElement, getCssRules(svgElement));

    // this is ugly but will do:
    var svgXml = $('<div>').append($(svgElement).clone()).html();
    var b64str = btoa(unescape(encodeURIComponent(svgXml)));

    var image = new Image();
    var svg = new Blob([svgXml], {
      type: 'image/svg+xml;charset=utf-8'
    });
    var url = DOMURL.createObjectURL(svg);

    var defer = $q.defer();

    image.onload = function() {
      var canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      var context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      defer.resolve(canvas);
    };
    image.src = url;
    return defer.promise;
  };

  // var svgToCanvas = function(svgElement) {
  //   setNameSpaceOnEl(svgElement);
  //   appendCSSRules(svgElement, getCssRules(svgElement));

  //   var image = new Image();

  //   // this is ugly but will do:
  //   var svgXml = $('<div>').append($(svgElement).clone()).html();
  //   var b64str = btoa(unescape(encodeURIComponent(svgXml)));
  //   // var svgXml = new XMLSerializer().serializeToString(svgElement);

  //   var defer = $q.defer();

  //   image.onload = function() {
  //     var canvas = document.createElement('canvas');
  //     canvas.width = image.width;
  //     canvas.height = image.height;
  //     var context = canvas.getContext('2d');
  //     context.drawImage(image, 0, 0);
  //     defer.resolve(canvas);
  //   };
  //   image.src = 'data:image/svg+xml;base64,' + b64str;
  //   return defer.promise;
  // };

  // sets background color from transparent to white
  // see http://www.mikechambers.com/blog/2011/01/31/setting-the-background-color-when-generating-images-from-canvas-todataurl/
  var canvasToBase64 = function(canvas, backgroundColor) {
    var w = canvas.width;
    var h = canvas.height;

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

  var base64str,
    filename = win.type + "_of_",
    url = constants.export.png;

  var getCombined = function(element) {
    combinedEl = document.createElement('canvas');

    var combinedCtx = combinedEl.getContext('2d');
    _.each(element.find('canvas'), function(canvas, ind) {
      if (ind === 0) {
        combinedEl.setAttribute('width', canvas.width);
        combinedEl.setAttribute('height', canvas.height);
      }
      if (canvas.style.display !== 'none') {
        // dont draw hidden datasets
        combinedCtx.drawImage(canvas, 0, 0);
      }
    });

    return canvasToBase64(combinedEl, '#FFFFFF');
  };

  if (win.type == 'histogram' || win.type == 'somplane') {
    var svgElement = $scope.element.find('svg')[0].cloneNode(true);

    filename += (win.variable || win.variables.x) + "_on_" + _.map(DatasetFactory.activeSets(), function(set) {
      return set.getName();
    }).join("_");

    svgToCanvas(svgElement).then(function(canvas) {
      base64str = canvasToBase64(canvas, '#FFFFFF');
      sendFile(base64str, url, filename);
      svgElement.remove();
    });
  } else if (win.type == 'scatterplot') {
    // combine the canvas images:
    base64str = getCombined($scope.element);

    filename += win.variables.x + "_and_" + win.variables.y +
      "_on_" + _.map(DatasetFactory.activeSets(), function(set) {
        return set.getName();
      }).join("_");

    sendFile(base64str, url, filename);
  }

};



}]);