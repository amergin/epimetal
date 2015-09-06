angular.module('services.progressbar', ['ngProgress'])

.factory('ProgressbarService', function ProgressbarService(ngProgressFactory) {
	var _instance = ngProgressFactory.createInstance();

	_instance.setHeight('3px');

	function get() {
		return _instance;
	}

	return {
		'get': get
	};

});