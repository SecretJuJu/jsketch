/*!
 * Memento plugin for Sketchable | v2.2 | Luis A. Leiva | MIT license
 */

// XXX: Requires `sketchable.utils.js` to be loaded first.

/* eslint-env browser */
/* global Event, dataBind, deepExtend */
;(function(window) {

  // Custom namespace ID, for private data bindind.
  var namespace = 'sketchable';

  /**
   * This class implements the <a href="https://en.wikipedia.org/wiki/Memento_pattern">Memento pattern</a>
   * and is part of the {@link Sketchable.plugins.memento} plugin.
   * @class
   * @version 2.1
   * @param {Sketchable} instance - Sketchable element.
   * @example
   * var sketcher = new Sketchable('canvas');
   * // This is internally done by the plugin, plus some checks:
   * new MementoCanvas(sketcher);
   */
  function MementoCanvas(instance) {
    // Begin private stuff.
    var stack = [];
    var stpos = -1;
    var self  = this;
    /**
     * Update state.
     * @param {image} snapshot - Image object.
     * @param {object} state - State associated with snapshot.
     * @param {object} state.strokes - Strokes data.
     * @param {object} state.callStack - Actions history.
     * @private
     */
    function draw(snapshot, state) {
      // Manipulate canvas via Sketchable API.
      // This way, we don't lose default drawing settings et al.
      instance.handler(function(elem, data) {
        //data.sketch.clear().drawImage(snapshot.src);
        // Note: jSketch.drawImage after clear creates some flickering,
        // so use the native HTMLCanvasElement.drawImage method instead.
        data.sketch.clear();
        data.sketch.context.drawImage(snapshot, 0, 0);
        // Update state data.
        data.strokes = state.strokes.slice();
        data.sketch.callStack = state.callStack.slice();
      });
    }
    /**
     * Key event manager.
     *  - Undo: "Ctrl + Z"
     *  - Redo: "Ctrl + Y" or "Ctrl + Shift + Z"
     * @param {object} ev - DOM event.
     * @private
     * @todo Decouple shortcut definition.
     */
    function keyManager(ev) {
      if (ev.ctrlKey) {
        switch (ev.which) {
        case 26: // Z
          if (ev.shiftKey) self.redo();
          else self.undo();
          break;
        case 25: // Y
          self.redo();
          break;
        default:
          break;
        }
      }
    }
    /**
     * Goes back to the last saved state, if available.
     * @return {MementoCanvas} Class instance.
     */
    this.undo = function() {
      if (stpos > 0) {
        stpos--;
        this.restore();
      }
      return this;
    };
    /**
     * Goes forward to the last saved state, if available.
     * @return {MementoCanvas} Class instance.
     */
    this.redo = function() {
      if (stpos < stack.length - 1) {
        stpos++;
        this.restore();
      }
      return this;
    };
    /**
     * Resets stack.
     * @return {MementoCanvas} Class instance.
     */
    this.reset = function() {
      stack = [];
      stpos = -1;
      // Save blank state afterward.
      return this.save();
    };
    /**
     * Save current state.
     * @param {object} ev - DOM event.
     * @return {MementoCanvas} Class instance.
     */
    this.save = function(ev) {
      instance.handler(function(elem, data) {
        // With multitouch events, only the first event should be used to store a snapshot.
        // Then, the subsequent multitouch events must update current strokes data.
        if (ev && ev.identifier > 0) {
          stack[stpos].strokes = data.strokes.slice();
        } else {
          stack.push({
            image: elem.toDataURL(),
            strokes: data.strokes.slice(),
            callStack: data.sketch.callStack.slice(),
          });
          stpos++;
        }
      });
      return this;
    };
    /**
     * Read current state: `{ image:String, strokes:Array }`.
     * @return {object}
     */
    this.state = function() {
      // Create a fresh copy of the current state.
      return JSON.parse(JSON.stringify(stack[stpos]));
    };
    /**
     * Restore state.
     * @param {object} state - Canvas state: `{ image:String, strokes:Array }`. Default: current state.
     * @return {MementoCanvas} Class instance.
     * @private
     */
    this.restore = function(state) {
      if (!state) state = stack[stpos];

      var snapshot = new Image();
      snapshot.src = state.image;
      snapshot.onload = function() {
        draw(this, state);
      };
      return this;
    };
    /**
     * Init instance. Currently just (re)attach key event listeners.
     * @return {MementoCanvas} Class instance.
     */
    this.init = function() {
      Event.remove(document, 'keypress', keyManager);
      Event.add(document, 'keypress', keyManager);
      // Save blank state to begin with.
      return this.save();
    };
    /**
     * Destroy instance: reset state and remove key event listeners.
     * @return {MementoCanvas} Class instance.
     */
    this.destroy = function() {
      Event.remove(document, 'keypress', keyManager);
      return this.reset();
    };

  }

  /**
   * Memento plugin constructor for Sketchable instances.
   * @param {Sketchable} instance - Sketchable element.
   * @namespace Sketchable.plugins.memento
   */
  Sketchable.prototype.plugins.memento = function(instance) {
    // Access the instance configuration.
    var config = instance.config();

    var callbacks = {
      clear: function(elem, data) {
        data.memento.reset();
      },
      mouseup: function(elem, data, ev) {
        data.memento.save(ev);
      },
      destroy: function(elem, data) {
        data.memento.destroy();
      },
    };

    // Note: the init event is used to create Sketchable instances,
    // therefore it should NOT be overriden.
    var events = 'mouseup clear destroy'.split(' ');
    for (var i = 0; i < events.length; i++) {
      var evName = events[i];
      instance.decorate(evName, callbacks[evName], 'memento');
    }

    // Expose public API: all Sketchable instances will have these methods.
    deepExtend(instance, {
      // Namespace methods to avoid collisions with other plugins.
      memento: {
        /**
         * Goes back to the previous CANVAS state, if available.
         * @return {Sketchable} Sketchable instance.
         * @memberof Sketchable.plugins.memento
         * @example sketchableInstance.memento.undo();
         */
        undo: function() {
          var data = dataBind(instance.elem)[namespace];
          data.memento.undo();
          return instance;
        },
        /**
         * Goes forward to the previous CANVAS state, if available.
         * @return {Sketchable} Sketchable instance.
         * @memberof Sketchable.plugins.memento
         * @example sketchableInstance.memento.redo();
         */
        redo: function() {
          var data = dataBind(instance.elem)[namespace];
          data.memento.redo();
          return instance;
        },
        /**
         * Save a snapshot of the current CANVAS.
         * @return {Sketchable} Sketchable instance.
         * @memberof Sketchable.plugins.memento
         * @example sketchableInstance.memento.save();
         */
        save: function() {
          var data = dataBind(instance.elem)[namespace];
          data.memento.save();
          return instance;
        },
        /**
         * Read current CANVAS state: `{ image:String, strokes:Array }`.
         * @return {object}
         * @memberof Sketchable.plugins.memento
         * @example var state = sketchableInstance.memento.state();
         */
        state: function() {
          var data = dataBind(instance.elem)[namespace];
          return data.memento.state();
        },
        /**
         * Restore a CANVAS state.
         * @param {object} state - State data.
         * @param {string} state.image - Base64 image.
         * @param {array} state.strokes - Associated strokes.
         * @return {Sketchable} Sketchable instance.
         * @memberof Sketchable.plugins.memento
         * @example
         * var someState = sketchableInstance.memento.state();
         * sketchableInstance.memento.restore(someState);
         */
        restore: function(state) {
          var data = dataBind(instance.elem)[namespace];
          data.memento.restore(state);
          return instance;
        },
      },
    });

    // Initialize plugin here.
    config.memento = new MementoCanvas(instance);
    config.memento.init();
  };

})(this);
