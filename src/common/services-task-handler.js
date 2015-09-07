angular.module('services.task-handler', ['services.correlation.ww', 'services.regression.ww', 'services.som', 'services.notify'])

.factory('TaskHandlerService', function TaskHandlerService(RegressionService, NotifyService, CorrelationService, $injector) {

  var service = {},
  _circleSpin = false,
  _circleSpinValue = 0,
  _circleSpinMax = 100;

  service.cancelAll = function() {
    var SOMService = $injector.get('SOMService');
    if (SOMService.inProgress()) {
      service.circleSpin(false);
      service.circleSpinValue(0);
      SOMService.cancel();
    }
    if (RegressionService.inProgress()) {
      RegressionService.cancel();
    }
    if (CorrelationService.inProgress()) {
      CorrelationService.cancel();
    }
    NotifyService.addTransient('Calculation cancelled', 'User cancelled all computations.', 'warn');

    return service;
  };

  service.hasTasks = function() {
    var SOMService = $injector.get('SOMService');
    return SOMService.inProgress() ||
      RegressionService.inProgress() ||
      CorrelationService.inProgress();
  };

  service.circleSpin = function(x) {
    if(!arguments.length) { return _circleSpin; }
    _circleSpin = x;
    return service;
  };

  service.circleSpinMax = function(x) {
    if(!arguments.length) { return _circleSpinMax; }
    _circleSpinMax = x;
    return service;
  };

  service.circleSpinValue = function(x) {
    if(!arguments.length) { return _circleSpinValue; }
    _circleSpinValue = x;
    return service;
  };

  return service;

});