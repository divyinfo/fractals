(function () {
    var cvs = document.createElement('canvas');
    document.body.appendChild(cvs)

    cvs.width = 1920
    cvs.height = 978
    document.body.style.margin = 0

    var ctx = cvs.getContext('2d')

    function checkIfBelongsToMandelbrotSet(x, y) {
        var realComponentOfResult = x;
        var imaginaryComponentOfResult = y;
        var maxIterations = 100;

        for (var i = 0; i < maxIterations; i++) {
            // Calculate the real and imaginary components of the result
            // separately
            var tempRealComponent = realComponentOfResult * realComponentOfResult
                - imaginaryComponentOfResult * imaginaryComponentOfResult
                + x;

            var tempImaginaryComponent = 2 * realComponentOfResult * imaginaryComponentOfResult
                + y;

            realComponentOfResult = tempRealComponent;
            imaginaryComponentOfResult = tempImaginaryComponent;

            if (realComponentOfResult * realComponentOfResult + imaginaryComponentOfResult * imaginaryComponentOfResult > 2)
                return i / maxIterations * 100;
        }

        return 0;
    }

    function renderMandel(magnif = 1000, centerX = 0, centerY = 0, startX = 0, startY = 0, width = cvs.width, height = cvs.height) {

        var realWidthHalf = width / magnif * 0.5;
        var realHeightHalf = height / magnif * 0.5;

        for (var x = 0; x < width; x++) {
            for (var y = 0; y < height; y++) {
                var belongsToSet =
                    checkIfBelongsToMandelbrotSet(
                        centerX - realWidthHalf + x / magnif,
                        centerY + realHeightHalf - y / magnif
                    );

                ctx.fillStyle = 'hsla(0, 100%, ' + belongsToSet + '%, 1)';
                ctx.fillRect(x + startX, y + startY, 1, 1);
            }
        }
    }

    function renderMinimap(
        magnif = 30,
        centerX = 0,
        centerY = 0,
        startX = 5,
        startY = 5,
        width = 160,
        height = 90,
        hoverMangif = 1000,
        hoverCenterX = 0,
        hoverCenterY = 0,
        hoverWidth = 1,
        hoverHeight = 1
    ) {
        renderMandel(magnif, centerX, centerY, startX, startY, width, height);

        // Draw Minimap Border
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
        ctx.strokeRect(startX, startY, width, height);

        // Draw hover

        var hoverStartX = hoverCenterX - hoverWidth * .5 - centerX
        var hoverStartY = hoverCenterY + hoverHeight * .5 - centerY

        var strokeX = startX + width * .5 + hoverStartX * magnif;
        var strokeY = startY + height * .5 - hoverStartY * magnif;
        var strokeW = hoverWidth * magnif;
        var strokeH = hoverHeight * magnif;

        if (strokeX < startX) {
            strokeX = startX
        }

        if (strokeX > startX + width) {
            strokeX = startX + width
        }

        if (strokeY < startY) {
            strokeY = startY
        }

        if (strokeY > startY + width) {
            strokeY = startY + width
        }

        if (strokeX + strokeW > startX + width) {
            strokeW = startX + width - strokeX;
        }

        if (strokeY + strokeH > startY + height) {
            strokeH = startY + height - strokeY;
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

        if (strokeW <= width * .1 || strokeH <= height * .1) {
            renderMinimap(magnif * 10, hoverCenterX, hoverCenterY, startX, startY + height + 5, 160, 90, actualMangif, hoverX, hoverY, cvs.width / actualMangif, cvs.height / actualMangif);
            
            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
            ctx.moveTo(strokeX, strokeY);
            ctx.lineTo(startX, startY + height + 5);
            ctx.stroke();

            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
            ctx.moveTo(strokeX + strokeW, strokeY);
            ctx.lineTo(startX + width, startY + height + 5);
            ctx.stroke();
        }
    }

    var actualMangif = 10000
    var mapMagnif = 30
    var hoverX = 0.3602404434376143
    var hoverY = 0.641313061064803

    renderMandel(actualMangif, hoverX, hoverY);

    renderMinimap(mapMagnif, 0, 0, 5, 5, 160, 90, actualMangif, hoverX, hoverY, cvs.width / actualMangif, cvs.height / actualMangif);

    $(document).keydown(function (e) {
        // Numpad +
        if (e.keyCode == 107) {
            actualMangif *= 2

            renderMandel(actualMangif, hoverX, hoverY);
            renderMinimap(mapMagnif, 0, 0, 5, 5, 160, 90, actualMangif, hoverX, hoverY, cvs.width / actualMangif, cvs.height / actualMangif);
        }

        // Numpad -
        if (e.keyCode == 109) {
            actualMangif *= 0.5

            renderMandel(actualMangif, hoverX, hoverY);
            renderMinimap(mapMagnif, 0, 0, 5, 5, 160, 90, actualMangif, hoverX, hoverY, cvs.width / actualMangif, cvs.height / actualMangif);
        }

        // ArrowUp
        if (e.keyCode == 38) {
            hoverY += 100 / actualMangif
            
            renderMandel(actualMangif, hoverX, hoverY);
            renderMinimap(mapMagnif, 0, 0, 5, 5, 160, 90, actualMangif, hoverX, hoverY, cvs.width / actualMangif, cvs.height / actualMangif);
        }

        // ArrowDown
        if (e.keyCode == 40) {
            hoverY -= 100 / actualMangif
            
            renderMandel(actualMangif, hoverX, hoverY);
            renderMinimap(mapMagnif, 0, 0, 5, 5, 160, 90, actualMangif, hoverX, hoverY, cvs.width / actualMangif, cvs.height / actualMangif);
        }

        // ArrowLeft
        if (e.keyCode == 37) {
            hoverX -= 100 / actualMangif
            
            renderMandel(actualMangif, hoverX, hoverY);
            renderMinimap(mapMagnif, 0, 0, 5, 5, 160, 90, actualMangif, hoverX, hoverY, cvs.width / actualMangif, cvs.height / actualMangif);
        }

        // ArrowRight
        if (e.keyCode == 39) {
            hoverX += 100 / actualMangif
            
            renderMandel(actualMangif, hoverX, hoverY);
            renderMinimap(mapMagnif, 0, 0, 5, 5, 160, 90, actualMangif, hoverX, hoverY, cvs.width / actualMangif, cvs.height / actualMangif);
        }
    });

})()