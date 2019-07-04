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

    function renderMandel(magnif = 1000, centerX = 0, centerY = 0, startX = 0, startY = 0, endX = cvs.width, endY = cvs.height) {
        var w = Math.abs(startX - endX)
        var h = Math.abs(startY - endY)

        var wHalf = w / magnif * 0.5;
        var hHalf = h / magnif * 0.5;

        for (var x = 0; x < w; x++) {
            for (var y = 0; y < h; y++) {
                var belongsToSet =
                    checkIfBelongsToMandelbrotSet(
                        - wHalf + centerX + x / magnif,
                        hHalf - centerY - y / magnif
                    );

                ctx.fillStyle = 'hsla(0, 100%, ' + belongsToSet + '%, 1)';
                ctx.fillRect(x + startX, y + startY, 1, 1);
            }
        }
    }

    renderMandel(1000, 0.3602404434376143, -0.641313061064803);

    - wHalf + centerX
    hHalf - centerY
    
    renderMandel(50, 0, 0, 5, 5, 165, 105);

    // Red rectangle
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.strokeRect(5, 5, 160, 100);

})()