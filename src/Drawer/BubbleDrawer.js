/**
 * @author nikai (@胖嘟嘟的骨头, nikai@baidu.com)
 */

/* globals Drawer, util */

function BubbleDrawer() {
    Drawer.apply(this, arguments);
}

util.inherits(BubbleDrawer, Drawer);

BubbleDrawer.prototype.drawMap = function (time) {
    this.beginDrawMap();

    var data = this.getLayer().getData();
    var highlightElement = this.getHighlightElement(); 

    var ctx = this.getCtx();
    var drawOptions = this.getDrawOptions();

    // scale size with map zoom
    var scale = 1 + (this.getMap().getZoom() - 6) * 0.2;

    var isFinalFrame = true;

    if(time !== undefined) {
        scale *= time;
        ctx.globalAlpha = time;
        if (time < 1) { // animating
            isFinalFrame = false;
        }
    } 

    for (var i = 0, len = data.length; i < len; i++) {
        var item = data[i];
        var size = this.dataRange.getSize(item.count);
        var path = new Path2D();

        // scale size with map zoom
        size = Math.round(scale * size);
        if (size < 1) {
            size = 1;
        }

        path.arc(item.px, item.py, size, 0, Math.PI * 2, false);

        isFinalFrame && this._elementPaths.push(path);

        ctx.save();
        // ctx.clip(path);

        ctx.fill(path);

        if (drawOptions.strokeStyle) {
            ctx.stroke(path);
        }

        ctx.restore();

    }

    // 最后给highlight的元素加边框
    if (highlightElement) {
        var highlightPath = highlightElement.path;

        if (drawOptions.highlightStrokeStyle) {
            ctx.save();
            ctx.strokeStyle = drawOptions.highlightStrokeStyle;
            ctx.strokeWidth = drawOptions.highlightStrokeWidth || 1;
            // var highlightItem = highlightElement.data;
            // ctx.beginPath();
            // ctx.arc(highlightItem.px, highlightItem.py, this.dataRange.getSize(highlightItem.count), 
            //         0, Math.PI * 2, false);
            // ctx.stroke();
            // ctx.closePath();
            ctx.stroke(highlightPath);
            ctx.restore();
        } 
    }

    this.endDrawMap();
}

