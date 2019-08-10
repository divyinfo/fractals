const screenWidth = 1440;
const screenHeight = 821;

let canvas = new OffscreenCanvas(screenWidth, screenHeight);

canvas.width = screenWidth;
canvas.height = screenHeight;

let ctx = canvas.getContext('2d');

onmessage = function (e) {
    // console.log(
    //     'Message received from main script',
    //     'e.data.magnif', e.data.magnif,
    //     'e.data.centerX', e.data.centerX,
    //     'e.data.centerY', e.data.centerY,
    //     'e.data.width', e.data.width,
    //     'e.data.height', e.data.height,
    // );

    let ts = performance.now();
    
    let workerResult = getMandelCounts(e.data.magnif, e.data.centerX, e.data.centerY, e.data.width, e.data.height);

    let t = performance.now() - ts;

    // console.log('Posting message back to main script, operation took', t / 1000, 'seconds');

    postMessage(workerResult);

    workerResult = null;

    canvas = new OffscreenCanvas(screenWidth, screenHeight);

    canvas.width = screenWidth;
    canvas.height = screenHeight;
    
    ctx = canvas.getContext('2d');
}

function getIterationLimit(magnif) {
    // return Math.pow(50 * (Math.log10(magnif)), 1.25);
    return Math.pow(50 * (Math.log10(magnif)), 1.08);
}

function calcIterationCount(x, y, maxIterations = 1000) {
    let re = x;
    let im = y;

    let re2 = x * x;
    let im2 = y * y;

    for (let i = 0; i < maxIterations; i++) {            
        im = im * re;
        im = im + im + y;

        re = re2 - im2 + x;

        re2 = re * re;
        im2 = im * im;

        if (re2 + im2 > 4) {
            return i;
        }
    }

    return 0;
}

function getMandelCounts(magnif, centerX, centerY, width, height, max = null) {

    let maxIterations = max || getIterationLimit(magnif);
    let currentMaxIterations = 0;
    let currentMinIterations = maxIterations + 1;

    let realXStep = 1 / magnif;
    let realYStep = 1 / magnif;
    
    let realWHalf = width / magnif * 0.5;
    let realHHalf = height / magnif * 0.5;

    canvas.width = width;
    canvas.height = height;

    let img = ctx.createImageData(width, height);
    let imgShort = ctx.createImageData(width, height);
    
    let lastTS = performance.now();
    let countY = 0;

    let realY = realHHalf + centerY;

    for (let y = 0, iData = 0, iDataShort = 0; y < height; y++, countY++) {
        let realX = - realWHalf + centerX;

        if (performance.now() - lastTS > 500 && countY > 0) {
            postMessage({
                final: false,
                img: imgShort, 
                min: currentMinIterations,
                max: currentMaxIterations,
                magnif: magnif,
                centerX: centerX,
                centerY: centerY,
                width: width,
                height: height,
                partStartY: y - countY,
                partHeight: countY,
            });

            iDataShort = 0;

            lastTS = performance.now();
            countY = 0;
        }

        for (let x = 0; x < width; x++) {
            let iterationCount = calcIterationCount(realX, realY, maxIterations);

            if (iterationCount > currentMaxIterations) {
                currentMaxIterations = iterationCount;
            }

            if (iterationCount < currentMaxIterations) {
                currentMinIterations = iterationCount;
            }

            // var rgb = iterationCount / 100 * 0xFFFFFF >> 0;

            // var r = rgb >> 16 & 0XFF;
            // var g = rgb >> 8 & 0XFF;
            // var b = rgb >> 0 & 0XFF;

            // ctx.fillStyle = 'hsl(0, 100%, ' + iterationCount + '%)';
            // ctx.fillRect(x + startX, y + startY, 1, 1);

            let escapeRatio = iterationCount * 255 / maxIterations;

            img.data[iData++] = imgShort.data[iDataShort++] = escapeRatio;
            img.data[iData++] = imgShort.data[iDataShort++] = 0;
            img.data[iData++] = imgShort.data[iDataShort++] = 0;
            img.data[iData++] = imgShort.data[iDataShort++] = 255;

            realX += realXStep;
        }
        
        realY -= realYStep;
    }

    return {
        final: true,
        img: img, 
        min: currentMinIterations,
        max: currentMaxIterations,
        magnif: magnif,
        centerX: centerX,
        centerY: centerY,
        width: width,
        height: height,
    };
}