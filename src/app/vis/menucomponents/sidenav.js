angular.module('plotter.vis.menucomponents.sidenav', 
[])

.service('plSidenav', function($injector) {
    var that = this,
    values = {
        open: true
    };

    that.show = function() {
        values.open = true;
    };

    that.hide = function() {
        values.open = false;
    };

    that.toggle = function() {
        if(that.isOpen()) { that.hide(); }
        else { that.show(); }
    };

    that.isOpen = function() {
        return values.open;
    };

    // returns a serializable object of the current state
    that.get = function() {
        return values;
    };

    that.load = function(x) {
        values = x;
        return that;
    };

});