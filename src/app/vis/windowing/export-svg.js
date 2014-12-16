// Based on https://nytimes.github.io/svg-crowbar/svg-crowbar-2.js
function svgExport(element) {

  var _prefix = {
    xmlns: "http://www.w3.org/2000/xmlns/",
    xlink: "http://www.w3.org/1999/xlink",
    svg: "http://www.w3.org/2000/svg"
  };

  var _export = {},
  _ele,
  _clone,
  _empty,
  _emptyStyle,
  _serializer = (new XMLSerializer());

  function setNS(svg) {
    svg.setAttribute("version", "1.1");

    // These are needed for the svg
    if (!svg.hasAttributeNS(_prefix.xmlns, "xmlns")) {
      svg.setAttributeNS(_prefix.xmlns, "xmlns", _prefix.svg);
    }

    if (!svg.hasAttributeNS(_prefix.xmlns, "xmlns:xlink")) {
      svg.setAttributeNS(_prefix.xmlns, "xmlns:xlink", _prefix.xlink);
    }
  }

  function init(element) {
    if (!arguments.length) {
      throw("No element defined");
    }
    _ele = element;

    _empty = window.document.createElementNS(_prefix.svg, 'svg');
    window.document.body.appendChild(_empty);
    _emptyStyle = getComputedStyle(_empty);
  }


  function setInlineStyles(svg, emptySvgDeclarationComputed) {
    function explicitlySetStyle (element) {
      var cSSStyleDeclarationComputed = getComputedStyle(element);
      var i, len, key, value;
      var computedStyleStr = "";
      for (i=0, len=cSSStyleDeclarationComputed.length; i<len; i++) {
        key=cSSStyleDeclarationComputed[i];
        value=cSSStyleDeclarationComputed.getPropertyValue(key);
        if (value!==emptySvgDeclarationComputed.getPropertyValue(key) && key != 'font-family') {
          computedStyleStr+=key+":"+value+";";
        }
      }
      element.setAttribute('style', computedStyleStr);
    }
    function traverse(obj){
      var tree = [];
      tree.push(obj);
      visit(obj);
      function visit(node) {
        if (node && node.hasChildNodes()) {
          var child = node.firstChild;
          while (child) {
            if (child.nodeType === 1 && child.nodeName != 'SCRIPT'){
              tree.push(child);
              visit(child);
            }
            child = child.nextSibling;
          }
        }
      }
      return tree;
    }
    // hardcode computed css styles inside svg
    var allElements = traverse(svg);
    var i = allElements.length;
    while (i--){
      explicitlySetStyle(allElements[i]);
    }
  }

  _export.get = function() {
    _clone = _ele.cloneNode(true);
    _ele.parentNode.appendChild(_clone);
    setNS(_clone);

    setInlineStyles(_clone, _emptyStyle);
    var svgString = _serializer.serializeToString(_clone);

    _clone.remove();
    // _clone.parentNode.removeChild(_clone);

    return svgString;
  };

  init(element);
  return _export;

}