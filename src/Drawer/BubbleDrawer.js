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

    console.log(time);

    if(time !== undefined) {
        scale *= time;
        ctx.globalAlpha = time;

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

        this._elementPaths.push(path);

        // 跳过需要highlight的元素，留到最后再画，确保不会被覆盖
        if (highlightElement && highlightElement.index == i)
            continue;

        ctx.fill(path);

        if (drawOptions.strokeStyle) {
            ctx.stroke(path);
        }
    }

    // 最后再画需要highlight的元素
    if (highlightElement) {
        var highlightPath = this._elementPaths[highlightElement.index];
        ctx.fill(highlightPath);

        if (drawOptions.highlightStrokeStyle) {
            var highlightItem = highlightElement.data;
            ctx.save();
            ctx.strokeStyle = drawOptions.highlightStrokeStyle;
            ctx.beginPath();
            // ctx.arc(highlightItem.px, highlightItem.py, this.dataRange.getSize(highlightItem.count), 
            //         0, Math.PI * 2, false);
            // ctx.stroke();
            // ctx.closePath();
            ctx.stroke(highlightPath);
            ctx.restore();

        } else if (drawOptions.strokeStyle) {
            ctx.stroke(highlightPath);
        }  
    }

    this.endDrawMap();
}

