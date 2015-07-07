var win = angular.module('plotter.vis.windowing', ['services.window', 'services.dataset', 'mgcrea.ngStrap.dropdown', 'mgcrea.ngStrap.tooltip', 'angularSpinner']);

win.directive('plGridWindow', function() {
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
});

win.controller('PlGridWindowCtrl', ['$scope',
  function($scope) {

    $scope.close = function() {
      $scope.window.object.remove();
    };

    $scope.resetFilter = function() {
      $scope.window.object.resetFn();
    };

}]);



// win.directive('windowHeader', function() {
//   return {
//     restrict: 'A',
//     controller: 'WinController',
//     scope: false,
//     templateUrl: 'vis/windowing/window.common.tpl.html',
//     // Linker function
//     link: function(scope, element, attrs) {
//     }
//   };
// });

// win.controller('WinController', ['$scope', 'constants', 'DatasetFactory', '$q', 'usSpinnerService',
//   function($scope, constants, DatasetFactory, $q, usSpinnerService) {

//     $scope.close = function(windowHandler, id) {
//       windowHandler.remove(id);
//     };

//     $scope.startSpin = function() {
//       var windowHandler = $scope.window.handler;
//       windowHandler.startSpin($scope.window['_winid']);
//     };

//     $scope.stopSpin = function() {
//       var windowHandler = $scope.window.handler;
//       windowHandler.stopSpin($scope.window['_winid']);
//     };

//     $scope.filter = function() {
//       console.log("filter");
//     };

//     $scope.rendered = false;

//     $scope.exportSVG = function(win) {
//       var svgElement = $scope.element.find('svg')[0];
//       var exportStr = svgExport(svgElement).get();
//       var b64str = btoa(exportStr);

//       var filename = win.type + "_of_" + (win.variable || win.variables.x) + "_on_" +
//         _.map(DatasetFactory.activeSets(), function(set) {
//           return set.name();
//         }).join("_");

//       var url = constants.export.svg;
//       sendFile(b64str, url, filename);
//     };


//     var setNameSpaceOnEl = function(element) {
//       element.setAttribute("version", "1.1");
//       element.setAttribute("xmlns", "http://www.w3.org/2000/svg");
//       // element.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
//     };

//     var sendFile = function(b64, url, filename) {
//       //create a hidden form that is submitted to get the file.
//       var form = angular.element('<form/>')
//         .attr('action', url)
//         .attr('method', 'POST');
//       //.attr('enctype', 'application/x-www-form-urlencoded');//'multipart/form-data'); 
//       // action="' + constants.export.svg + '" method="POST"/>');
//       var input = angular.element('<input/>')
//         .attr('name', 'payload')
//         .attr('value', b64)
//         .attr('type', 'hidden');
//       var input2 = angular.element('<input/>')
//         .attr('name', 'filename')
//         .attr('type', 'text')
//         .attr('value', filename)
//         .attr('type', 'hidden');

//       form.append(input);
//       form.append(input2);
//       $scope.element.append(form);
//       form.submit();
//       form.remove();
//     };

//     $scope.settingsDropdown = [];

//     switch ($scope.window.type) {
//       case 'scatterplot':
//         $scope.settingsDropdown.push({
//           'text': '<i class="fa fa-download"></i> Export as PNG',
//           'click': "exportPNG(window)"
//         });
//         break;

//       case 'histogram':
//       case 'somplane':
//       case 'heatmap':
//         $scope.settingsDropdown.push({
//           'text': '<i class="fa fa-download"></i> Export as PNG',
//           'click': "exportPNG(window)"
//         });
//         $scope.settingsDropdown.push({
//           'text': '<i class="fa fa-download"></i> Export as SVG',
//           'click': "exportSVG(window)"
//         });
//         break;
//     }

//     $scope.exportPNG = function(win) {

//       var svgToCanvas = function(svgElement) {
//         var DOMURL = window.URL || window.webkitURL || window;

//         // get the dimensions from viewbox
//         // var dimRegex = /^(?:\d\s\d\s)(\d+)\s(\d+)$/m;
//         // var dimensions = dimRegex.exec(

//         var svgXml = svgExport(svgElement).get();

//         var image = new Image();
//         var svg = new Blob([svgXml], {
//           type: 'image/svg+xml;charset=utf-8'
//         });
//         var url = DOMURL.createObjectURL(svg);

//         var defer = $q.defer();

//         image.onload = function() {
//           image.width = svgElement.width.baseVal.value; //width;
//           image.height = svgElement.height.baseVal.value; //height;
//           var canvas = document.createElement('canvas');
//           canvas.width = image.width;
//           canvas.height = image.height;
//           var context = canvas.getContext('2d');
//           context.drawImage(image, 0, 0);
//           defer.resolve(canvas);
//         };
//         image.src = url;
//         return defer.promise;
//       };

//       // sets background color from transparent to white
//       // see http://www.mikechambers.com/blog/2011/01/31/setting-the-background-color-when-generating-images-from-canvas-todataurl/
//       var canvasToBase64 = function(canvas, backgroundColor) {
//         var w = canvas.width;
//         var h = canvas.height;

//         var context = canvas.getContext('2d');
//         //get the current ImageData for the canvas.
//         var data = context.getImageData(0, 0, w, h);

//         //store the current globalCompositeOperation
//         var compositeOperation = context.globalCompositeOperation;

//         //set to draw behind current content
//         context.globalCompositeOperation = "destination-over";

//         //set background color
//         context.fillStyle = backgroundColor;

//         //draw background / rect on entire canvas
//         context.fillRect(0, 0, w, h);

//         var regex = new RegExp('data:image\/png;base64,', 'g');
//         return canvas.toDataURL("image/png").replace(regex, '');
//       };

//       var base64str,
//         filename = win.type + "_of_",
//         url = constants.export.png,
//         svgElement;

//       var getCombined = function(element) {
//         combinedEl = document.createElement('canvas');

//         var combinedCtx = combinedEl.getContext('2d');
//         _.each(element.find('canvas'), function(canvas, ind) {
//           if (ind === 0) {
//             combinedEl.setAttribute('width', canvas.width);
//             combinedEl.setAttribute('height', canvas.height);
//           }
//           if (canvas.style.display !== 'none') {
//             // dont draw hidden datasets
//             combinedCtx.drawImage(canvas, 0, 0);
//           }
//         });

//         return canvasToBase64(combinedEl, '#FFFFFF');
//       };

//       if (win.type == 'histogram' || win.type == 'somplane') {
//         svgElement = $scope.element.find('svg')[0];

//         filename += (win.variable || win.variables.x) + "_on_" + _.map(DatasetFactory.activeSets(), function(set) {
//           return set.name();
//         }).join("_");

//         svgToCanvas(svgElement).then(function(canvas) {
//           base64str = canvasToBase64(canvas, '#FFFFFF');
//           sendFile(base64str, url, filename);
//         });
//       } else if (win.type == 'scatterplot') {
//         // combine the canvas images:
//         base64str = getCombined($scope.element);

//         filename += win.variables.x + "_and_" + win.variables.y +
//           "_on_" + _.map(DatasetFactory.activeSets(), function(set) {
//             return set.name();
//           }).join("_");

//         sendFile(base64str, url, filename);
//       } else if(win.type == 'heatmap') {
//         filename += win.variables.x.length + "_variables_" + "_on_" + _.map(DatasetFactory.activeSets(), function(set) {
//           return set.name();
//         }).join("_");

//         svgElement = $scope.element.find('svg')[0];

//         svgToCanvas(svgElement).then(function(canvas) {
//           base64str = canvasToBase64(canvas, '#FFFFFF');
//           sendFile(base64str, url, filename);
//         });

//       }
//     };



//   }
// ]);