(function() {
    var __slice = [].slice;

    (function($) {
        var Sketch;
        $.fn.sketch = function() {
            var args, key, sketch;
            key = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
            if (this.length > 1) {
                $.error('Sketch.js can only be called on one element at a time.');
            }
            sketch = this.data('sketch');
            if (typeof key === 'string' && sketch) {
                if (sketch[key]) {
                    if (typeof sketch[key] === 'function') {
                        return sketch[key].apply(sketch, args);
                    } else if (args.length === 0) {
                        return sketch[key];
                    } else if (args.length === 1) {
                        return sketch[key] = args[0];
                    }
                } else {
                    return $.error('Sketch.js did not recognize the given command.');
                }
            } else if (sketch) {
                return sketch;
            } else {
                this.data('sketch', new Sketch(this.get(0), key));
                return this;
            }
        };
        Sketch = (function() {
            function Sketch(el, opts) {
                var _sketch;
                _sketch = this;
                this.el = el;
                this.canvas = $(el);
                this.canvas.attr('tabindex', 100);
                this.ghostInput = $("<input id=\"sketch-ghost-input\" />");
                this.ghostInput.attr("style", "position:absolute; top: " + this.canvas.position().top + "px; left:" + this.canvas.position().left + "px; opacity:0;");
                this.ghostInput.bind("keyup keydown keypress", function(e) {
                    e.currentTarget = $(el).get(0);
                    return $(el).trigger(e);
                });
                this.ghostInput.insertAfter(this.canvas);
                this.context = el.getContext('2d');
                this.options = $.extend({
                    toolLinks: true,
                    defaultTool: 'marker',
                    defaultColor: '#000000',
                    defaultSize: 5
                }, opts);
                this.painting = false;
                this.color = this.options.defaultColor;
                this.size = this.options.defaultSize;
                this.tool = this.options.defaultTool;
                this.textTool = {
                    originalX: 0,
                    positionX: 0,
                    positionY: 0,
                    letterspace: 10,
                    linespace: 15,
                    font: "16px 'Courier New'",
                    addCursor: function() {
                        _sketch.context.fillStyle = "#888";
                        _sketch.context.font = this.font;
                        return _sketch.context.fillText("_", this.positionX, this.positionY);
                    },
                    lineLengths: []
                };
                this.actions = [];
                this.action = [];
                this.canvas.bind('keyup keypress click mousedown mouseup mousemove mouseleave mouseout touchstart touchmove touchend touchcancel', this.onEvent);
                if (this.options.toolLinks) {
                    $('body').delegate("a[href=\"#" + (this.canvas.attr('id')) + "\"]", 'click', function(e) {
                        var $canvas, $this, key, sketch, _i, _len, _ref;
                        $this = $(this);
                        $canvas = $($this.attr('href'));
                        sketch = $canvas.data('sketch');
                        _ref = ['color', 'size', 'tool'];
                        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                            key = _ref[_i];
                            if ($this.attr("data-" + key)) {
                                sketch.set(key, $(this).attr("data-" + key));
                            }
                        }
                        if ($(this).attr('data-download')) {
                            sketch.download($(this).attr('data-download'));
                        }
                        return false;
                    });
                }
                $(document).unbind("keydown").bind("keydown", function(event) {
                    var d, doPrevent;
                    doPrevent = false;
                    if (event.keyCode === 8) {
                        d = event.srcElement || event.target;
                        if (d.tagName.toUpperCase() === "CANVAS") {
                            doPrevent = true;
                        }
                    }
                    if (doPrevent) {
                        return event.preventDefault();
                    }
                });
            }

            Sketch.prototype.download = function(format) {
                var mime;
                format || (format = "png");
                if (format === "jpg") {
                    format = "jpeg";
                }
                mime = "image/" + format;
                return window.open(this.el.toDataURL(mime));
            };

            Sketch.prototype.set = function(key, value) {
                this[key] = value;
                return this.canvas.trigger("sketch.change" + key, value);
            };

            Sketch.prototype.startPainting = function() {
                this.painting = true;
                return this.action = {
                    tool: this.tool,
                    color: this.color,
                    size: parseFloat(this.size),
                    events: []
                };
            };

            Sketch.prototype.stopPainting = function() {
                if (this.action) {
                    this.actions.push(this.action);
                }
                this.painting = false;
                this.action = null;
                return this.redraw();
            };

            Sketch.prototype.dropCursor = function(e) {
                var canvasOffset;
                this.ghostInput.focus();
                canvasOffset = this.canvas.offset();
                this.textTool.positionX = e.pageX - canvasOffset.left;
                this.textTool.originalX = this.textTool.positionX;
                this.textTool.positionY = e.pageY - canvasOffset.top;
                this.redraw();
                return this.textTool.addCursor();
            };

            Sketch.prototype.addText = function(e) {
                var action;
                if (e.keyCode !== 8) {
                    action = {
                        tool: 'text',
                        positionX: this.textTool.positionX,
                        positionY: this.textTool.positionY,
                        letter: String.fromCharCode(e.which),
                        color: this.color
                    };
                    this.textTool.positionX = this.textTool.positionX + this.textTool.letterspace;
                    return this.actions.push(action);
                }
            };

            Sketch.prototype.addNonCharacterKeys = function(e) {
                if (e.keyCode === 8 && this.actions[this.actions.length - 1].tool === 'text') {
                    this.actions.pop();
                    if (this.textTool.positionX > this.textTool.originalX) {
                        this.textTool.positionX = this.textTool.positionX - this.textTool.letterspace;
                    } else {
                        this.textTool.positionY = this.textTool.positionY - this.textTool.linespace;
                        this.textTool.positionX = this.textTool.lineLengths[this.textTool.lineLengths.length - 1];
                        this.textTool.lineLengths.pop();
                    }
                    return e.preventDefault();
                } else if (e.keyCode === 13) {
                    this.textTool.lineLengths.push(this.textTool.positionX - this.textTool.letterspace);
                    this.textTool.positionX = this.textTool.originalX;
                    return this.textTool.positionY = this.textTool.positionY + this.textTool.linespace;
                }
            };

            Sketch.prototype.onEvent = function(e) {
                if (e.originalEvent && e.originalEvent.targetTouches) {
                    if (e.type === 'touchend') {
                        e.pageX = e.originalEvent.pageX;
                        e.pageY = e.originalEvent.pageY;
                    } else {
                        e.pageX = e.originalEvent.targetTouches[0].pageX;
                        e.pageY = e.originalEvent.targetTouches[0].pageY;
                    }
                }
                $.sketch.tools[$(this).data('sketch').tool].onEvent.call($(this).data('sketch'), e);
                e.preventDefault();
                return false;
            };

            Sketch.prototype.redraw = function() {
                var sketch;
                this.el.width = this.canvas.width();
                this.context = this.el.getContext('2d');
                sketch = this;
                $.each(this.actions, function() {
                    if (this.tool) {
                        return $.sketch.tools[this.tool].draw.call(sketch, this);
                    }
                });
                if (this.painting && this.action) {
                    return $.sketch.tools[this.action.tool].draw.call(sketch, this.action);
                }
            };

            return Sketch;

        })();
        $.sketch = {
            tools: {}
        };
        $.sketch.tools.marker = {
            onEvent: function(e) {
                switch (e.type) {
                    case 'mousedown':
                    case 'touchstart':
                        this.startPainting();
                        break;
                    case 'mouseup':
                    case 'mouseout':
                    case 'mouseleave':
                    case 'touchend':
                    case 'touchcancel':
                        this.stopPainting();
                }
                if (this.painting) {
                    this.action.events.push({
                        x: e.pageX - this.canvas.offset().left,
                        y: e.pageY - this.canvas.offset().top,
                        event: e.type
                    });
                    return this.redraw();
                }
            },
            draw: function(action) {
                var event, previous, _i, _len, _ref;
                this.context.lineJoin = "round";
                this.context.lineCap = "round";
                this.context.beginPath();
                this.context.moveTo(action.events[0].x, action.events[0].y);
                _ref = action.events;
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                    event = _ref[_i];
                    this.context.lineTo(event.x, event.y);
                    previous = event;
                }
                this.context.strokeStyle = action.color;
                this.context.lineWidth = action.size;
                return this.context.stroke();
            }
        };
        $.sketch.tools.text = {
            onEvent: function(e) {
                switch (e.type) {
                    case "mousedown":
                    case "touchstart":
                        return this.dropCursor(e);
                    case "keypress":
                        this.addText(e);
                        return this.redraw();
                    case "keyup":
                        this.addNonCharacterKeys(e);
                        return this.redraw();
                }
            },
            draw: function(action) {
                this.context.fillStyle = action.color;
                this.context.font = this.textTool.font;
                this.context.fillText(action.letter, action.positionX, action.positionY);
                return this.textTool.addCursor();
            }
        };
        return $.sketch.tools.eraser = {
            onEvent: function(e) {
                return $.sketch.tools.marker.onEvent.call(this, e);
            },
            draw: function(action) {
                var oldcomposite;
                oldcomposite = this.context.globalCompositeOperation;
                this.context.globalCompositeOperation = "destination-out";
                action.color = "rgba(0,0,0,1)";
                $.sketch.tools.marker.draw.call(this, action);
                return this.context.globalCompositeOperation = oldcomposite;
            }
        };
    })(jQuery);

}).call(this);
