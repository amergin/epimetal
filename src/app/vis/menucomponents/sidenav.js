angular.module('plotter.vis.menucomponents.sidenav', [])

.service('SideNavService', function($injector) {
    var that = this,
    _values = {
        open: true,
        showSOMBtn: false
    };

    that.show = function() {
        _values.open = true;
    };

    that.somRefreshButton = function(x) {
        if(!arguments.length) { return _values.showSOMBtn; }
        _values.showSOMBtn = x;
        return that;
    };

    that.hide = function() {
        _values.open = false;
    };

    that.toggle = function() {
        if(that.isOpen()) { that.hide(); }
        else { that.show(); }
    };

    that.isOpen = function() {
        return _values.open;
    };

    // returns a serializable object of the current state
    that.get = function() {
        return _.pick(_values, 'open');
    };

    that.load = function(x) {
        _values = x;
        return that;
    };

});