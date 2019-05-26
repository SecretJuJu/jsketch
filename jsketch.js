/*!
 * jSketch 1.0 | Luis A. Leiva | MIT license
 * A simple JavaScript library for drawing facilities on HTML5 canvas.
 */

/**
 * A simple JavaScript library for drawing facilities on HTML5 canvas.
 * This class is mostly a wrapper for the HTML5 canvas API with some syntactic sugar,
 * such as function chainability and old-school AS3-like notation.
 * @name jSketch
 * @class
 * @version 1.0
 * @author Luis A. Leiva
 * @license MIT license
 * @example
 * var canvas1 = document.getElementById('foo');
 * var canvas2 = document.getElementById('bar');
 * // Instantiate once, reuse everywhere.
 * var brush = new jSketch(canvas1).lineStyle('red').moveTo(50,50).lineTo(10,10).stroke();
 * // Actually, `.moveTo(50,50).lineTo(10,10)` can be just `.line(50,50, 10,10)`.
 * // Switching between contexts removes the need of having to reinstantiate the jSketch class.
 * brush.setContext(canvas2).beginFill('#5F7').fillCircle(30,30,8).endFill();
 */
;(function(window) {
  /**
   * @constructor
   * @param {object|strig} elem - DOM element or selector.
   * @param {object} [options] - Configuration (default: {@link Sketchable#defaults}).
   */
  function jSketch(elem, options) {
    if (!elem) throw new Error('Sketchable requires a DOM element.');
    if (typeof elem === 'string') elem = document.querySelector(elem);
    // Set drawing context first.
    this.setContext(elem);
    // Scene defaults.
    this.stageWidth  = elem.width;
    this.stageHeight = elem.height;
    // Make room for storing some data such as line type, colors, etc.
    this.data = options;
    // Save abstract calls to low-level canvas methods,
    // this way we can reproduce the drawing in different renderers.
    this.callStack = [];
    // Set drawing defaults.
    // All methods are chainable.
    return this.setDefaults();
  };
  /**
   * jSketch methods (publicly extensible).
   * @ignore
   */
  jSketch.prototype = {
    /**
     * Allows to change the drawing context at runtime.
     * @param {object} elem - DOM element.
     * @return {object} jSketch
     * @memberof jSketch
     */
    setContext: function(elem) {
      if (!elem) throw new Error('No canvas element specified.');
      // Save shortcuts: canvas (DOM elem) & graphics (2D canvas context).
      this.canvas = elem;
      this.context = elem.getContext('2d');
      // Always allow chainability.
      return this;
    },
    /**
     * Sets drawing defaults:
     * - fillStyle: Fill style color ('#F00').
     * - strokeStyle: Stroke style color ('#F0F').
     * - lineWidth: Line width (2).
     * - lineCap: Line cap ('round').
     * - lineJoin: Line join ('round').
     * - miterLimit: Line miter (10). Works only if the lineJoin attribute is "miter".
     * @return {object} jSketch
     * @memberof jSketch
     */
    setDefaults: function() {
      var options = {
        fillStyle: this.data.fillStyle || '#F00',
        strokeStyle: this.data.strokeStyle || '#F0F',
        lineWidth: this.data.lineWidth || 2,
        lineCap: this.data.lineCap || 'round',
        lineJoin: this.data.lineJoin || 'round',
        miterLimit: this.data.miterLimit || 10,
      };
      // Save options as abstract calls at least once, so that we can recover them.
      for (var opt in options) {
        var val = options[opt];
        this.callStack.push({ property: opt, value: val });
      }
      return this.saveGraphics(options).restoreGraphics();
    },
    /**
     * Sets the dimensions of canvas.
     * @param {number} width - New canvas width.
     * @param {number} height - New canvas width.
     * @return {object} jSketch
     * @memberof jSketch
     */
    size: function(width, height) {
      this.stageWidth  = width;
      this.stageHeight = height;
      this.canvas.width  = width;
      this.canvas.height = height;
      // On resizing we lose drawing options, so restore them.
      this.restoreGraphics();
      return this;
    },
    /**
     * Sets the background color of canvas.
     * @param {string} color - An HTML color.
     * @return {object} jSketch
     * @memberof jSketch
     */
    background: function(color) {
      var args = [0, 0, this.stageWidth, this.stageHeight];
      // Process canvas.
      this.beginFill(color);
      this.context.fillRect.apply(this.context, args);
      this.endFill();
      // Save abstract call.
      this.callStack.push({ property: 'fillStyle', value: color });
      this.callStack.push({ method: 'fillRect', args: args });
      return this;
    },
    /**
     * Shortcut for setting the size + background color.
     * @param {number} width - New canvas width.
     * @param {number} height - New canvas width.
     * @param {string} bgcolor - An HTML color.
     * @return {object} jSketch
     * @memberof jSketch
     */
    stage: function(width, height, bgcolor) {
      this.size(width, height).background(bgcolor);
      return this;
    },
    /**
     * Sets the fill color.
     * @param {string} color - An HTML color.
     * @return {object} jSketch
     * @memberof jSketch
     */
    beginFill: function(color) {
      this.saveGraphics();
      this.context.fillStyle = color;
      this.callStack.push({ property: 'fillStyle', value: color });
      return this;
    },
    /**
     * Recovers the fill color that was set before `beginFill()`.
     * @return {object} jSketch
     * @memberof jSketch
     */
    endFill: function() {
      this.restoreGraphics();
      return this;
    },
    /**
     * Sets the line style.
     * @param {string} color - An HTML color.
     * @param {number} thickness - Line thickness.
     * @param {string} capStyle - Style of line cap.
     * @param {string} joinStyle - Style of line join.
     * @param {string} miter - Style of line miter. Only works if capStyle is "miter".
     * @return {object} jSketch
     * @memberof jSketch
     */
    lineStyle: function(color, thickness, capStyle, joinStyle, miter) {
      var options = {
        strokeStyle: color,
        lineWidth: thickness,
        lineCap: capStyle,
        lineJoin: joinStyle,
        miterLimit: miter,
      };
      return this.saveGraphics(options).restoreGraphics();
    },
    /**
     * Move brush to a coordinate in canvas.
     * @param {number} x - Horizontal coordinate.
     * @param {number} y - Vertical coordinate.
     * @return {object} jSketch
     * @memberof jSketch
     */
    moveTo: function(x, y) {
      var args = [].slice.call(arguments);
      this.context.moveTo.apply(this.context, args);
      this.callStack.push({ method: 'moveTo', args: args });
      return this;
    },
    /**
     * Draws line to given coordinate.
     * @param {number} x - Horizontal coordinate.
     * @param {number} y - Vertical coordinate.
     * @return {object} jSketch
     * @memberof jSketch
     */
    lineTo: function(x, y) {
      var args = [].slice.call(arguments);
      this.context.lineTo.apply(this.context, args);
      this.callStack.push({ method: 'lineTo', args: args });
      return this;
    },
    /**
     * Draws line from point 1 to point 2.
     * @param {number} x1 - Horizontal coordinate of point 1.
     * @param {number} y1 - Vertical coordinate of point 1.
     * @param {number} x2 - Horizontal coordinate of point 2.
     * @param {number} y2 - Vertical coordinate of point 2.
     * @return {object} jSketch
     * @memberof jSketch
     */
    line: function(x1, y1, x2, y2) {
      this.moveTo(x1, y1);
      this.lineTo(x2, y2);
      return this;
    },
    /**
     * Draws curve to given coordinate.
     * @param {number} x - Horizontal coordinate.
     * @param {number} y - Vertical coordinate.
     * @param {number} cpx - Horizontal coordinate of control point.
     * @param {number} cpy - Vertical coordinate of control point.
     * @return {object} jSketch
     * @memberof jSketch
     */
    curveTo: function(x, y, cpx, cpy) {
      // XXX: The native canvas API uses a different arg order.
      var args = [cpx, cpy, x, y];
      this.context.quadraticCurveTo.apply(this.context, args);
      this.callStack.push({ method: 'quadraticCurveTo', args: args });
      return this;
    },
    /**
     * Draws curve from coordinate 1 to coordinate 2.
     * @param {number} x1 - Horizontal coordinate of point 1.
     * @param {number} y1 - Vertical coordinate of point 1.
     * @param {number} x2 - Horizontal coordinate of point 2.
     * @param {number} y2 - Vertical coordinate of point 2.
     * @param {number} cpx - Horizontal coordinate of control point.
     * @param {number} cpy - Vertical coordinate of control point.
     * @return {object} jSketch
     * @memberof jSketch
     */
    curve: function(x1, y1, x2, y2, cpx, cpy) {
      this.moveTo(x1, y1);
      this.curveTo(x2, y2, cpx, cpy);
      return this;
    },
    /**
     * Strokes a given path.
     * @return {object} jSketch
     * @memberof jSketch
     */
    stroke: function() {
      this.context.stroke();
      this.callStack.push({ method: 'stroke' });
      return this;
    },
    /**
     * Draws a stroke-only rectangle.
     * @param {number} x - Horizontal coordinate.
     * @param {number} y - Vertical coordinate.
     * @param {number} width - Rectangle width.
     * @param {number} height - Rectangle height.
     * @return {object} jSketch
     * @memberof jSketch
     */
    strokeRect: function(x, y, width, height) {
      var args = [].slice.call(arguments);

      this.context.beginPath();
      this.context.strokeRect.apply(this.context, args);
      this.context.closePath();

      this.callStack.push({ method: 'strokeRect', args: args });

      return this;
    },
    /**
     * Draws a filled rectangle.
     * @param {number} x - Horizontal coordinate.
     * @param {number} y - Vertical coordinate.
     * @param {number} width - Rectangle width.
     * @param {number} height - Rectangle height.
     * @return {object} jSketch
     * @memberof jSketch
     */
    fillRect: function(x, y, width, height) {
      var args = [].slice.call(arguments);

      this.context.beginPath();
      this.context.fillRect.apply(this.context, args);
      this.context.closePath();

      this.callStack.push({ method: 'fillRect', args: args });

      return this;
    },
    /**
     * Draws a filled+stroked rectangle.
     * @param {number} x - Horizontal coordinate.
     * @param {number} y - Vertical coordinate.
     * @param {number} width - Rectangle width.
     * @param {number} height - Rectangle height.
     * @return {object} jSketch
     * @memberof jSketch
     */
    rect: function(x, y, width, height) {
      var args = [].slice.call(arguments);
      this.fillRect.apply(this, args);
      this.strokeRect.apply(this, args);
      return this;
    },
    /**
     * Draws a stroke-only circle.
     * @param {number} x - Horizontal coordinate.
     * @param {number} y - Vertical coordinate.
     * @param {number} radius - Circle radius.
     * @return {object} jSketch
     * @memberof jSketch
     */
    strokeCircle: function(x, y, radius) {
      var args = [x, y, radius, 0, 2*Math.PI, false];

      this.context.beginPath();
      this.context.arc.apply(this.context, args);
      this.context.stroke();
      this.context.closePath();

      this.callStack.push({ method: 'strokeCircle', args: args });

      return this;
    },
    /**
     * Draws a filled circle.
     * @param {number} x - Horizontal coordinate.
     * @param {number} y - Vertical coordinate.
     * @param {number} radius - Circle radius.
     * @return {object} jSketch
     * @memberof jSketch
     */
    fillCircle: function(x, y, radius) {
      var args = [x, y, radius, 0, 2*Math.PI, false];

      this.context.beginPath();
      this.context.arc.apply(this.context, args);
      this.context.fill();
      this.context.closePath();

      this.callStack.push({ method: 'fillCircle', args: args });

      return this;
    },
    /**
     * Draws a filled+stroked circle.
     * @param {number} x - Horizontal coordinate.
     * @param {number} y - Vertical coordinate.
     * @param {number} radius - Circle radius.
     * @return {object} jSketch
     * @memberof jSketch
     */
    circle: function(x, y, radius) {
      var args = [].slice.call(arguments);
      this.fillCircle.apply(this, args);
      this.strokeCircle.apply(this, args);
      return this;
    },
    /**
     * Experimental.
     * @ignore
     */
    radialCircle: function(x, y, radius, glowSize, colors) {
      if (typeof glowSize === 'undefined' || glowSize < 0) glowSize = 1;
      var g = this.context.createRadialGradient(x, y, radius, x, y, glowSize);
      if (!colors || colors.constructor.name.toLowerCase() !== 'array') {
        colors = [this.context.fillStyle, 'white'];
      }
      for (var s = 0; s < colors.length; s++) {
        var color = colors[s];
        g.addColorStop(s, color);
      }
      this.beginFill(g).fillCircle(x, y, radius).endFill();
      return this;
    },
    /**
     * A path is started.
     * @return {object} jSketch
     * @memberof jSketch
     */
    beginPath: function() {
      this.saveGraphics();
      this.context.beginPath();
      this.callStack.push({ method: 'beginPath' });
      return this;
    },
    /**
     * A path is finished.
     * @return {object} jSketch
     * @memberof jSketch
     */
    closePath: function() {
      this.context.closePath();
      this.callStack.push({ method: 'closePath' });
      this.restoreGraphics();
      return this;
    },
    /**
     * Sets brush to eraser mode.
     * @return {object} jSketch
     * @memberof jSketch
     */
    eraser: function() {
      this.context.globalCompositeOperation = 'destination-out';
      this.callStack.push({ property: 'comp-op', value: 'dst_out' });
      return this;
    },
    /**
     * Sets brush to pencil mode.
     * @return {object} jSketch
     * @memberof jSketch
     */
    pencil: function() {
      this.context.globalCompositeOperation = 'source-over';
      this.callStack.push({ property: 'comp-op', value: 'src_over' });
      return this;
    },
    /**
     * Clears stage.
     * @return {object} jSketch
     * @memberof jSketch
     */
    clear: function() {
      var args = [0, 0, this.stageWidth, this.stageHeight];
      // Note: using 'this.canvas.width = this.canvas.width' resets _all_ styles, so better use clearRect.
      this.context.clearRect.apply(this.context, args);
      this.callStack.push({ method: 'clear' });
      return this;
    },
    /**
     * Saves a snapshot of all styles and transformations.
     * @return {object} jSketch
     * @memberof jSketch
     */
    save: function() {
      this.context.save();
      this.callStack.push({ method: 'save' });
      return this;
    },
    /**
     * Restores previous drawing state.
     * @return {object} jSketch
     * @memberof jSketch
     */
    restore: function() {
      this.context.restore();
      this.callStack.push({ method: 'restore' });
      return this;
    },
    /**
     * Saves given drawing settings.
     * @param {object} [options] - Graphics options.
     * @return {object} jSketch
     * @memberof jSketch
     */
    saveGraphics: function(options) {
      for (var opt in options) {
        var val = options[opt];
        if (val && val !== this.data[opt]) {
          this.data[opt] = val;
          // Save only the options that have changed as abstract calls.
          this.callStack.push({ property: opt, value: val });
        }
      }
      return this;
    },
    /**
     * Restores given drawing settings.
     * @return {object} jSketch
     * @memberof jSketch
     */
    restoreGraphics: function() {
      for (var opt in this.data) {
        this.context[opt] = this.data[opt];
      }
      return this;
    },
    /**
     * Draws an image.
     * @param {string} src - Image source path.
     * @param {number} [x] - Horizontal coordinate.
     * @param {number} [y] - Vertical coordinate.
     * @return {object} jSketch
     * @memberof jSketch
     */
    drawImage: function(src, x, y) {
      if (typeof x === 'undefined') x = 0;
      if (typeof y === 'undefined') y = 0;
      var self = this, img = new Image();
      img.src = src;
      img.onload = function() {
        self.context.drawImage(img, x, y);
        self.callStack.push({ method: 'drawImage', args: [img, x, y] });
        self.callStack.push({ method: 'removeAsync' });
      };
      img.onerror = function() {
        self.callStack.push({ method: 'removeAsync' });
      };
      self.callStack.push({ method: 'addAsync' });
      return this;
    },
  };

  // Expose.
  window.jSketch = jSketch;

})(this);
