/**
 * @file 普通的绘制方式
 * @author nikai (@胖嘟嘟的骨头, nikai@baidu.com)
 */

function SimpleDrawer() {
    Drawer.apply(this, arguments);
}

util.inherits(SimpleDrawer, Drawer);

SimpleDrawer.prototype.drawMap = function(time) {
    var dataType = this.getLayer().getDataType();
    if (this.getLayer().getContext() === 'webgl') {
        if (dataType === 'polyline') { // 画线
            this.drawWebglPolyline();
        } else {
            this.drawWebglPoint();
        }
        return;
    }

    this.beginDrawMap();

    var data = this.getLayer().getData();
    var ctx = this.getCtx();
    var drawOptions = this.getDrawOptions();

    ctx.beginPath();

    if (dataType === 'polyline' || dataType === 'polygon') { // 画线或面

        var label = drawOptions.label;
        var zoom = this.getMap().getZoom();
        if (label) {
            if (label.font) {
                ctx.font = label.font;
            }
            var labelKey = label.key || 'count';
        }

        var animationOptions = this.getLayer().getAnimationOptions() || {};

        for (var i = 0, len = data.length; i < len; i++) {
            var geo = data[i].pgeo;
            var startIndex = 0, //开始的索引
                endIndex = geo.length - 1; //结束的索引

            if (time) { // 按时间动画展示
                var scope = animationOptions.scope || 60 * 60 * 3;
                for (var j = 0; j < geo.length; j++) {
                    if (parseFloat(geo[j][2]) < time - scope) {
                        startIndex = j;
                    }
                    endIndex = j;
                    if (parseFloat(geo[j][2]) > time) {
                        break;
                    }
                }
            }

            if (startIndex >= endIndex) {
                continue;
            }

            ctx.beginPath();
            ctx.moveTo(geo[startIndex][0], geo[startIndex][1]);

            for (var j = startIndex + 1; j <= endIndex; j++) {
                ctx.lineTo(geo[j][0], geo[j][1]);
            }

            if (drawOptions.strokeStyle || dataType === 'polyline') {
                ctx.stroke();
            }

            if (dataType === 'polygon') {
                ctx.closePath();
                ctx.fill();
            }

            if (label && label.show && (!label.minZoom || label.minZoom && zoom >= label.minZoom)) {
                ctx.save();
                if (label.fillStyle) {
                    ctx.fillStyle = label.fillStyle;
                }
                var center = util.getGeoCenter(geo);
                ctx.fillText(data[i][labelKey], center[0], center[1]);
                ctx.restore();
            }

        }


    } else { // 画点

        if (!drawOptions.scaleRange && this.getRadius() < 2) {  // 密集的小点，放到一起填充，提高性能
            var radius = this.getRadius();
            for (var i = 0, len = data.length; i < len; i++) {
                var item = data[i];
                if (item.px < 0 || item.px > ctx.canvas.width || item.py < 0 || item > ctx.canvas.height) {
                    // console.log('out of canvas');
                    continue;
                }

                ctx.moveTo(item.px, item.py);
                ctx.arc(item.px, item.py, radius, 0, 2 * Math.PI, false);
            }
            ctx.fill();

        } else {    

            var that = this;
            var icon = drawOptions.icon;
            if (icon) {
                // using icon font
                if (icon.font && icon.text) {
                    setTimeout(function() {
                        console.time('draw font');
                        that.drawIconsWithFont(icon.font, icon.text, time);
                        console.timeEnd('draw font');
                    });
                }

                // using image
                if (icon.url) {
                    if (this._cachedImage) {
                        this.drawIcons(time, this._cachedImage);

                    } else {
                        (function(time) {
                            var image = new Image();
                            image.onload = function() {
                                console.log('image loaded');
                                that._cachedImage = image;
                                that.drawIconsWithImage(image, time);
                            }
                            image.src = drawOptions.icon.url;
                        })(time);
                    }
                }

            } else {
                // using defined shape: circle rect diamond triangle
                this.drawShapes(time);
            }
            
        }
        
    }

    this.endDrawMap();
}

SimpleDrawer.prototype.drawShapes = function(time) {
    if(time == undefined) {
        time = 1;
    } 
    var isFinalFrame = time < 1 ? false : true;
    
    var that = this;
    var drawOptions = this.getDrawOptions();
    var data = this.getLayer().getData();
    var ctx = this.getCtx();

    ctx.globalAlpha = time;

    for (var i = 0, len = data.length; i < len; i++) {
        var item = data[i];
        // if (item.px < 0 || item.px > ctx.canvas.width || item.py < 0 || item > ctx.canvas.height) {
        //     continue;
        // }
        var path = new Path2D();

        var scale = drawOptions.scaleRange ? Math.sqrt(this.dataRange.getScale(item.count)) : 1;

        scale *= time;

        var radius = this.getRadius() * scale;
        var shape = item.shape || drawOptions.shape || 'circle';

        switch(shape) {
            case 'rect': 
                path.moveTo(item.px - radius, item.px - radius);
                path.rect(item.px - radius, item.py - radius, radius * 2, radius * 2);
                break;

            case 'triangle':
                path.moveTo(item.px, item.py - radius);
                path.lineTo(item.px - radius * Math.sqrt(3) / 2, item.py + radius / 2);
                path.lineTo(item.px + radius * Math.sqrt(3) / 2, item.py + radius / 2);
                path.lineTo(item.px, item.py - radius);
                break;

            case 'diamond':
                path.moveTo(item.px, item.py - 1.5 * radius);
                path.lineTo(item.px - radius, item.py);
                path.lineTo(item.px, item.py + 1.5 * radius);
                path.lineTo(item.px + radius, item.py);
                path.lineTo(item.px, item.py - 1.5 * radius);
                break;

            case 'circle':
            default:
                path.moveTo(item.px, item.py);
                path.arc(item.px, item.py, radius, 0, 2 * Math.PI, false);
        }

        ctx.save();
        if (item.color) {
            ctx.fillStyle = item.color;
        }

        ctx.fill(path);
        if (drawOptions.strokeStyle) {
            ctx.stroke(path);
        }

        ctx.restore();

        isFinalFrame && this._elementPaths.push(path);
    }
}

// 绘制icon
SimpleDrawer.prototype.drawIconsWithImage = function(image, time) {
    if(time == undefined) {
        time = 1;
    } 
    var isFinalFrame = time < 1 ? false : true;
    
    var that = this;
    var drawOptions = this.getDrawOptions();
    var data = this.getLayer().getData();
    var ctx = this.getCtx();

    var queue = [];
    var group = [];


    for (var i = 0, len = data.length; i < len; i++) {
        var item = data[i];
        if (item.px < 0 || item.px > ctx.canvas.width || item.py < 0 || item > ctx.canvas.height) {
            continue;
        }

        var scale = drawOptions.scaleRange ? Math.sqrt(that.dataRange.getScale(item.count)) : 1;

        scale *= time;

        var icon = util.copy(drawOptions.icon);
        
        if (drawOptions.scaleRange) {
            // console.log(scale);
            // debugger;
            icon.width *= scale;
            icon.height *= scale;
            icon.offsetX = icon.offsetX ? icon.offsetX * scale : 0;
            icon.offsetY = icon.offsetY ? icon.offsetY * scale : 0;
        }
        
        if (i % 100 == 0) {
            group = [];
            queue.push(group);
        }

        group.push({
            item: item, icon: icon
        });
        
        // this.drawIcon(ctx, item, icon);
    }

    if (queue.length > 0) {
        // console.log('start queue: draw %d icons in total.', data.length);
        var id = parseInt(Math.random() * 10000);
        var loop = function() {
            var group = queue.shift();

            // console.log('process %d:  draw %d icons.', id, group.length);
            for (var i = 0; i < group.length; i++) {
                var drawObj = group[i];
                var icon = drawObj.icon;
                var item = drawObj.item;

                that.drawImage(ctx, drawObj.item, drawObj.icon, image);

                // add path for event trigger
                var path = new Path2D();
                var offsetX = icon.offsetX;
                var offsetY = icon.offsetY;
                var width = icon.width || 0;
                var height = icon.height || 0;

                var path = new Path2D();
                var x = item.px - width / 2 - offsetX,
                    y = item.py - height / 2 - offsetY;

                path.rect(x, y, width, height);

                // ctx.stroke(path);

                isFinalFrame && that._elementPaths.push(path);
            }
            if (queue.length > 0) {
                that._timer = setTimeout(loop, 0);
            }
        }
        that._timer = setTimeout(loop, 0);
    }
}

SimpleDrawer.prototype.drawImage = function(ctx, item, icon, image) {
    var width = icon.width || 0;
    var height = icon.height || 0;
    var offsetX = icon.offsetX || 0;
    var offsetY = icon.offsetY || 0;

    var pixelRatio = util.getPixelRatio(ctx);
    var x = item.px - width / 2 - offsetX,
        y = item.py - height / 2 - offsetY;

    var color = item.color || icon.color || undefined;

    ctx.save();
    ctx.scale(pixelRatio, pixelRatio);
    if (color) {
        var color = color.replace('rgba(', "").replace(")", "").split(",");
        // create offscreen buffer, 
        var buffer = document.createElement('canvas');
        
        var bx = buffer.getContext('2d');
        var pixelRatio = 2;

        buffer.width = width * pixelRatio;
        buffer.height = height * pixelRatio;

        bx.drawImage(image, 0, 0, buffer.width, buffer.height);

        var imgData = bx.getImageData(0, 0, buffer.width, buffer.height);
        var data = imgData.data;

        for (var i = 0; i < data.length; i += 4) {
            var red = data[i + 0];
            var green = data[i + 1];
            var blue = data[i + 2];
            var alpha = data[i + 3];

            // skip transparent/semiTransparent pixels
            if (alpha < 100 || (red > 200 && green > 200 && blue > 200 )) {
                continue;
            }

            data[i + 0] = parseInt(color[0]);
            data[i + 1] = parseInt(color[1]);
            data[i + 2] = parseInt(color[2]);
        }

        bx.putImageData(imgData, 0, 0);

        image = buffer;
    }

    ctx.drawImage(image, x, y, width, height);
    ctx.restore();
}

SimpleDrawer.prototype.drawIconsWithFont = function(iconfont, text, time) {
    if(time == undefined) {
        time = 1;
    } 
    var isFinalFrame = time < 1 ? false : true;

    var data = this.getLayer().getData();
    var ctx = this.getCtx();
    var drawOptions = this.getDrawOptions();
    var that = this;

    var baseSize = 16;

    for (var i = 0, len = data.length; i < len; i++) {
        var item = data[i];
        // if (item.px < 0 || item.px > ctx.canvas.width || item.py < 0 || item > ctx.canvas.height) {
        //     continue;
        // }
        var scale = drawOptions.scaleRange ? Math.sqrt(that.dataRange.getScale(item.count)) : 1;

        var icon = drawOptions.icon;
        
        ctx.font = baseSize * scale + "px " + iconfont;

        var width = baseSize * scale * 0.8;
        var height = baseSize * scale;

        var pixelRatio = util.getPixelRatio(ctx);
        
        ctx.save();
        ctx.scale(pixelRatio, pixelRatio);
        ctx.fillStyle = item.color || icon.color || drawOptions.fillStyle;
        ctx.fillText(text, item.px - width / 2, item.py + height - 3 * scale - height);
        ctx.restore();

        // add path for event trigger
        var path = new Path2D();

        path.rect(item.px + baseSize * scale * 0.1 - width / 2, item.py - height, width, height);

        // ctx.stroke(path);

        isFinalFrame && that._elementPaths.push(path);
    }
}

/**
 * 绘制动画
 */
SimpleDrawer.prototype.drawAnimation = function() {
    var layer = this.getLayer();
    var data = layer.getData();
    var dataType = layer.getDataType();
    var animationOptions = layer.getAnimationOptions();
    var animation = layer.getAnimation();
    var ctx = layer.getAnimationCtx();

    if (dataType === 'polyline') {
        if (animation === 'time') {} else {
            for (var i = 0, len = data.length; i < len; i++) {
                var index = data[i].index;
                var pgeo = data[i].pgeo;

                var pixelRatio = util.getPixelRatio(ctx);
                ctx.save();
                ctx.scale(pixelRatio, pixelRatio);

                /* 设定渐变区域 */
                var x = pgeo[index][0];
                var y = pgeo[index][1];
                var grad = ctx.createRadialGradient(x, y, 0, x, y, animationOptions.size);
                grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
                grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.9)');
                grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = grad;

                ctx.beginPath();
                ctx.arc(x, y, animationOptions.size, 0, 2 * Math.PI, false);
                ctx.closePath();
                ctx.fill();
                data[i].index++;
                if (data[i].index >= data[i].pgeo.length) {
                    data[i].index = 0;
                }

                ctx.restore();
            }
        }
    }
}

// 使用webgl来绘点，支持更大数据量的点
SimpleDrawer.prototype.drawWebglPoint = function() {

    var data = this.getLayer().getData();

    if (!data) {
        return;
    }

    var gl = this.getCtx();

    var vs, fs, vs_s, fs_s;

    vs = gl.createShader(gl.VERTEX_SHADER);
    fs = gl.createShader(gl.FRAGMENT_SHADER);

    vs_s = [
        'attribute vec4 a_Position;',
        'attribute float a_PointSize;',
        'void main() {',
        'gl_Position = a_Position;',
        'gl_PointSize = a_PointSize;',
        '}'
    ].join('');

    fs_s = [
        'precision mediump float;',
        'uniform vec4 u_FragColor;',
        'void main() {',
        'gl_FragColor = u_FragColor;',
        '}'
    ].join('');

    var program = gl.createProgram();
    gl.shaderSource(vs, vs_s);
    gl.compileShader(vs);
    gl.shaderSource(fs, fs_s);
    gl.compileShader(fs);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    var a_Position = gl.getAttribLocation(program, 'a_Position');

    var a_PointSize = gl.getAttribLocation(program, 'a_PointSize');

    var uFragColor = gl.getUniformLocation(program, 'u_FragColor');

    //gl.clearColor(0.0, 0.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    var halfCanvasWidth = gl.canvas.width / 2;
    var halfCanvasHeight = gl.canvas.height / 2;

    var verticesData = [];
    var count = 0;
    for (var i = 0; i < data.length; i++) {
        var item = data[i];

        var x = (item.px - halfCanvasWidth) / halfCanvasWidth;
        var y = (halfCanvasHeight - item.py) / halfCanvasHeight;

        if (x < -1 || x > 1 || y < -1 || y > 1) {
            continue;
        }
        verticesData.push(x, y);
        count++;
    }

    var vertices = new Float32Array(verticesData);
    var n = count; // The number of vertices

    // Create a buffer object
    var vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        console.log('Failed to create the buffer object');
        return -1;
    }

    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    // Write date into the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    var a_Position = gl.getAttribLocation(program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return -1;
    }
    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    gl.vertexAttrib1f(a_PointSize, this.getRadius());

    var tmpCanvas = document.createElement('canvas');
    var tmpCtx = tmpCanvas.getContext('2d');
    tmpCanvas.width = 1;
    tmpCanvas.height = 1;
    tmpCtx.fillStyle = this.getDrawOptions().fillStyle;
    tmpCtx.fillRect(0, 0, 1, 1);
    var colored = tmpCtx.getImageData(0, 0, 1, 1).data;

    gl.uniform4f(uFragColor,
        colored[0] / 255,
        colored[1] / 255,
        colored[2] / 255,
        colored[3] / 255);
    gl.drawArrays(gl.POINTS, 0, n);
}

// 使用webgl来绘线，支持更大数据量的线
SimpleDrawer.prototype.drawWebglPolyline = function() {
    var data = this.getLayer().getData();

    if (!data) {
        return;
    }

    var gl = this.getCtx();

    var vs, fs, vs_s, fs_s;

    vs = gl.createShader(gl.VERTEX_SHADER);
    fs = gl.createShader(gl.FRAGMENT_SHADER);

    vs_s = [
        'attribute vec4 a_Position;',
        'void main() {',
        'gl_Position = a_Position;',
        'gl_PointSize = 30.0;',
        '}'
    ].join('');

    fs_s = [
        'precision mediump float;',
        'uniform vec4 u_FragColor;',
        'void main() {',
        'gl_FragColor = u_FragColor;',
        '}'
    ].join('');

    var program = gl.createProgram();
    gl.shaderSource(vs, vs_s);
    gl.compileShader(vs);
    gl.shaderSource(fs, fs_s);
    gl.compileShader(fs);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    //gl.clearColor(0.0, 0.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    var halfCanvasWidth = gl.canvas.width / 2;
    var halfCanvasHeight = gl.canvas.height / 2;

    // Create a buffer object
    var vertexBuffer = gl.createBuffer();
    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    var a_Position = gl.getAttribLocation(program, 'a_Position');
    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    var uFragColor = gl.getUniformLocation(program, 'u_FragColor');

    var tmpCanvas = document.createElement('canvas');
    var tmpCtx = tmpCanvas.getContext('2d');
    tmpCanvas.width = 1;
    tmpCanvas.height = 1;
    tmpCtx.fillStyle = this.getDrawOptions().strokeStyle || 'red';
    tmpCtx.fillRect(0, 0, 1, 1);
    var colored = tmpCtx.getImageData(0, 0, 1, 1).data;

    gl.uniform4f(uFragColor,
        colored[0] / 255,
        colored[1] / 255,
        colored[2] / 255,
        colored[3] / 255);

    gl.lineWidth(this.getDrawOptions().lineWidth || 1);

    for (var i = 0, len = data.length; i < len; i++) {
        var geo = data[i].pgeo;

        var verticesData = [];

        for (var j = 0; j < geo.length; j++) {
            var item = geo[j];

            var x = (item[0] - halfCanvasWidth) / halfCanvasWidth;
            var y = (halfCanvasHeight - item[1]) / halfCanvasHeight;
            verticesData.push(x, y);
        }
        var vertices = new Float32Array(verticesData);
        // Write date into the buffer object
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.drawArrays(gl.LINE_STRIP, 0, geo.length);
    }
}
