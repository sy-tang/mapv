/**
 * 一直覆盖在当前地图视野的Canvas对象
 *
 * @author nikai (@胖嘟嘟的骨头, nikai@baidu.com)
 *
 * @param 
 * {
 *     map 地图实例对象
 * }
 */ 
    
function CanvasLayer(options){
    this.options = options || {};
    this.paneName = this.options.paneName || 'labelPane';
    this.zIndex = this.options.zIndex || 0;
    this.context = this.options.context || '2d';
    this._map = options.map;
    this.show();
}

CanvasLayer.prototype = new BMap.Overlay();

CanvasLayer.prototype.initialize = function(map){
    this._map = map;
    var canvas = this.canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;"
                         + "left:0;" 
                         + "top:0;"
                         + "z-index:" + this.zIndex + ";";
    this.adjustSize();
    map.getPanes()[this.paneName].appendChild(canvas);
    var that = this;

    map.addEventListener('resize', function () {
        that.adjustSize();
        that.draw();
    });

    canvas.addEventListener('click', this.options.clickHandler);

    canvas.addEventListener('mousemove', this.options.hoverHandler);

    this._handleTapEvent();
    
    return this.canvas;
}

CanvasLayer.prototype.adjustSize = function(){
    var size = this._map.getSize();
    var canvas = this.canvas;
    var pixelRatio;

    if (this.context == 'webgl') {
        pixelRatio = 1;

    } else {
        pixelRatio = (function(context) {
                var backingStore = context.backingStorePixelRatio ||
                            context.webkitBackingStorePixelRatio ||
                            context.mozBackingStorePixelRatio ||
                            context.msBackingStorePixelRatio ||
                            context.oBackingStorePixelRatio ||
                            context.backingStorePixelRatio || 1;

                return (window.devicePixelRatio || 1) / backingStore;
            })(canvas.getContext('2d'));
    }

    canvas.width = size.width * pixelRatio;
    canvas.height = size.height * pixelRatio;
    canvas.style.width = size.width + "px";
    canvas.style.height = size.height + "px";
}

CanvasLayer.prototype.draw = function(){
    var map = this._map;
    var size = map.getSize();
    var center = map.getCenter();
    if (center) {
        var pixel = map.pointToOverlayPixel(center);
        this.canvas.style.left = pixel.x - size.width / 2 + 'px';
        this.canvas.style.top = pixel.y - size.height / 2 + 'px';
        this.dispatchEvent('draw');
        this.options.update && this.options.update.call(this);
    }
}

CanvasLayer.prototype.getContainer = function(){
    return this.canvas;
}

CanvasLayer.prototype.show = function(){
    if (!this.canvas) {
        this._map.addOverlay(this);
    }
    this.canvas.style.display = "block";
}

CanvasLayer.prototype.hide = function(){
    this.canvas.style.display = "none";
    // this._map.removeOverlay(this);
}

CanvasLayer.prototype.setZIndex = function(zIndex){
    this.canvas.style.zIndex = zIndex;
}

CanvasLayer.prototype.getZIndex = function(){
    return this.zIndex;
}

CanvasLayer.prototype._handleTapEvent = function() {
    // canvas.addEventListener('touchstart', this.options.tapHandler);
    var canvas = this.canvas;
    var _handler = this.options.tapHandler;
    if (_handler && typeof(_handler) == 'function') {
        var _touchStarted = false;
        var _touchMoved = false;
        var _currX = 0;
        var _currY = 0;
        var _cachedX = 0;
        var _cachedY = 0;
        var _touches;

        canvas.addEventListener('touchstart', function(e) {
            var pointer = e.targetTouches[0];
            _currX = _cachedX = pointer.clientX;
            _currY = _cachedY = pointer.clientY;
            _touchStarted = true;
            (function(e) {
                setTimeout(function() {
                    if (_cachedX == _currX && !_touchStarted & _cachedY == _currY) {
                        _handler.call(canvas, e);
                    }
                }, 200);
            })(e); 

            // if (e.targetTouches.length == 2) {
            //     _touches = e.targetTouches;
            //     console.log(JSON.stringify(e.targetTouches));
            // }
        });

        canvas.addEventListener('touchend', function(e) {
            _touchStarted = false;
            // console.log(e);
            // console.log(JSON.stringify(e.changedTouches));
        });

        canvas.addEventListener('touchcancel', function(e) {
            _touchStarted = false;
            // console.log(e);
            // console.log(JSON.stringify(e.changedTouches));
        });

        canvas.addEventListener('touchmove', function(e) {
            var pointer = e.changedTouches[0];
            _currX = pointer.clientX;
            _currY = pointer.clientY;
        });
    }
}
