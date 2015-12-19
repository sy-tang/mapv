var GeoUtil = (function() {
    // GCJ-02 -> BD-09
    // gcj: {lng, lat}  
    function gcj_to_bd(gcj) {  
        var x_pi = 3.14159265358979324 * 3000.0 / 180.0;  
        var x = gcj.lng, y = gcj.lat;  
        var z = Math.sqrt(x * x + y * y) + 0.00002 * Math.sin(y * x_pi);  
        var theta = Math.atan2(y, x) + 0.000003 * Math.cos(x * x_pi);  
        var bd_lon = z * Math.cos(theta) + 0.0065;  
        var bd_lat = z * Math.sin(theta) + 0.006;  
        return {
          lng: bd_lon,
          lat: bd_lat
        };
    }

    // BD-09 -> GCJ-02
    // bd: {lng, lat}
    function bd_to_gcj(bd) {  
        var x_pi = 3.14159265358979324 * 3000.0 / 180.0;  
        var x = bd.lng - 0.0065, y = bd.lat - 0.006;  
        var z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * x_pi);  
        var theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * x_pi);  

        return {
            lng: z * Math.cos(theta),
            lat: z * Math.sin(theta)
        }
    }

    // WGS-84 -> GCJ-02
    // wgs: {lng, lat}
    function wgs_to_gcj(wgs) {
        var pi = 3.14159265358979324;
        var a = 6378245.0;
        var ee = 0.00669342162296594323;

        var wgLat = wgs.lat, wgLon = wgs.lng;

        if (isInChina(wgLon, wgLat)) {
            var dLat = transformLat(wgLon - 105.0, wgLat - 35.0);
            var dLon = transformLon(wgLon - 105.0, wgLat - 35.0);
            var radLat = wgLat / 180.0 * pi;
            var magic = Math.sin(radLat);
            magic = 1 - ee * magic * magic;
            var sqrtMagic = Math.sqrt(magic);
            dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * pi);
            dLon = (dLon * 180.0) / (a / sqrtMagic * Math.cos(radLat) * pi);

            return {
                lng: wgLon + dLon,
                lat: wgLat + dLat
            }
            
        } else {
            return {
                lng: wgLon,
                lat: wgLat
            }
        }
        
    }

    // WGS-84 -> BD-09
    // wgs: {lng, lat}
    function wgs_to_bd(wgs) {
        return gcj_to_bd(wgs_to_gcj(wgs));
    }

    function Rectangle(lng1, lat1, lng2, lat2) {
        this.west = Math.min(lng1, lng2);
        this.north = Math.max(lat1, lat2);
        this.east = Math.max(lng1, lng2);
        this.south = Math.min(lat1, lat2);
    }

    function isInRect(rect, lon, lat) {
        return rect.west <= lon && rect.east >= lon && rect.north >= lat && rect.south <= lat;
    }
    //China region - raw data
    var region = [
        new Rectangle(79.446200, 49.220400, 96.330000,42.889900),
        new Rectangle(109.687200, 54.141500, 135.000200, 39.374200),
        new Rectangle(73.124600, 42.889900, 124.143255, 29.529700),
        new Rectangle(82.968400, 29.529700, 97.035200, 26.718600),
        new Rectangle(97.025300, 29.529700, 124.367395, 20.414096),
        new Rectangle(107.975793, 20.414096, 111.744104, 17.871542)
    ];
    //China excluded region - raw data
    var exclude = [
        new Rectangle(119.921265, 25.398623, 122.497559, 21.785006),
        new Rectangle(101.865200, 22.284000, 106.665000, 20.098800),
        new Rectangle(106.452500, 21.542200, 108.051000, 20.487800),
        new Rectangle(109.032300, 55.817500, 119.127000, 50.325700),
        new Rectangle(127.456800, 55.817500, 137.022700, 49.557400),
        new Rectangle(131.266200, 44.892200, 137.022700, 42.569200)
    ];

    function isInChina(lon, lat) {
        for (var i = 0; i < region.length; i++) {
            if (isInRect(region[i], lon, lat))
            {
                for (var j = 0; j < exclude.length; j++)
                {
                    if (isInRect(exclude[j], lon, lat))
                    {
                        return false;
                    }
                }
                return true;
            }
        }
        return false;
    }

    function transformLat(x, y) {
        var pi = 3.14159265358979324;

        var ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
        ret += (20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(y * pi) + 40.0 * Math.sin(y / 3.0 * pi)) * 2.0 / 3.0;
        ret += (160.0 * Math.sin(y / 12.0 * pi) + 320 * Math.sin(y * pi / 30.0)) * 2.0 / 3.0;
        return ret;
    }

    function transformLon(x, y) {
        var pi = 3.14159265358979324;

        var ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
        ret += (20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(x * pi) + 40.0 * Math.sin(x / 3.0 * pi)) * 2.0 / 3.0;
        ret += (150.0 * Math.sin(x / 12.0 * pi) + 300.0 * Math.sin(x / 30.0 * pi)) * 2.0 / 3.0;
        return ret;
    }

    return {
        gcj_to_bd: gcj_to_bd,
        bd_to_gcj: bd_to_gcj,
        wgs_to_gcj: wgs_to_gcj,
        wgs_to_bd: wgs_to_bd
    };

})();