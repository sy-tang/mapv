/**
 * @author nikai (@胖嘟嘟的骨头, nikai@baidu.com)
 */

function Layer (options) {
    Class.call(this);

    this._drawer = {};

    this.initOptions($.extend({
        ctx: null,
        animationCtx: null,
        mapv: null,
        paneName: 'labelPane',
        map: null,
        context: '2d',
        data: [],
        dataType: 'point',
        animationOptions: {
            size: 5
        },
        coordType: 'bd09ll',
        drawType: 'simple',
        animation: false,
        geometry: null,
        dataRangeControl: true,
        zIndex: 1
        
    }, options));

    // hold the element drawed in the layer that need to highlight
    // struct: {index: }
    this._highlightElement = null;  

    this._id = Math.random();

    this.dataRangeControl = new DataRangeControl();
    this.Scale = new DrawScale();

    this.notify('data');
    this.notify('mapv');
}

util.inherits(Layer, Class);

util.extend(Layer.prototype, {
    initialize: function () {

        if (this.canvasLayer) {
            return;
        }

        this.bindTo('map', this.getMapv());

        var that = this;

        this.getMap().addControl(this.dataRangeControl);
        this.getMap().addControl(this.Scale);

        this.canvasLayer = new CanvasLayer({
            map: this.getMap(),
            context: this.getContext(),
            zIndex: this.getZIndex(),
            paneName : this.getPaneName(),
            update: function () {
                that.draw();
            },
            elementTag: "canvas"
        });

        this.setCtx(this.canvasLayer.getContainer().getContext(this.getContext()));

        if (this.getAnimation() && this.getDataType() == 'polyline') {
            this.animationLayer = new CanvasLayer({
                map: this.getMap(),
                zIndex: this.getZIndex(),
                elementTag: "canvas"
            });

            this.setAnimationCtx(this.animationLayer.getContainer().getContext(this.getContext()));
        }

    },

    draw: function (remainLayout) {
        // debugger;
        var me = this;

        if (!this.getMapv()) {
            return;
        }

        this._getDrawer().clearTimer();

        var ctx = this.getCtx();

        if (!ctx) {
            return false;
        }

        if (!remainLayout) {
            this._calculatePixel();
        }

        // 没有动画，直接绘制
        if (!this.getAnimation() || this._animationTime) {
            if (this.getContext() == '2d') {
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            }
            this._getDrawer().drawMap();
        }

        // 带动画的绘制
        var animationOptions = this.getAnimationOptions() || {};

        // polyline animation
        if (this.getDataType() === 'polyline' && this.getAnimation() && !this._animationTime) {
            this._animationTime = true;
            
            if (this.getAnimation == 'time') { // 时变类型
                var timeline = this.timeline = new Animation({
                    duration: animationOptions.duration || 10000,  // 动画时长, 单位毫秒
                    fps: animationOptions.fps || 30,         // 每秒帧数
                    delay: animationOptions.delay || Animation.INFINITE,        // 延迟执行时间，单位毫秒,如果delay为infinite则表示手动执行
                    transition: Transitions[animationOptions.transition || "linear"],
                    onStop: animationOptions.onStop || function (e) { // 调用stop停止时的回调函数
                        console.log('stop', e);
                    }, 
                    render: function(e) {
                        if (me.getContext() == '2d') {
                            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                        }
                        var time = parseInt(parseFloat(me._minTime) + (me._maxTime - me._minTime) * e);
                        me._getDrawer().drawMap(time);

                        animationOptions.render && animationOptions.render(time);

                    }
                });

                timeline.setFinishCallback(function(){
                    //setTimeout(function(){
                        timeline.start();
                    //}, 3000);
                });

                timeline.start();


            } else {
                if (this.getContext() == '2d') {
                    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                }

                this._getDrawer().drawMap();
                this.drawAnimation();
            }

        }

        // simple icon animation
        if (this.getAnimation() && !this._animationTime && this.getDrawOptions().icon) {
            this._animationTime = true;

            if (this.getContext() == '2d') {
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            }
            this._getDrawer().drawMap();

            var canvas = me.canvasLayer.getContainer();
            canvas.style.transform = "translate(0, -100)";
            canvas.style.opacity = 0;
            var timeline = this.timeline = new Animation({
                duration: animationOptions.duration || 1000,  // 动画时长, 单位毫秒
                fps: animationOptions.fps || 30,         // 每秒帧数
                delay: animationOptions.delay || Animation.INFINITE,        // 延迟执行时间，单位毫秒,如果delay为infinite则表示手动执行
                transition: Transitions[animationOptions.transition || "linear"],
                onStop: animationOptions.onStop || function (e) { // 调用stop停止时的回调函数
                    console.log('stop', e);
                }, 
                render: function(e) {
                    var offset = -(1 - e) * 100;
                    var canvas = me.canvasLayer.getContainer();
                    canvas.style.transform = "translate(0, " + offset + "px)";  
                    canvas.style.opacity = e;
                    animationOptions.render && animationOptions.render(time);
                }
            });

            timeline.start();

        }

        if ((this.getDrawType() === 'bubble' || this.getDrawType() === 'simple') && this.getAnimation() && !this._animationTime) {
            this._animationTime = true;
            var timeline = this.timeline = new Animation({
                duration: animationOptions.duration || 1000,  // 动画时长, 单位毫秒
                fps: animationOptions.fps || 30,         // 每秒帧数
                delay: animationOptions.delay || Animation.INFINITE,        // 延迟执行时间，单位毫秒,如果delay为infinite则表示手动执行
                transition: Transitions[animationOptions.transition || "linear"],
                onStop: animationOptions.onStop || function (e) { // 调用stop停止时的回调函数
                    console.log('stop', e);
                }, 
                render: function(e) {
                    if (me.getContext() == '2d') {
                        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                    }
                    // console.log(e);
                    me._getDrawer().drawMap(e);
                    animationOptions.render && animationOptions.render(time);
                }
            });
            timeline.start();
        }

        this.dispatchEvent('draw');

        return true;
    },

    drawAnimation: function () {
        var animationCtx = this.getAnimationCtx();

        if (!animationCtx ) {
            return false;
        }

        animationCtx.clearRect(0, 0, animationCtx.canvas.width, animationCtx.canvas.height);

        var that = this;
        this._getDrawer().drawAnimation();

        if (this.getAnimation()) {
            requestAnimationFrame(function () {
                that.drawAnimation();
            });
        }
    },

    animation_changed: function () {
        // console.log('animation_changed');
        if (this.getAnimation()) {
            this.drawAnimation();
        }
    },

    mapv_changed: function () {
        // console.log('mapv_changed');
        if (!this.getMapv()) {
            this.canvasLayer && this.canvasLayer.hide();
            return;
        } else {
            this.canvasLayer && this.canvasLayer.show();
        }

        this.initialize();

        this.updateControl();

        this.draw();

        this.getMapv().addLayer(this);

    },

    drawType_changed: function () {
        // console.log('dataType_changed');
        this.updateControl();
        this.draw();
    },

    drawOptions_changed: function () {
        // console.log('drawOptions_changed');
        this.draw();
    },

    updateControl: function () {
        var mapv = this.getMapv();

        if (!mapv) {
            return;
        }

        var drawer = this._getDrawer();
        var map = this.getMap();

        // for drawer scale
        if(drawer.scale && this.getDataRangeControl()) {
            drawer.scale(this.Scale);
            this.Scale.show();
        } else {
            this.Scale.hide();
        }

        // mapv._drawTypeControl.showLayer(this);
        this.getMapv().OptionalData && this.getMapv().OptionalData.initController(this, this.getDrawType());
    },
    _getDrawer: function () {
        var drawType = this.getDrawType();
        if (!this._drawer[drawType]) {
            var funcName = drawType.replace(/(\w)/, function (v) {
                return v.toUpperCase();
            });
            funcName += 'Drawer';
            var drawer = this._drawer[drawType] = eval('(new ' + funcName + '(this))');
            if (drawer.scale) {
                if (this.getMapv()) {
                    drawer.scale(this.Scale);
                    this.Scale.show();
                }
            } else {
                this.Scale.hide();
            }
        }
        return this._drawer[drawType];
    },
    _calculatePixel: function () {
        var map = this.getMapv().getMap();
        var mercatorProjection = map.getMapType().getProjection();

        console.time('parseData');
        // 墨卡托坐标计算方法
        var zoom = map.getZoom();
        var zoomUnit = Math.pow(2, 18 - zoom);
        var mcCenter = mercatorProjection.lngLatToPoint(map.getCenter());
        var nwMc = new BMap.Pixel(mcCenter.x - (map.getSize().width / 2) * zoomUnit,
            mcCenter.y + (map.getSize().height / 2) * zoomUnit); //左上角墨卡托坐标
        var data = this.getData();
        var map = this.getMap();
        for (var j = 0; j < data.length; j++) {
            if (data[j].lng && data[j].lat && !data[j].x && !data[j].y) {

                var pixel = mercatorProjection.lngLatToPoint(new BMap.Point(data[j].lng, data[j].lat));
                data[j].x = pixel.x;
                data[j].y = pixel.y;
                //var pixel = map.pointToPixel(new BMap.Point(data[j].lng, data[j].lat));
                //data[j].px = pixel.x;
                //data[j].py = pixel.y;
            }
            if (data[j].x && data[j].y) {
                data[j].px = (data[j].x - nwMc.x) / zoomUnit;
                data[j].py = (nwMc.y - data[j].y) / zoomUnit;
            }
            if (data[j].geo) {
                var tmp = [];
                if (this.getCoordType() === 'bd09ll') {
                    for (var i = 0; i < data[j].geo.length; i++) {
                        var pixel = map.pointToPixel(new BMap.Point(data[j].geo[i][0], data[j].geo[i][1]));
                        tmp.push([pixel.x, pixel.y, parseFloat(data[j].geo[i][2])]);
                    }
                } else if (this.getCoordType() === 'bd09mc') {
                    for (var i = 0; i < data[j].geo.length; i++) {
                        tmp.push([(data[j].geo[i][0] - nwMc.x) / zoomUnit, (nwMc.y - data[j].geo[i][1]) / zoomUnit, parseFloat(data[j].geo[i][2])]);
                    }
                }
                data[j].pgeo = tmp;
            }
        }
        console.timeEnd('parseData');
    },
    data_changed: function () {
        // console.log('data_changed');
        var data = this.getData();
        if (data) {
            // 坐标系转换
            if (this.getCoordType() == 'gcj-02') {
                for (var i = 0; i < data.length; i++) {
                    var transformedGeo = GeoUtil.gcj_to_bd(data[i]);
                    data[i].lng = transformedGeo.lng;
                    data[i].lat = transformedGeo.lat;
                }
            }
            if (this.getCoordType() == 'wgs-84') {
                for (var i = 0; i < data.length; i++) {
                    var transformedGeo = GeoUtil.wgs_to_bd(data[i]);
                    data[i].lng = transformedGeo.lng;
                    data[i].lat = transformedGeo.lat;
                }
            }

            // 对气泡从大到小进行排序，确保小气泡总是画在大气泡的上面
            if (this.getDrawType() === 'bubble') {
                data.sort(function(a, b) {
                    return b.count - a.count;
                });
            }

            if (this.getDataType() === "polyline" && this.getAnimation()) {
                for (var i = 0; i < data.length; i++) {
                    data[i].index = parseInt(Math.random() * data[i].geo.length, 10);
                }
            }

            if (this.getDataType() === "polyline" && this.getAnimation() === 'time') {
                this._minTime = data[0] && data[0].geo[0][2];
                this._maxTime = this._minTime;
                for (var i = 0; i < data.length; i++) {
                    var geo = data[i].geo;
                    for (var j = 0; j < geo.length; j++) {
                        var time = geo[j][2];
                        if (time < this._minTime) {
                            this._minTime = time;
                        }
                        if (time > this._maxTime) {
                            this._maxTime = time;
                        }
                    }
                }
                //this._minTime = 1439568000;
                //this._maxTime = 1439827200;
            }

            if (data.length > 0) {
                this._min = data[0].count;
                this._max = this._max;
            }

            for (var i = 0; i < data.length; i++) {
                if (data[i].count === undefined || data[i].count === null) {
                    data[i].count = 1;
                }
                this._max = Math.max(this._max, data[i].count);
                this._min = Math.min(this._min, data[i].count);
            }
            this.draw();
        }
    },
    getDataRange: function () {
        // console.log('data_range_changed');
        return {
            minTime: this._minTime,
            maxTime: this._maxTime,
            min: this._min,
            max: this._max
        };
    },
    zIndex_changed: function () {
        // console.log('zIndex_changed');
        var zIndex = this.getZIndex();
        this.canvasLayer.setZIndex(zIndex);
    },

    dataRangeControl_changed: function () {
        // console.log('dataRangeControl_changed');
        this.updateControl();
        this._getDrawer().notify('drawOptions');
    },

    highlightElement_changed: function() {
        // console.log("highlight element changed: %o", this._highlightElement);
        // 画icon暂时不重绘
        if (!(this.getDrawType() == "simple" && this.getDrawOptions().icon)) {
            this.draw(true);
        }
    },

    findElementAtPoint: function(x, y) {
        var drawer = this._getDrawer();
        if (drawer) {
            // find out the click point in which path
            var paths = drawer.getElementPaths();
            var ctx = this.getCtx();
            var data = this.getData();

            if (this._highlightElement) {
                if (ctx.isPointInPath(this._highlightElement.path, x, y)) {
                    return this._highlightElement;
                } 
            }

            var newHighlightElement = null;
            for (var i = 0; i < paths.length; i++) {
                if (ctx.isPointInPath(paths[i], x, y)) {
                    // bingo!
                    // console.log("bingo");
                    var data = this.getData();                   
                    newHighlightElement = {data: data[i], path: paths[i]};
                    break;
                }
            }

            if (this._highlightElement !== newHighlightElement) {
                this._highlightElement = newHighlightElement;
                this.notify("highlightElement");
            }

            return newHighlightElement;
        }
    },

    _getHandler: function(type) {
        if (type == 'click')
            return this.getClick();
        else if (type == 'hover')
            return this.getHover();
        else if (type == 'tap')
            return this.getTap();
        else
            return null;
    },

    getCanvas: function() {
        if (this.canvasLayer)
            return this.canvasLayer.getContainer();
        else 
            return null;
    }

});

