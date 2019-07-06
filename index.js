(function() {

    var cvs = document.createElement('canvas');
    $('#visual-container').append(cvs);

    cvs.width = 1920;
    cvs.height = 978;

    var ctx = cvs.getContext('2d');

    var cvsMinimap = document.createElement('canvas');
    $('#visual-container').append(cvsMinimap);
    $(cvsMinimap).hide();

    cvsMinimap.width = 1920;
    cvsMinimap.height = 978;

    var ctxMinimap = cvsMinimap.getContext('2d');

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

    function renderMandel(ctx, magnif = 1000, centerX = 0, centerY = 0, startX = 0, startY = 0, width = 1920, height = 978) {

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
        width = 160,
        height = 90,
        hoverMagif = 1000,
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

            var cvsMinimapSmall = document.createElement('canvas');

            cvsMinimapSmall.width = width;
            cvsMinimapSmall.height = height;

            ctx = cvsMinimapSmall.getContext('2d');

            li = $('<li></li>');
            span = $('<span></span>');
            span.html(magnif);
            $('#maps-container').append(li.append(span).append(cvsMinimapSmall));

            li.data('mapIndex', index);

            li.mouseover(function (e) {
                li.prev().toggleClass('nearby', true);
                li.next().toggleClass('nearby', true);

                ctxMinimap.putImageData(maps[li.data('mapIndex')].imgLarge, 0, 0);
                $(cvsMinimap).stop().fadeTo(400, Math.random() * 0.2 + 0.8);
            });

            li.mouseout(function (e) {
                li.prev().removeClass('nearby');
                li.next().removeClass('nearby');

                ctxMinimap.putImageData(maps[li.data('mapIndex')].imgLarge, 0, 0);
                $(cvsMinimap).stop().fadeTo(400, 0);
            });

            $(cvsMinimapSmall).mousedown(function (e) {
                // console.log('down', e);

                var offsetX = e.offsetX;
                var offsetY = e.offsetY;

                var offsetOfCenterX = offsetX - e.target.width * .5;
                var offsetOfCenterY = offsetY - e.target.height * .5;

                var mapIndex = $(e.target).parent().data('mapIndex');

                if (typeof mapIndex !== 'undefined' && maps.length > mapIndex) {

                    hoverX = offsetOfCenterX / maps[mapIndex].magnif + maps[mapIndex].centerX;
                    hoverY = - offsetOfCenterY / maps[mapIndex].magnif + maps[mapIndex].centerY;

                    if (maps.length > mapIndex + 1) {
                        var magnif = 1920 * (maps[mapIndex + 1].magnif * .2) / width;
                        
                        actualMangif = magnif;
                        
                        renderMandel(cvs.getContext('2d'), actualMangif, hoverX, hoverY);
                        renderMinimap(0, mapMagnif, 0, 0, 160, 90, actualMangif, hoverX, hoverY, 1920 / actualMangif, 978 / actualMangif);
                    } else {
                        renderMandel(cvs.getContext('2d'), actualMangif, hoverX, hoverY);
                        renderMinimap(0, mapMagnif, 0, 0, 160, 90, actualMangif, hoverX, hoverY, 1920 / actualMangif, 978 / actualMangif);
                    }

                    console.log(
                        'magnif', magnif,
                        'mapIndex', mapIndex,
                        'offsetOfCenterX', offsetOfCenterX,
                        'offsetOfCenterY', offsetOfCenterY,
                        'newX', hoverX,
                        'newY', hoverY,
                        '1920 / magnif', 1920 / magnif,
                        '978 / magnif', 978 / magnif
                    );
                }
            });

            maps[index] = {
                cvs: cvsMinimapSmall,
                ctx: ctx,
                magnif: magnif,
                centerX: centerX,
                centerY: centerY,
            };
        } else {
            ctx = maps[index].ctx;
            $(maps[index].cvs).parent().show();
            li = $(maps[index].cvs).parent();
            span = li.find('span').first();

            maps[index].magnif = magnif;
            maps[index].centerX = centerX;
            maps[index].centerY = centerY;
        }

        console.log(
            'Rendering minimap', index,
            'ctx', ctx,
            'magnif', magnif,
            'centerX', centerX,
            'centerY', centerY,
            'startX', 0,
            'startY', 0,
            'width', width,
            'height', height
        );

        renderMandel(ctx, magnif, centerX, centerY, 0, 0, width, height);
        renderMandel(ctxMinimap, 1920 * magnif / width, centerX, centerY, 0, 0, 1920, 978);
       
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

        // Draw hover rect on big canvas of minimap

        // console.log('hoverWidth * magnif', hoverWidth * magnif, 'width * smallestRegionRatio', width * smallestRegionRatio, 'new needed, next one will be', magnif / smallestRegionRatio);

        if (hoverWidth * magnif <= width * smallestRegionRatio || hoverHeight * magnif <= height * smallestRegionRatio) {
            nextMinimapNeeded = true;
            nextMagnif = magnif / smallestRegionRatio;
        } else {
            nextMinimapNeeded = false;
        }

        var magnifBigCanvas = 1920 * magnif / width;

        if (nextMinimapNeeded) {
            var nextMagnifBigCanvas = magnifBigCanvas / smallestRegionRatio;

            hoverStartX = hoverCenterX - (1920 / nextMagnifBigCanvas) * .5 - centerX
            hoverStartY = hoverCenterY + (978 / nextMagnifBigCanvas) * .5 - centerY

            strokeX = 1920 * .5 + hoverStartX * (magnifBigCanvas);
            strokeY = 978 * .5 - hoverStartY * (magnifBigCanvas);
            strokeW = 1920 * smallestRegionRatio;
            strokeH = 978 * smallestRegionRatio;
        } else {
            hoverStartX = hoverCenterX - hoverWidth * .5 - centerX
            hoverStartY = hoverCenterY + hoverHeight * .5 - centerY

            strokeX = 1920 * .5 + hoverStartX * magnifBigCanvas;
            strokeY = 978 * .5 - hoverStartY * magnifBigCanvas;
            strokeW = hoverWidth * magnifBigCanvas;
            strokeH = hoverHeight * magnifBigCanvas;
        }

        if (strokeW <= 1) {
            strokeW = 1
        }

        if (strokeH <= 1) {
            strokeH = 1
        }

        ctxMinimap.beginPath();
        ctxMinimap.lineWidth = 1;
        ctxMinimap.strokeStyle = 'rgba(255, 0, 255, 1)';
        ctxMinimap.strokeRect(
            strokeX,
            strokeY,
            strokeW,
            strokeH
        );

        var imageDataMinimapLarge = ctxMinimap.getImageData(0, 0, 1920, 978);
        // ctxMinimap.putImageData(imageDataMinimapLarge, 0, 0);
        maps[index].imgLarge = imageDataMinimapLarge;

        // Draw hover rect on small canvas of minimap

        if (nextMinimapNeeded) {
            hoverStartX = hoverCenterX - (width / nextMagnif) * .5 - centerX
            hoverStartY = hoverCenterY + (height / nextMagnif) * .5 - centerY

            strokeX = width * .5 + hoverStartX * magnif;
            strokeY = height * .5 - hoverStartY * magnif;
            strokeW = width * smallestRegionRatio;
            strokeH = height * smallestRegionRatio;
        } else {
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

        if (nextMinimapNeeded) {
            span.html(nextMagnif);
        }

        if (nextMinimapNeeded && nextMagnif) {

            console.log('Rendering next map', index + 1, 'current magnif', magnif, 'next magnif', nextMagnif);

            renderMinimap(index + 1, nextMagnif, hoverCenterX, hoverCenterY, 160, 90, hoverMagif, hoverX, hoverY, 1920 / hoverMagif, 978 / hoverMagif);

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
                console.log('Hiding', i);
                if (typeof maps[i].cvs !== 'undefined') {
                    $(maps[i].cvs).parent().hide();
                }
            }

            // Draw highlight on the last minimap

            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
            ctx.strokeRect(0, 0, width, height);
        }

    }

    $(document).mouseup(function (e) {
        var targetIndex = $(e.target).parent().data('mapIndex');
        if (typeof targetIndex !== 'undefined') {
            // console.log('up', targetIndex);
        }
    });

    var actualMangif = 1000000000
    var mapMagnif = 30
    var hoverX = 0.3602404434376143632361252444495453084826078079585857504883758147401953460592;
    var hoverY = 0.6413130610648031748603750151793020665794949522823052595561775430644485741727;

    console.log(hoverX, hoverY);

    renderMandel(ctx, actualMangif, hoverX, hoverY);
    renderMinimap(0, mapMagnif, 0, 0, 160, 90, actualMangif, hoverX, hoverY, 1920 / actualMangif, 978 / actualMangif);

    $(document).keydown(function(e) {
        // Numpad +
        if (e.keyCode == 107) {
            actualMangif *= 2

            renderMandel(ctx, actualMangif, hoverX, hoverY);
            renderMinimap(0, mapMagnif, 0, 0, 160, 90, actualMangif, hoverX, hoverY, 1920 / actualMangif, 978 / actualMangif);
        }

        // Numpad -
        if (e.keyCode == 109) {
            actualMangif *= 0.5

            renderMandel(ctx, actualMangif, hoverX, hoverY);
            renderMinimap(0, mapMagnif, 0, 0, 160, 90, actualMangif, hoverX, hoverY, 1920 / actualMangif, 978 / actualMangif);
        }

        // ArrowUp
        if (e.keyCode == 38) {
            hoverY += 100 / actualMangif

            renderMandel(ctx, actualMangif, hoverX, hoverY);
            renderMinimap(0, mapMagnif, 0, 0, 160, 90, actualMangif, hoverX, hoverY, 1920 / actualMangif, 978 / actualMangif);
        }

        // ArrowDown
        if (e.keyCode == 40) {
            hoverY -= 100 / actualMangif

            renderMandel(ctx, actualMangif, hoverX, hoverY);
            renderMinimap(0, mapMagnif, 0, 0, 160, 90, actualMangif, hoverX, hoverY, 1920 / actualMangif, 978 / actualMangif);
        }

        // ArrowLeft
        if (e.keyCode == 37) {
            hoverX -= 100 / actualMangif

            renderMandel(ctx, actualMangif, hoverX, hoverY);
            renderMinimap(0, mapMagnif, 0, 0, 160, 90, actualMangif, hoverX, hoverY, 1920 / actualMangif, 978 / actualMangif);
        }

        // ArrowRight
        if (e.keyCode == 39) {
            hoverX += 100 / actualMangif

            renderMandel(ctx, actualMangif, hoverX, hoverY);
            renderMinimap(0, mapMagnif, 0, 0, 160, 90, actualMangif, hoverX, hoverY, 1920 / actualMangif, 978 / actualMangif);
        }
    });

})()