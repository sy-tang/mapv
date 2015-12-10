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
        }
    }, options));

    this._layers = [];

    this._topLayer = null;

    //this._initDrawScale();
    this._fixPinchZoom();
    
    this.notify('drawTypeControl');
}

util.inherits(Mapv, Class);

Mapv.prototype._initDrawScale = function () {
    this.Scale = new DrawScale();
};

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

Mapv.prototype.addLayer = function(layer) {
    if (layer) {
        // 将事件重新派发给下一层
        if (this._topLayer) {
            var lastTopLayer = this._topLayer;
            var events = ['mousemove', 'click', 'touchstart', 'touchcancel', 'touchend'];
            for(var i = 0; i < events.length; i++) {
                layer.getCanvas().addEventListener(events[i], function(e) {
                    var new_e;

                    if (e.type.indexOf("touch") >= 0) {
                        // new_e = document.createEvent('TouchEvent');
                        // new_e.targetTouches = e.targetTouches;
                        // new_e.changedTouches = e.changedTouches;

                        // new_e.initTouchEvent("touchstart", true, true);

                        new_e = createTouchEvent(e);
                        // new_e.initTouchEvent("touchstart", true, true, window, null, 0, 0, 0, 0, false, false, false, false, e.touches, e.targetTouches, e.changedTouches, 1, 0);

                    } else {
                        new_e = new e.constructor(e.type, e);
                    }
                    alert(new_e.targetTouches);
                    lastTopLayer.getCanvas().dispatchEvent(new_e);
                });
            }           
        }

        this._layers.push(layer);
        this._topLayer = layer;
        // console.log('mapv: add layer %o', layer);
    }
}

function createTouchEvent(option) {
    var ua = /iPhone|iP[oa]d/.test(navigator.userAgent) ? 'iOS' : /Android/.test(navigator.userAgent) ? 'Android' : 'PC';

    var option = option || {};
    var param = {
        type: 'touchstart',
        canBubble: true,
        cancelable: true,
        view: window,
        detail: 0,
        screenX: 0,
        screenY: 0,
        clientX: 0,
        clientY: 0,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        touches: 0,
        targetTouches: 0,
        changedTouches: 0,
        scale: 0,
        rotation: 0,
        touchItem: 0
    };
    
    for(var i in param) {
        if(param.hasOwnProperty(i)) {
            param[i] = option[i] !== undefined ? option[i] : param[i];
        }
    }
    
    var event = document.createEvent('TouchEvent');
    
    // if(ua === 'Android') {
    //     event.initTouchEvent(param.touchItem, param.touchItem, param.touchItem, param.type, param.view, param.screenX, param.screenY, param.clientX, param.clientY, param.ctrlKey, param.altKey, param.shiftKey, param.metaKey);
    // } else {
        event.initTouchEvent(param.type, param.canBubble, param.cancelable, param.view, param.detail, param.screenX, param.screenY, param.clientX, param.clientY, param.ctrlKey, param.altKey, param.shiftKey, param.metaKey, param.touches, param.targetTouches, param.changedTouches, param.scale, param.rotation);
    // }
    
    return event;
}