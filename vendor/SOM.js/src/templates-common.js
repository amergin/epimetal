angular.module('templates-common', [ 'web-worker.tpl.html']);

angular.module("web-worker.tpl.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("web-worker.tpl.html",
    "<script id=\"ww-template\" type=\"JavaScript/worker\">\n" +
    "	self.output = {\n" +
    "		notify: function(message) {\n" +
    "			self.postMessage({ event: 'update', data: message });\n" +
    "		},\n" +
    "		success: function(data) {\n" +
    "			self.postMessage({ event: 'success', data: data });\n" +
    "		},\n" +
    "		failure: function(reason) {\n" +
    "			self.postMessage({ event: 'failure', data: reason });\n" +
    "		},\n" +
    "		terminate: function(reason) {\n" +
    "			self.close();\n" +
    "		}\n" +
    "	};\n" +
    "   self.bodyFn = <%= bodyFn %>;\n" +
    "	self.onmessage = function(e) {\n" +
    "		bodyFn(e.data, self.output);\n" +
    "	};\n" +
    "</script>");
}]);