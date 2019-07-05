(function() {

    var cvs = document.createElement('canvas');
    $('#visual-container').append(cvs);

    cvs.width = 1920;
    cvs.height = 978;

    var ctx = cvs.getContext('2d');

    var maps = [];

    var cache = {}

    function checkIfBelongsToMandelbrotSet(x, y, maxIterations = 1000) {
        var realComponentOfResult = x;
        var imaginaryComponentOfResult = y;

        if ((typeof cache[y]) !== 'undefined' && (typeof cache[y][x]) !== 'undefined') {
            return cache[y][x];
        }

        for (var i = 0; i < maxIterations; i++) {
            // Calculate the real and imaginary components of the result
            // separately
            var tempRealComponent = realComponentOfResult * realComponentOfResult -
                imaginaryComponentOfResult * imaginaryComponentOfResult +
                x;

            var tempImaginaryComponent = 2 * realComponentOfResult * imaginaryComponentOfResult +
                y;

            realComponentOfResult = tempRealComponent;
            imaginaryComponentOfResult = tempImaginaryComponent;

            if (realComponentOfResult * realComponentOfResult + imaginaryComponentOfResult * imaginaryComponentOfResult > 2) {

                // console.log(typeof cache[y], cache);

                if ((typeof cache[y]) === 'undefined') {
                    cache[y] = {};
                }

                return cache[y][x] = i / maxIterations * 100;
            }
        }

        // console.log(typeof cache[y], cache);

        if ((typeof cache[y]) === 'undefined') {
            cache[y] = {};
        }

        return cache[y][x] = 0;
    }

    function renderMandel(ctx, magnif = 1000, centerX = 0, centerY = 0, startX = 0, startY = 0, width = cvs.width, height = cvs.height) {

        var realWidthHalf = width / magnif * 0.5;
        var realHeightHalf = height / magnif * 0.5;
        var maxIterations = Math.pow(50 * (Math.log10(magnif)), 1.25);

        // console.log(maxIterations);

        for (var y = 0; y < height; y++) {
            for (var x = 0; x < width; x++) {
                var belongsToSet =
                    checkIfBelongsToMandelbrotSet(
                        centerX - realWidthHalf + x / magnif,
                        centerY + realHeightHalf - y / magnif,
                        maxIterations
                    );

                // var rgb = belongsToSet / 100 * 0xFFFFFF >> 0;

                // var r = rgb >> 16 & 0XFF;
                // var g = rgb >> 8 & 0XFF;
                // var b = rgb >> 0 & 0XFF;

                ctx.fillStyle = 'hsl(0, 100%, ' + belongsToSet + '%)';
                ctx.fillRect(x + startX, y + startY, 1, 1);
            }
        }
    }

    function renderMinimap(
        index = 0,
        magnif = 30,
        centerX = 0,
        centerY = 0,
        startX = 0,
        startY = 0,
        width = 160,
        height = 90,
        hoverMangif = 1000,
        hoverCenterX = 0,
        hoverCenterY = 0,
        hoverWidth = 1,
        hoverHeight = 1
    ) {
        var smallestRegionRatio = 0.1;
        var ctx = null;
        var span = null;
        var li = null;

        if (maps.length <= index || typeof maps[index].ctx === 'undefined') {

            var miniCanvas = document.createElement('canvas');

            miniCanvas.width = width;
            miniCanvas.height = height;

            ctx = miniCanvas.getContext('2d');

            var miniCanvasEnlarge = document.createElement('canvas');
            $('#visual-container').append(miniCanvasEnlarge);
            $(miniCanvasEnlarge).hide();
        
            miniCanvasEnlarge.width = 1920;
            miniCanvasEnlarge.height = 978;
        
            var ctxLarge = miniCanvasEnlarge.getContext('2d');

            li = $('<li></li>');
            span = $('<span></span>');
            span.html(magnif);
            $('#maps-container').append(li.append(span).append(miniCanvas));

            li.data('largeCanvas', miniCanvasEnlarge);

            li.mouseover(function (e) {
                li.prev().toggleClass('nearby', true);
                li.next().toggleClass('nearby', true);

                $($(this).data('largeCanvas')).stop().fadeTo(400, Math.random() * 0.2 + 0.8);
            });

            li.mouseout(function (e) {
                li.prev().removeClass('nearby');
                li.next().removeClass('nearby');

                $($(this).data('largeCanvas')).stop().fadeTo(400, 0);
            });

            maps[index] = {
                cvs: miniCanvas,
                ctx: ctx,
                cvsLarge: miniCanvasEnlarge, 
                ctxLarge: ctxLarge,
            };
        } else {
            ctx = maps[index].ctx;
            ctxLarge = maps[index].ctxLarge;
            $(maps[index].cvs).parent().show();
            li = $(maps[index].cvs).parent();
            span = li.find('span').first();
        }

        renderMandel(ctx, magnif, centerX, centerY, 0, 0, width, height);

        // Draw Minimap Border

        // ctx.beginPath();
        // ctx.lineWidth = 1;
        // ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
        // ctx.strokeRect(startX, startY, width, height);

        // Focus region

        var hoverStartX;
        var hoverStartY;

        var strokeX;
        var strokeY;
        var strokeW;
        var strokeH;

        var nextMagnif = 0,
            nextMinimapNeeded = false;

        if (hoverWidth * magnif <= width * smallestRegionRatio || hoverHeight * magnif <= height * smallestRegionRatio) {
            nextMinimapNeeded = true;

            nextMagnif = magnif / smallestRegionRatio;

            span.html(nextMagnif);

            hoverStartX = hoverCenterX - (width / nextMagnif) * .5 - centerX
            hoverStartY = hoverCenterY + (height / nextMagnif) * .5 - centerY

            strokeX = width * .5 + hoverStartX * magnif;
            strokeY = height * .5 - hoverStartY * magnif;
            strokeW = width * smallestRegionRatio;
            strokeH = height * smallestRegionRatio;
        } else {
            nextMinimapNeeded = false;

            hoverStartX = hoverCenterX - hoverWidth * .5 - centerX
            hoverStartY = hoverCenterY + hoverHeight * .5 - centerY

            strokeX = width * .5 + hoverStartX * magnif;
            strokeY = height * .5 - hoverStartY * magnif;
            strokeW = hoverWidth * magnif;
            strokeH = hoverHeight * magnif;
        }

        if (strokeW <= 1) {
            strokeW = 1
        }

        if (strokeH <= 1) {
            strokeH = 1
        }

        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 0, 255, 1)';
        ctx.strokeRect(
            strokeX,
            strokeY,
            strokeW,
            strokeH
        );

        if (nextMinimapNeeded && nextMagnif) {

            renderMandel(ctxLarge, 1920 * magnif / width, centerX, centerY, 0, 0, 1920, 978);

            renderMinimap(index + 1, nextMagnif, hoverCenterX, hoverCenterY, startX, startY + height + 5, 160, 90, actualMangif, hoverX, hoverY, cvs.width / actualMangif, cvs.height / actualMangif);

            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
            ctx.moveTo(strokeX, strokeY + strokeH);
            ctx.lineTo(0, height);
            ctx.stroke();

            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
            ctx.moveTo(strokeX + strokeW, strokeY + strokeH);
            ctx.lineTo(width, height);
            ctx.stroke();

        } else {            
            for (var i = index + 1; i < maps.length; i++) {
                if (typeof maps[i].cvs !== 'undefined') {
                    $(maps[i].cvs).parent().hide();
                }
            }
        }

    }

    var actualMangif = 1000000000
    var mapMagnif = 30
    var hoverX = 0.3602404434376143
    var hoverY = 0.641313061064803

    renderMandel(ctx, actualMangif, hoverX, hoverY);

    renderMinimap(0, mapMagnif, 0, 0, 5, 5, 160, 90, actualMangif, hoverX, hoverY, cvs.width / actualMangif, cvs.height / actualMangif);

    $(document).keydown(function(e) {
        // Numpad +
        if (e.keyCode == 107) {
            actualMangif *= 2

            renderMandel(ctx, actualMangif, hoverX, hoverY);
            renderMinimap(0, mapMagnif, 0, 0, 5, 5, 160, 90, actualMangif, hoverX, hoverY, cvs.width / actualMangif, cvs.height / actualMangif);
        }

        // Numpad -
        if (e.keyCode == 109) {
            actualMangif *= 0.5

            renderMandel(ctx, actualMangif, hoverX, hoverY);
            renderMinimap(0, mapMagnif, 0, 0, 5, 5, 160, 90, actualMangif, hoverX, hoverY, cvs.width / actualMangif, cvs.height / actualMangif);
        }

        // ArrowUp
        if (e.keyCode == 38) {
            hoverY += 100 / actualMangif

            renderMandel(ctx, actualMangif, hoverX, hoverY);
            renderMinimap(0, mapMagnif, 0, 0, 5, 5, 160, 90, actualMangif, hoverX, hoverY, cvs.width / actualMangif, cvs.height / actualMangif);
        }

        // ArrowDown
        if (e.keyCode == 40) {
            hoverY -= 100 / actualMangif

            renderMandel(ctx, actualMangif, hoverX, hoverY);
            renderMinimap(0, mapMagnif, 0, 0, 5, 5, 160, 90, actualMangif, hoverX, hoverY, cvs.width / actualMangif, cvs.height / actualMangif);
        }

        // ArrowLeft
        if (e.keyCode == 37) {
            hoverX -= 100 / actualMangif

            renderMandel(ctx, actualMangif, hoverX, hoverY);
            renderMinimap(0, mapMagnif, 0, 0, 5, 5, 160, 90, actualMangif, hoverX, hoverY, cvs.width / actualMangif, cvs.height / actualMangif);
        }

        // ArrowRight
        if (e.keyCode == 39) {
            hoverX += 100 / actualMangif

            renderMandel(ctx, actualMangif, hoverX, hoverY);
            renderMinimap(0, mapMagnif, 0, 0, 5, 5, 160, 90, actualMangif, hoverX, hoverY, cvs.width / actualMangif, cvs.height / actualMangif);
        }
    });

})()