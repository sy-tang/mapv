/**
 * @author nikai (@胖嘟嘟的骨头, nikai@baidu.com)
 * 地图可视化库，目前依赖与百度地图api，在百度地图api上展示点数据
 *
 */

/**
 * Mapv主类
 * @param {Object}
 */
function Mapv(options) {
    Class.call(this);

    this.initOptions($.extend({
        map: null, //地图参数
        drawTypeControl: false,
        drawTypeControlOptions: {
            a: 1
        },
        click: null,
        hover: null,
        tap: null

    }, options));

    this._layers = [];

    this._topLayer = null;

    this._container = this.getMap().getContainer();

    this._initEvents();

    //this._initDrawScale();
    this._fixPinchZoom();
    
    this.notify('drawTypeControl');
}

util.inherits(Mapv, Class);

Mapv.prototype._initDrawScale = function () {
    this.Scale = new DrawScale();
}

Mapv.prototype.drawTypeControl_changed = function () {
    if (this.getDrawTypeControl()) {
        if (!this.drawTypeControl) {
            this.drawTypeControl = new DrawTypeControl({
                mapv: this
            });
        }
        this.getMap().addControl(this.drawTypeControl);
    } else {
        if (this.drawTypeControl) {
            this.getMap().removeControl(this.drawTypeControl);
        }
    }
}

Mapv.prototype._initEvents = function() {
    var bmap = this.getMap();
    var that = this;

    var elementsFound = [];

    var listener = function(e) {
        var target = e.target || e.srcElement;
        if (e.type !== 'tap' && target.tagName.toLowerCase() !== 'canvas')
            return;

        var rect = this.getBoundingClientRect(),
            x = e.clientX - rect.left,
            y = e.clientY - rect.top;

        var layers = that._layers;
        var results = [];

        var handler = that._getHandler(e.type);

        // console.time('find element');
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];

            if (layer.getContext() === 'webgl')
                continue;

            // used for debug: draw the touch point
            // if (i == 0) {
            //     var ctx = layer.getCtx();
            //     var pixelRatio = util.getPixelRatio(ctx);
            //     ctx.save();
            //     ctx.scale(pixelRatio, pixelRatio);
            //     ctx.moveTo(x, y);
            //     ctx.fillStyle = 'black';
            //     ctx.arc(x, y, 2, 0, 2 * Math.PI, false);
            //     ctx.fill();
            //     ctx.restore();
            // }

            var elem = layer.findElementAtPoint(x, y);
            
            if (elem) { // 找到一个元素后就往下层搜寻
                results.push(elem.data);
                // console.log('got it!');

                // 取消其他图层的高亮状态
                for (var j = 0; j < layers.length; j++) {
                    if (i == j) continue;
                    layers[j].clearHighlight();
                }

                break;
            }
        }
        // console.timeEnd('find element');

        // 当再次hover不到元素时，不执行回调
        if (e.type == 'mousemove' && elementsFound.length == 0 && results.length == 0)
            return;

        elementsFound = results;

        // console.log("find elements at (%f, %f) : %o", x, y, results);
        if (handler && typeof handler == 'function') {
            handler(results, e);
        }
    };

    if (this._getHandler('click')) {
        bmap.getContainer().addEventListener('click', listener);

            // handle tap event
        var _touchStarted = false;
        var _touchMoved = false;
        var _currX = 0;
        var _currY = 0;
        var _cachedX = 0;
        var _cachedY = 0;
        var _touches;

        bmap.addEventListener('touchstart', function(e) {  
            var pointer = e.targetTouches[0];
                _currX = _cachedX = pointer.clientX;
                _currY = _cachedY = pointer.clientY;
                _touchStarted = true;

            var that = this;
            (function(e) {
                setTimeout(function() {
                    if (_cachedX == _currX && !_touchStarted & _cachedY == _currY) {
                        var tap_e = document.createEvent('Event');
                        tap_e.initEvent('tap', true, true);
                        tap_e.clientX = _cachedX;
                        tap_e.clientY = _cachedY;
                        listener.call(that.getContainer(), tap_e);
                    }
                }, 200);
            })(e); 
        });

        bmap.addEventListener('touchend', function(e) {
            _touchStarted = false;
        });

        bmap.addEventListener('touchmove', function(e) {
            var pointer = e.changedTouches[0];
            _currX = pointer.clientX;
        _currY = pointer.clientY;
    });
    }

    if (this._getHandler('hover')) {
        bmap.getContainer().addEventListener('mousemove', listener);
        bmap.getContainer().addEventListener('mouseleave', function(e) {
            var handler = that._getHandler('hover');
            if (handler && typeof handler === 'function')
                handler([], e);
        });
    }

}

// 执行pinch手势操作后，将地图的中心点改为两个触摸点的中心点，
// 使放大的区域能够显示在viewport的中心
Mapv.prototype._fixPinchZoom = function() {
    var bmap = this.getMap();
    var _zoom = bmap.getZoom();
    var _touchMidPoint;
    var _offset = bmap.getContainer().getBoundingClientRect();

    bmap.addEventListener('touchstart', function(e) {
        if (e.targetTouches.length == 2) {
            var touches = e.targetTouches;

            var middlePoint = {
                x: (touches[0].clientX + touches[1].clientX) / 2 - _offset.left,
                y: (touches[0].clientY + touches[1].clientY) / 2 - _offset.top
            }

            _touchMidPoint = bmap.pixelToPoint(middlePoint);
        }
    });

    bmap.addEventListener('touchcancel', function(e) {
        _touchMidPoint = null;
    });

    bmap.addEventListener('zoomend', function(e) {
        var newZoom = bmap.getZoom();
        if (newZoom > _zoom && _touchMidPoint) { // 放大时才修改中心点
            bmap.panTo(_touchMidPoint);
        }
        _zoom = newZoom; 
        _touchMidPoint = null;
    });
}

Mapv.prototype._getHandler = function(type) {
    switch(type) {
        case 'tap':
        case 'click':
            return this.getClick();

        case 'hover':
        case 'mousemove':
            return this.getHover();

        default:
            return null;
    }
}

Mapv.prototype.addLayer = function(layer) {
    if (layer) {
        this._layers.push(layer);
        this._topLayer = layer;
    }
}

Mapv.prototype.clearAllLayer = function() {
    var map = this.getMap();
    while(this._layers.length > 0) {
        var layer = this._layers.shift();
        map.removeOverlay(layer.canvasLayer);
    }
}

Mapv.prototype.highlight = function(layerIndex, pointIndex) {
    var layer = this._layers[layerIndex];
    if (layer) {
        layer.highlight(pointIndex);
    }
}
