/**
 * @author nikai (@胖嘟嘟的骨头, nikai@baidu.com)
 */

/* globals Drawer, util */

function BubbleDrawer() {
    Drawer.apply(this, arguments);
}

util.inherits(BubbleDrawer, Drawer);

BubbleDrawer.prototype.drawMap = function () {
    this.beginDrawMap();

    var data = this.getLayer().getData();

    var ctx = this.getCtx();


    var drawOptions = this.getDrawOptions();

    for (var i = 0, len = data.length; i < len; i++) {
        var item = data[i];
        var size = this.dataRange.getSize(item.count);
        // ctx.beginPath();
        // ctx.arc(item.px, item.py, size, 0, Math.PI * 2, false);
        // ctx.closePath();
        // ctx.fill();
        // if (drawOptions.strokeStyle) {
        //     ctx.stroke();
        // }
        var path = new Path2D();
        // ctx.beginPath();
        path.arc(item.px, item.py, size, 0, Math.PI * 2, false);
        // ctx.closePath();
        ctx.fill(path);
        if (drawOptions.strokeStyle) {
            ctx.stroke(path);
        }

        this._elementPaths.push(path);
        if (i == 0) {
            // debugger;
            console.log(item.px + " " + item.py);
        }
    }

    this.endDrawMap();
}
