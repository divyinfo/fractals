(function() {

    screenWidth = 1440;
    screenHeight = 821;

    var cvs = document.createElement('canvas');
    
    var cvsLargeCache = document.createElement('canvas');

    $('#visual-container').append(cvs);

    cvs.width = screenWidth;
    cvs.height = screenHeight;

    var ctx = cvs.getContext('2d');

    var cvsImg = null;
    var dragStartX = null;
    var dragStartY = null;
    var dragCurrentMouseX = null;
    var dragCurrentMouseY = null;
    var dragCurrentX = null;
    var dragCurrentY = null;
    var dragGlobalID = null;

    $('#visual-container').mousedown(function (e) {
        dragStartX = dragCurrentMouseX = e.offsetX;
        dragStartY = dragCurrentMouseY = e.offsetY;

        if (!dragGlobalID) {
            dragGlobalID = window.requestAnimationFrame(step);
            console.log('dragging start');
        }
    });

    function step(timestamp) {
        if (dragCurrentMouseX - dragStartX !== 0 || dragCurrentMouseY - dragStartY !== 0) {

            dragCurrentX += dragCurrentMouseX - dragStartX;
            dragCurrentY += dragCurrentMouseY - dragStartY;

            dragStartX = dragCurrentMouseX;
            dragStartY = dragCurrentMouseY;
    
            ctx.clearRect(0, 0, screenWidth, screenHeight);
            ctx.putImageData(cvsImg, dragCurrentX, dragCurrentY);
            // ctx.putImageData(cvsImg, dragCurrentX, dragCurrentY,
            //     dragCurrentX > 0 ? 0 : - dragCurrentX,
            //     dragCurrentY > 0 ? 0 : - dragCurrentY,
            //     dragCurrentX > 0 ? screenWidth - dragCurrentX : screenWidth + dragCurrentX,
            //     dragCurrentY > 0 ? screenHeight - dragCurrentY : screenHeight + dragCurrentY
            // );

            // hoverX += - dragCurrentX / actualMagif;
            // hoverY += dragCurrentY / actualMagif;

            for (let i = 0; i < maps.length; i++) {
                if ($(maps[i].cvs).parent().hasClass('shadow')) {

                    let ctx = maps[i].ctx;
                    let magnif = maps[i].magnif;
                    
                    let width = maps[i].cvs.width;
                    let height = maps[i].cvs.height;
                    
                    let hoverWidth = screenWidth / actualMagif;
                    let hoverHeight = screenHeight / actualMagif;

                    let hoverStartX = hoverX - (dragCurrentX - (screenWidth - cvsLargeCache.width) * .5 ) / actualMagif - hoverWidth * .5 - maps[i].centerX;
                    let hoverStartY = hoverY + (dragCurrentY - (screenHeight - cvsLargeCache.height) * .5 ) / actualMagif + hoverHeight * .5 - maps[i].centerY;
                    
                    strokeX = width * .5 + hoverStartX * magnif;
                    strokeY = height * .5 - hoverStartY * magnif;
                    strokeW = hoverWidth * magnif;
                    strokeH = hoverHeight * magnif;
                    
                    if (strokeW <= 1) {
                        strokeW = 1
                    }
                    
                    if (strokeH <= 1) {
                        strokeH = 1
                    }

                    let img = null;
                    if (typeof maps[i].img === 'undefined') {
                        img = maps[i].img = ctx.getImageData(0, 0, maps[i].cvs.width, maps[i].cvs.height);
                    } else {
                        img = maps[i].img;
                    }
                    
                    ctx.clearRect(0, 0, maps[i].cvs.width, maps[i].cvs.height);
                    ctx.putImageData(img, 0, 0);
            
                    ctx.beginPath();
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = 'rgba(255, 0, 255, 1)';
                    ctx.strokeRect(
                        strokeX,
                        strokeY,
                        strokeW,
                        strokeH
                    );

                    break;
                }
            }
        }

        dragGlobalID = window.requestAnimationFrame(step);
    }

    $('#visual-container').mousemove(function (e) {
        if (dragGlobalID) {
            dragCurrentMouseY = e.offsetY;
            dragCurrentMouseX = e.offsetX;
        }
    });

    $('#visual-container').mouseup(function (e) {
        if (e.which != 1) {
            return;
        }
        
        dragCurrentX += e.offsetX - dragStartX;
        dragCurrentY += e.offsetY - dragStartY;
        
        ctx.clearRect(0, 0, screenWidth, screenHeight);
        ctx.putImageData(cvsImg, dragCurrentX, dragCurrentY);
        // ctx.putImageData(
        //     cvsImg, dragCurrentX, dragCurrentY,
        //     dragCurrentX > 0 ? 0 : - dragCurrentX,
        //     dragCurrentY > 0 ? 0 : - dragCurrentY,
        //     dragCurrentX > 0 ? screenWidth - dragCurrentX : screenWidth + dragCurrentX,
        //     dragCurrentY > 0 ? screenHeight - dragCurrentY : screenHeight + dragCurrentY
        // );

        window.cancelAnimationFrame(dragGlobalID);
        dragGlobalID = null;

        // console.log('dragging stop', hoverX, hoverY);

        // hoverX += - dragCurrentX / actualMagif;
        // hoverY += dragCurrentY / actualMagif;

        // dragCurrentX = 0;
        // dragCurrentY = 0;

        // window.requestAnimationFrame(function(timestamp) {
        //     console.log("requestAnimationFrame", timestamp);

        //     hoverX += - dragCurrentX / actualMagif;
        //     hoverY += dragCurrentY / actualMagif;
    
        //     renderMandel(ctx, actualMagif, hoverX, hoverY);
        //     cvsImg = ctx.getImageData(0, 0, screenWidth, screenHeight);
        //     renderMinimap(0, mapMagnif, 0, 0, 160, 90, actualMagif, hoverX, hoverY, screenWidth / actualMagif, screenHeight / actualMagif);
    
        //     dragCurrentX = 0;
        //     dragCurrentY = 0;
        // });

    });

    var cvsMinimap = document.createElement('canvas');
    $('#visual-container').append(cvsMinimap);
    $(cvsMinimap).hide();

    cvsMinimap.width = screenWidth;
    cvsMinimap.height = screenHeight;

    var ctxMinimap = cvsMinimap.getContext('2d');

    var maps = [];

    var cache = {}

    function checkIfBelongsToMandelbrotSet(x, y, maxIterations = 1000) {
        var realComponentOfResult = x;
        var imaginaryComponentOfResult = y;

        // if ((typeof cache[y]) !== 'undefined' && (typeof cache[y][x]) !== 'undefined') {
        //     return cache[y][x];
        // }

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

                // if ((typeof cache[y]) === 'undefined') {
                //     cache[y] = {};
                // }

                // return cache[y][x] = i / maxIterations * 100;
                
                return i / maxIterations * 100;
            }
        }

        // console.log(typeof cache[y], cache);

        if ((typeof cache[y]) === 'undefined') {
            cache[y] = {};
        }

        return cache[y][x] = 0;
    }

    function renderMandel(ctx, magnif = 1000, centerX = 0, centerY = 0, startX = 0, startY = 0, width = screenWidth, height = screenHeight) {

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

                if (e.which != 1) {
                    return;
                }

                var offsetX = e.offsetX;
                var offsetY = e.offsetY;

                var offsetOfCenterX = offsetX - e.target.width * .5;
                var offsetOfCenterY = offsetY - e.target.height * .5;

                var mapIndex = $(e.target).parent().data('mapIndex');

                if (typeof mapIndex !== 'undefined' && maps.length > mapIndex) {

                    hoverX = offsetOfCenterX / maps[mapIndex].magnif + maps[mapIndex].centerX;
                    hoverY = - offsetOfCenterY / maps[mapIndex].magnif + maps[mapIndex].centerY;

                    if (maps.length > mapIndex + 1) {
                        var magnif = screenWidth * (maps[mapIndex + 1].magnif * .2) / width;
                        
                        actualMagif = magnif;
                        
                        renderMandel(cvs.getContext('2d'), actualMagif, hoverX, hoverY);
                        cvsImg = cvs.getContext('2d').getImageData(0, 0, screenWidth, screenHeight);
                        renderMinimap(0, mapMagnif, 0, 0, 160, 90, actualMagif, hoverX, hoverY, screenWidth / actualMagif, screenHeight / actualMagif);
                    } else {
                        renderMandel(cvs.getContext('2d'), actualMagif, hoverX, hoverY);
                        cvsImg = cvs.getContext('2d').getImageData(0, 0, screenWidth, screenHeight);
                        renderMinimap(0, mapMagnif, 0, 0, 160, 90, actualMagif, hoverX, hoverY, screenWidth / actualMagif, screenHeight / actualMagif);
                    }

                    console.log(
                        'magnif', magnif,
                        'mapIndex', mapIndex,
                        'offsetOfCenterX', offsetOfCenterX,
                        'offsetOfCenterY', offsetOfCenterY,
                        'newX', hoverX,
                        'newY', hoverY,
                        'screenWidth / magnif', screenWidth / magnif,
                        'screenHeight / magnif', screenHeight / magnif
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
        maps[index].img = ctx.getImageData(0, 0, width, height);

        renderMandel(ctxMinimap, screenWidth * magnif / width, centerX, centerY, 0, 0, screenWidth, screenHeight);
       
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

        var magnifBigCanvas = screenWidth * magnif / width;

        if (nextMinimapNeeded) {
            var nextMagnifBigCanvas = magnifBigCanvas / smallestRegionRatio;

            hoverStartX = hoverCenterX - (screenWidth / nextMagnifBigCanvas) * .5 - centerX
            hoverStartY = hoverCenterY + (screenHeight / nextMagnifBigCanvas) * .5 - centerY

            strokeX = screenWidth * .5 + hoverStartX * (magnifBigCanvas);
            strokeY = screenHeight * .5 - hoverStartY * (magnifBigCanvas);
            strokeW = screenWidth * smallestRegionRatio;
            strokeH = screenHeight * smallestRegionRatio;
        } else {
            hoverStartX = hoverCenterX - hoverWidth * .5 - centerX
            hoverStartY = hoverCenterY + hoverHeight * .5 - centerY

            strokeX = screenWidth * .5 + hoverStartX * magnifBigCanvas;
            strokeY = screenHeight * .5 - hoverStartY * magnifBigCanvas;
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

        var imageDataMinimapLarge = ctxMinimap.getImageData(0, 0, screenWidth, screenHeight);
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

            renderMinimap(index + 1, nextMagnif, hoverCenterX, hoverCenterY, 160, 90, hoverMagif, hoverX, hoverY, screenWidth / hoverMagif, screenHeight / hoverMagif);

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
                    $(maps[i].cvs).parent().removeClass('shadow');
                }
            }

            // Draw highlight on the last minimap

            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
            ctx.strokeRect(0, 0, width, height);

            $(maps[index].cvs).parent().toggleClass('shadow', true);

            cvsLargeCache.width = screenWidth * 3;
            cvsLargeCache.height = screenHeight * 3;

            renderMandel(
                cvsLargeCache.getContext('2d'), actualMagif,
                hoverX,
                hoverY,
                0,
                0,
                cvsLargeCache.width,
                cvsLargeCache.height
            );

            cvsImg = cvsLargeCache.getContext('2d').getImageData(
                0,
                0,
                cvsLargeCache.width,
                cvsLargeCache.height
            );

            dragCurrentX = (screenWidth - cvsLargeCache.width) * .5;
            dragCurrentY = (screenHeight - cvsLargeCache.height) * .5;
        }

    }

    $(document).mouseup(function (e) {
        var targetIndex = $(e.target).parent().data('mapIndex');
        if (typeof targetIndex !== 'undefined') {
            // console.log('up', targetIndex);
        }
    });

    var actualMagif = 1000000000
    var mapMagnif = 30
    var hoverX = 0.3602404434376143632361252444495453084826078079585857504883758147401953460592;
    var hoverY = 0.6413130610648031748603750151793020665794949522823052595561775430644485741727;

    console.log(hoverX, hoverY);

    renderMandel(ctx, actualMagif, hoverX, hoverY);
    cvsImg = ctx.getImageData(0, 0, screenWidth, screenHeight);
    renderMinimap(0, mapMagnif, 0, 0, 160, 90, actualMagif, hoverX, hoverY, screenWidth / actualMagif, screenHeight / actualMagif);

    $(document).keydown(function(e) {
        // Numpad +
        if (e.keyCode == 107 || e.keyCode == 187) {
            actualMagif *= 2

            renderMandel(ctx, actualMagif, hoverX, hoverY);
            cvsImg = ctx.getImageData(0, 0, screenWidth, screenHeight);
            renderMinimap(0, mapMagnif, 0, 0, 160, 90, actualMagif, hoverX, hoverY, screenWidth / actualMagif, screenHeight / actualMagif);
        }

        // Numpad -
        if (e.keyCode == 109 || e.keyCode == 189) {
            actualMagif *= 0.5

            renderMandel(ctx, actualMagif, hoverX, hoverY);
            cvsImg = ctx.getImageData(0, 0, screenWidth, screenHeight);
            renderMinimap(0, mapMagnif, 0, 0, 160, 90, actualMagif, hoverX, hoverY, screenWidth / actualMagif, screenHeight / actualMagif);
        }

        // ArrowUp
        if (e.keyCode == 38) {
            hoverY += 100 / actualMagif

            renderMandel(ctx, actualMagif, hoverX, hoverY);
            cvsImg = ctx.getImageData(0, 0, screenWidth, screenHeight);
            renderMinimap(0, mapMagnif, 0, 0, 160, 90, actualMagif, hoverX, hoverY, screenWidth / actualMagif, screenHeight / actualMagif);
        }

        // ArrowDown
        if (e.keyCode == 40) {
            hoverY -= 100 / actualMagif

            renderMandel(ctx, actualMagif, hoverX, hoverY);
            cvsImg = ctx.getImageData(0, 0, screenWidth, screenHeight);
            renderMinimap(0, mapMagnif, 0, 0, 160, 90, actualMagif, hoverX, hoverY, screenWidth / actualMagif, screenHeight / actualMagif);
        }

        // ArrowLeft
        if (e.keyCode == 37) {
            hoverX -= 100 / actualMagif

            renderMandel(ctx, actualMagif, hoverX, hoverY);
            cvsImg = ctx.getImageData(0, 0, screenWidth, screenHeight);
            renderMinimap(0, mapMagnif, 0, 0, 160, 90, actualMagif, hoverX, hoverY, screenWidth / actualMagif, screenHeight / actualMagif);
        }

        // ArrowRight
        if (e.keyCode == 39) {
            hoverX += 100 / actualMagif

            renderMandel(ctx, actualMagif, hoverX, hoverY);
            cvsImg = ctx.getImageData(0, 0, screenWidth, screenHeight);
            renderMinimap(0, mapMagnif, 0, 0, 160, 90, actualMagif, hoverX, hoverY, screenWidth / actualMagif, screenHeight / actualMagif);
        }
    });

})()