(function() {

    Decimal.set({ precision: 256 });

    let screenWidth = 1920;
    let screenHeight = 978;

    let cvsMain = document.createElement('canvas');

    $('#visual-container').append(cvsMain);

    cvsMain.width = screenWidth;
    cvsMain.height = screenHeight;

    let ctxMain = cvsMain.getContext('2d');

    let magifMain = 1000000000;
    // let magifMain = 10000000000000000000;
    let magifMainMaxIterations = getMaxIterations(magifMain);
    
    // let hoverX = new Decimal('0.3602404434376143632361252444495453084826078079585857504883758147401953460592');
    // let hoverY = new Decimal('0.6413130610648031748603750151793020665794949522823052595561775430644485741727');

    let hoverX = 0.3602404434376143632361252444495453084826078079585857504883758147401953460592;
    let hoverY = 0.6413130610648031748603750151793020665794949522823052595561775430644485741727;

    // let hoverX = 0;
    // let hoverY = 0;

    let iterations = [];

    console.log(
        'magifMainMaxIterations', magifMainMaxIterations,
        'hoverX', hoverX,
        'hoverY', hoverY
    );

    let sftXn = [];
    let sftAn = [];
    let sftBn = [];
    let sftCn = [];
    let sftDn = [];

    let sftXnMaxIterations = null;

    // renderMandel(ctxMain, magifMain, hoverX, hoverY);
    // renderMandelSFT(ctxMain, magifMain, hoverX, hoverY);
    
    // Delta{n} = A{n} * d1 + B{n} * d0^2 + C{n} * d0^3 + o(d0^4)
    // A{n+1} = 2 * X{n} * A{n} + 1
    // B{n+1} = 2 * X{n} * B{n} + A{n}^2
    // C{n+1} = 2 * X{n} * C{n} + 2 * A{n} * B{n}
    
    function sftInit(x, y, maxIterations) {
        // let Xn_re = new Decimal(x);
        // let Xn_im = new Decimal(y);
        
        // let An_re = new Decimal(1);
        // let An_im = new Decimal(0);

        // let Bn_re = new Decimal(0);
        // let Bn_im = new Decimal(0);

        // let Cn_re = new Decimal(0);
        // let Cn_im = new Decimal(0);

        let Xn_re = x;
        let Xn_im = y;
        
        let An_re = 1;
        let An_im = 0;

        let Bn_re = 0;
        let Bn_im = 0;

        let Cn_re = 0;
        let Cn_im = 0;

        for (let i = 0; i < maxIterations; i++) {
            // let Xn_re_next = Xn_re.mul(Xn_re).sub(Xn_im.mul(Xn_im)).add(x);
            // let Xn_im_next = Xn_re.mul(Xn_im).mul(2).add(y);
            // let Xn_norm = Xn_re.mul(Xn_re).add(Xn_im.mul(Xn_im));

            // let An_re_next = (Xn_re.mul(An_re).sub(Xn_im.mul(An_im))).mul(2).add(1);
            // let An_im_next = (Xn_im.mul(An_re).add(Xn_re.mul(An_im))).mul(2);

            // let Bn_re_next = Xn_re.mul(Bn_re).sub(Xn_im.mul(Bn_im)).mul(2).add(An_re.mul(An_re).sub(An_im.mul(An_im)));
            // let Bn_im_next = Xn_im.mul(Bn_re).add(Xn_re.mul(Bn_im)).mul(2).add(An_re.mul(An_im).mul(2));

            // let Cn_re_next = Xn_re.mul(Cn_re).sub(Xn_im.mul(Cn_im)).add(An_re.mul(Bn_re)).sub(An_im.mul(Bn_im)).mul(2);
            // let Cn_im_next = Xn_im.mul(Cn_re).add(Xn_re.mul(Cn_im)).add(An_im.mul(Bn_re)).add(An_re.mul(Bn_im)).mul(2);

            let Xn_re_next = Xn_re * Xn_re - Xn_im * Xn_im + x;
            let Xn_im_next = 2 * Xn_re * Xn_im + y;
            let Xn_norm = Xn_re_next * Xn_re_next + Xn_im_next * Xn_im_next;

            let An_re_next = 2 * (Xn_re * An_re - Xn_im * An_im) + 1;
            let An_im_next = 2 * (Xn_im * An_re + Xn_re * An_im);

            let Bn_re_next = 2 * (Xn_re * Bn_re - Xn_im * Bn_im) + An_re * An_re - An_im * An_im;
            let Bn_im_next = 2 * (Xn_im * Bn_re + Xn_re * Bn_im) + 2 * An_re * An_im;

            let Cn_re_next = 2 * (Xn_re * Cn_re - Xn_im * Cn_im + An_re * Bn_re - An_im * Bn_im);
            let Cn_im_next = 2 * (Xn_im * Cn_re + Xn_re * Cn_im + An_im * Bn_re + An_re * Bn_im);

            Xn_re = Xn_re_next;
            Xn_im = Xn_im_next;

            An_re = An_re_next;
            An_im = An_im_next;

            Bn_re = Bn_re_next;
            Bn_im = Bn_im_next;

            Cn_re = Cn_re_next;
            Cn_im = Cn_im_next;

            if (!isFinite(Xn_re) ||
                !isFinite(Xn_im) ||
                !isFinite(An_re) ||
                !isFinite(An_im) ||
                !isFinite(Bn_re) ||
                !isFinite(Bn_im) ||
                !isFinite(Cn_re) ||
                !isFinite(Cn_im)
            ) {
                break;
            }

            // if (Xn_norm.gt(4)) {
            //     break;
            // }
            
            if (Xn_norm > 4) {
                break;
            }

            sftXnMaxIterations = i;

            sftXn[i] = {
                re: Xn_re_next,
                im: Xn_im_next,
                norm: Xn_norm,
                // normStr: Xn_norm.toString(),
            };

            sftAn[i] = {
                re: An_re_next,
                im: An_im_next,
            };

            sftBn[i] = {
                re: Bn_re_next,
                im: Bn_im_next,
            };

            sftCn[i] = {
                re: Cn_re_next,
                im: Cn_im_next,
            };
        }
    }

    sftInit(hoverX, hoverY, magifMainMaxIterations);

    console.log('sftXn', sftXn);
    console.log('sftAn', sftAn);
    console.log('sftBn', sftBn);
    console.log('sftCn', sftCn);
    console.log('sftDn', sftDn);

    renderMandelSFT(ctxMain, magifMain, hoverX, hoverY);

    console.log('sftDn', sftDn);

    // Delta{n} = A{n} * d1 + B{n} * d0^2 + C{n} * d0^3 + o(d0^4)
    // Delta{n} = A{n} * d1 + B{n} * d2 + C{n} * d3 + o(d0^4)

    function sftGetIterations(x, y, d1, d2, d3, maxIterations) {
        let searchStart = 0;
        let searchEnd = sftXnMaxIterations;
        let searchCenter = searchStart + searchEnd >> 1;
        
        let DeltaCurrentIterations_re;
        let DeltaCurrentIterations_im;
        
        let DestX;
        let DestY;
        let DestNorm;

        DeltaCurrentIterations_re = sftAn[searchEnd].re * d1.re - sftAn[searchEnd].im * d1.im;
        DeltaCurrentIterations_im = sftAn[searchEnd].im * d1.re + sftAn[searchEnd].re * d1.im;

        DeltaCurrentIterations_re += sftBn[searchEnd].re * d2.re - sftBn[searchEnd].im * d2.im;
        DeltaCurrentIterations_im += sftBn[searchEnd].im * d2.re + sftBn[searchEnd].re * d2.im;

        DeltaCurrentIterations_re += sftCn[searchEnd].re * d3.re - sftCn[searchEnd].im * d3.im;
        DeltaCurrentIterations_im += sftCn[searchEnd].im * d3.re + sftCn[searchEnd].re * d3.im;
        
        DestY = DeltaCurrentIterations_im + y;
        DestX = DeltaCurrentIterations_re + x;
        DestNorm = DestX * DestX + DestY * DestY;

        if (DestNorm <= 4) {
            
            // TODO: Step up
            // Maybe: Update Xn

            console.log('Stepping up with', DestX, DestY);

            return searchEnd;
        }

        while (true) {

            // console.log('searching', searchCenter);

            DeltaCurrentIterations_re = sftAn[searchCenter].re * d1.re - sftAn[searchCenter].im * d1.im;
            DeltaCurrentIterations_im = sftAn[searchCenter].im * d1.re + sftAn[searchCenter].re * d1.im;
    
            DeltaCurrentIterations_re += sftBn[searchCenter].re * d2.re - sftBn[searchCenter].im * d2.im;
            DeltaCurrentIterations_im += sftBn[searchCenter].im * d2.re + sftBn[searchCenter].re * d2.im;
    
            DeltaCurrentIterations_re += sftCn[searchCenter].re * d3.re - sftCn[searchCenter].im * d3.im;
            DeltaCurrentIterations_im += sftCn[searchCenter].im * d3.re + sftCn[searchCenter].re * d3.im;
            
            DestY = DeltaCurrentIterations_im + y;
            DestX = DeltaCurrentIterations_re + x;
            DestNorm = DestX * DestX + DestY * DestY;

            if (DestNorm > 4) {
                if (searchStart < searchCenter) {
                    searchEnd = searchCenter;
                    searchCenter = searchStart + searchEnd >> 1;
                } else {
                    return searchStart > 0 ? searchStart : 0;
                }
            } else {
                if (searchStart < searchCenter) {
                    searchStart = searchCenter;
                    searchCenter = searchStart + searchEnd >> 1;
                } else {
                    return searchEnd;
                }
            }
        }
    }

    function renderMandelSFT(ctx, magnif = 1000, centerX = 0, centerY = 0, startX = 0, startY = 0, width = null, height = null) {

        if (!width) {
            width = ctx.canvas.width;
        }

        if (!height) {
            height = ctx.canvas.height;
        }

        let maxX = startX + width;
        let maxY = startY + height;

        if (maxX > ctx.canvas.width) {
            maxX = ctx.canvas.width;
        }

        if (maxY > ctx.canvas.height) {
            maxY = ctx.canvas.height;
        }

        let realWidthHalf = ctx.canvas.width / magnif * 0.5;
        let realHeightHalf = ctx.canvas.height / magnif * 0.5;

        let maxIterations = getMaxIterations(magnif);

        console.log('Rendering magnif by SFT', magnif, 'with max iterations', maxIterations);

        let pixelCounter = 0;

        for (var y = startY; y <= maxY; y++) {
            for (var x = startX; x <= maxX; x++) {

                let dx = - realWidthHalf + x / magnif;
                let dy = - realHeightHalf + y / magnif;

                let dx2 = dx * dx - dy * dy;
                let dy2 = dx * dy * 2;

                let dx3 = dx2 * dx - dy2 * dy;
                let dy3 = dx2 * dy + dy2 * dx;

                let d1 = {
                    re: dx, 
                    im: dy, 
                };

                let d2 = {
                    re: dx2, 
                    im: dy2, 
                };

                let d3 = {
                    re: dx3, 
                    im: dy3, 
                };


                let iterations = sftGetIterations(centerX, centerY, d1, d2, d3, maxIterations);

                // console.log('Pixel final iterations', iterations);

                sftDn.push({
                    d1: d1,
                    d2: d2,
                    d3: d3,
                });

                // let rgb = belongsToSet / 100 * 0xFFFFFF >> 0;

                // let r = rgb >> 16 & 0XFF;
                // let g = rgb >> 8 & 0XFF;
                // let b = rgb >> 0 & 0XFF;

                let belongsToSet = 0;

                ctx.fillStyle = 'hsl(0, 100%, ' + (iterations * 100 / maxIterations) + '%)';
                ctx.fillRect(x, y, 1, 1);

                pixelCounter ++;
            }
        }

        console.log('No. of pixels rendered by SFT:', pixelCounter);
    }

    function getMaxIterations(magnif) {
        return Math.round(Math.pow(50 * (Math.log10(magnif)), 1.25));
    }

    function belongsToMandel(x, y, maxIterations) {
        let re = new Decimal(x);
        let im = new Decimal(y);

        let re2 = x.mul(x);
        let im2 = y.mul(y);

        for (let i = 0; i < maxIterations; i++) {            
            im = im.mul(re);
            im = im.add(im).add(y);

            re = re2.sub(im2).add(x);

            re2 = re.mul(re);
            im2 = im.mul(im);

            if (re2.add(im2).gt(4)) {
                return i;
            }
        }

        return 0;
    }

    function renderMandel(ctx, magnif = 1000, centerX = 0, centerY = 0, startX = 0, startY = 0, width = null, height = null) {

        if (!width) {
            width = ctx.canvas.width;
        }

        if (!height) {
            height = ctx.canvas.height;
        }

        let maxX = startX + width;
        let maxY = startY + height;

        if (maxX > ctx.canvas.width) {
            maxX = ctx.canvas.width;
        }

        if (maxY > ctx.canvas.height) {
            maxY = ctx.canvas.height;
        }

        let realWidthHalf = (new Decimal(ctx.canvas.width >> 1)).div(magnif);
        let realHeightHalf = (new Decimal(ctx.canvas.height >> 1)).div(magnif);

        let widthStep = (new Decimal(1)).div(magnif);
        let heightStep = (new Decimal(1)).div(magnif);

        let widthStepStart = (new Decimal(startX)).div(magnif);
        // let heightStepStart = (new Decimal(startY)).div(magnif);

        let widthStepCurrent = (new Decimal(startX)).div(magnif);
        let heightStepCurrent = (new Decimal(startY)).div(magnif);

        let maxIterations = getMaxIterations(magnif);

        console.log('Rendering magnif', magnif, 'with max iterations', maxIterations);

        let pixelCounter = 0;

        for (let y = startY; y < maxY; y++) {
            widthStepCurrent = widthStepStart;

            for (let x = startX; x < maxX; x++) {
                let belongsToSet =
                    belongsToMandel(
                        centerX.sub(realWidthHalf).add(widthStepCurrent),
                        centerY.add(realHeightHalf).sub(heightStepCurrent),
                        maxIterations
                    );

                widthStepCurrent = widthStepCurrent.add(widthStep);
                
                // return;

                // let rgb = belongsToSet / 100 * 0xFFFFFF >> 0;

                // let r = rgb >> 16 & 0XFF;
                // let g = rgb >> 8 & 0XFF;
                // let b = rgb >> 0 & 0XFF;

                ctx.fillStyle = 'hsl(0, 100%, ' + (belongsToSet * 100 / maxIterations) + '%)';
                ctx.fillRect(x, y, 1, 1);

                pixelCounter ++;
            }

            heightStepCurrent = heightStepCurrent.add(heightStep);
        }

        console.log('No. of pixels rendered:', pixelCounter);
    }

    $(document).keydown(function(e) {
        // Numpad +
        if (e.keyCode == 107 || e.keyCode == 187) {
            magifMain *= 10;

            renderMandel(ctxMain, magifMain, hoverX, hoverY);
        }

        // Numpad -
        if (e.keyCode == 109 || e.keyCode == 189) {
            magifMain *= 0.1;

            renderMandel(ctxMain, magifMain, hoverX, hoverY);
        }

        // ArrowUp
        if (e.keyCode == 38) {
            hoverY += 100 / magifMain;

            renderMandel(ctxMain, magifMain, hoverX, hoverY);
        }

        // ArrowDown
        if (e.keyCode == 40) {
            hoverY -= 100 / magifMain;

            renderMandel(ctxMain, magifMain, hoverX, hoverY);
        }

        // ArrowLeft
        if (e.keyCode == 37) {
            hoverX -= 100 / magifMain;

            renderMandel(ctxMain, magifMain, hoverX, hoverY);
        }

        // ArrowRight
        if (e.keyCode == 39) {
            hoverX += 100 / magifMain;

            renderMandel(ctxMain, magifMain, hoverX, hoverY);
        }
    });

})()