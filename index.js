(function() {

    class MandelWorker {
        constructor(canvas = null, context = null, doneCallback = null, callbackThis = null) {
            this.working = false;
            
            this.worker = new Worker('naive-worker.js');
            this.worker.onmessage = this.workerResponse.bind(this);
            
            this.canvas = canvas;
            this.context = context;
            
            this.doneCallback = doneCallback;
            this.callbackThis = callbackThis;
        }

        work(magnif, centerX, centerY, width, height, callback = null, callbackThis = null) {
            if (this.working) {
                console.log('Worker terminated. Starting new worker.');

                this.worker.terminate();

                this.worker = new Worker('naive-worker.js');
                this.worker.onmessage = this.workerResponse.bind(this);
            }

            this.working = true;
            this.doneCallback = callback;
            this.callbackThis = callbackThis;

            this.worker.postMessage({
                magnif: magnif,
                centerX: centerX,
                centerY: centerY,
                width: width,
                height: height,
            });

            // console.log(
            //     'Message posted to worker with params',
            //     'magnif', magnif,
            //     'centerX', centerX,
            //     'centerY', centerY,
            //     'width', width,
            //     'height', height,
            //     'EOL'
            // );
        }

        workerResponse(e) {
            // console.log('MandelWorker received message', this, e);

            if (e.data.final) {
                this.working = false;
            }

            if (this.doneCallback) {
                this.doneCallback.apply(this.callbackThis, [e]);

                return;
            }

            if (e.data.final) {

                // console.log('MandelWorker Native Message: Received e', e, ', received e.data', e.data);

                let img = e.data.img;

                if (this.canvas && this.context) {
                    this.context.putImageData(e.data.img, this.canvas.width - img.width >> 1, this.canvas.height - img.height >> 1);
                }
            }
        }

        destroy() {
            this.working = false;
            
            this.worker.onmessage = null;
            this.worker.terminate();
            
            this.canvas = null;
            this.context = null;
            
            this.doneCallback = null;
            this.callbackThis = null;
        }
    }

    class MapVisualPair {
        constructor() {
            this.visCanvas = null;
            this.mapCanvas = null;
            this.previewCanvas = null;

            this.visContext = null;
            this.mapContext = null;
            this.previewContext = null;

            this.visImg = null;
            this.mapImg = null;
            this.previewImg = null;

            this.visWorker = new MandelWorker;
            this.mapWorker = new MandelWorker;

            this.visMagnif = 10000;
            this.mapMagnif = 1000;

            this.visCenterX = 0;
            this.visCenterY = 0;

            this.visImgOffsetX = 0;
            this.visImgOffsetY = 0;

            this.mapCenterX = 0;
            this.mapCenterY = 0;

            this.disablePartialEffects = false;
        }

        init(visCanvas, mapCanvas, previewCanvas) {
            this.visCanvas = visCanvas;
            this.mapCanvas = mapCanvas;
            this.previewCanvas = previewCanvas;

            this.visContext = visCanvas.getContext('2d');
            this.mapContext = mapCanvas.getContext('2d');
            this.previewContext = previewCanvas.getContext('2d');

            if ($(mapCanvas).data('jq-mouseover-attached') && $(mapCanvas).data('jq-mouseover-target') !== this) {
                $(mapCanvas).off();
                
                $(mapCanvas).removeData('jq-mouseover-attached');
                $(mapCanvas).removeData('jq-mouseover-target');
            }

            if (!$(mapCanvas).data('jq-mouseover-attached')) {
                
                $(mapCanvas).data('jq-mouseover-attached', true);
                $(mapCanvas).data('jq-mouseover-target', this);

                $(mapCanvas).mouseover(function (e) {
                    // console.log('Mouse over', e);

                    let currentPair = $(this).data('jq-mouseover-target');

                    if (!currentPair) {
                        return;
                    }

                    let li = $(mapCanvas).parent();

                    li.prev().toggleClass('nearby', true);
                    li.next().toggleClass('nearby', true);

                    if (currentPair) {

                        if (currentPair.previewContext && currentPair.previewImg) {
                            currentPair.previewContext.putImageData(currentPair.previewImg, 0, 0);
                            currentPair.drawHoverArea();
                        }

                        $(currentPair.previewCanvas).stop().fadeTo(400, Math.random() * 0.15 + 0.85);
                    }
    
                });
    
                $(mapCanvas).mouseout(function (e) {
                    // console.log('Mouse out', e);

                    let currentPair = $(this).data('jq-mouseover-target');

                    if (!currentPair) {
                        return;
                    }

                    let li = $(mapCanvas).parent();

                    li.prev().removeClass('nearby');
                    li.next().removeClass('nearby');

                    if (currentPair) {
                        if (currentPair.previewContext && currentPair.previewImg) {
                            currentPair.previewContext.putImageData(currentPair.previewImg, 0, 0);
                            currentPair.drawHoverArea();
                        }

                        $(currentPair.previewCanvas).stop().fadeTo(400, 0);
                    }
                });
            }
        }

        destroy() {
            this.visContext = null;
            this.mapContext = null;
            this.previewContext = null;

            $(this.mapCanvas).off();
                
            $(this.mapCanvas).removeData('jq-mouseover-attached');
            $(this.mapCanvas).removeData('jq-mouseover-target');

            $(this.mapCanvas).parent().remove();

            this.visCanvas = null;
            this.mapCanvas = null;
            this.previewCanvas = null;

            this.visImg = null;
            this.mapImg = null;
            this.previewImg = null;

            this.visWorker.destroy();
            this.mapWorker.destroy();
        }

        drawHoverArea(offsetRealX = 0, offsetRealY = 0) {
            if (this.mapImg) {
                this.mapContext.putImageData(this.mapImg, 0, 0);
            }

            if (this.previewImg) {
                this.previewContext.putImageData(this.previewImg, 0, 0);
            }

            let areaRealWidth = this.visCanvas.width / this.visMagnif;
            let areaRealHeight = this.visCanvas.height / this.visMagnif;

            let areaRealStartX = offsetRealX + this.visCenterX - areaRealWidth * .5 - this.mapCenterX;
            let areaRealStartY = offsetRealY + this.visCenterY + areaRealHeight * .5 - this.mapCenterY;

            let strokeX = this.previewCanvas.width * .5 + areaRealStartX * this.mapMagnif;
            let strokeY = this.previewCanvas.height * .5 - areaRealStartY * this.mapMagnif;
            let strokeW = areaRealWidth * this.mapMagnif;
            let strokeH = areaRealHeight * this.mapMagnif;

            if (strokeW <= 1) {
                strokeW = 1;
            }

            if (strokeH <= 1) {
                strokeH = 1;
            }

            this.previewContext.beginPath();
            this.previewContext.lineWidth = 1;
            this.previewContext.strokeStyle = 'rgba(255, 0, 255, 1)';
            this.previewContext.strokeRect(
                strokeX,
                strokeY,
                strokeW,
                strokeH
            );

            // console.log(
            //     'this.visMagnif', this.visMagnif,
            //     'this.mapMagnif', this.mapMagnif,
            //     this.previewImg,
            //     this.mapImg,
            //     'map',
            //     this.mapCenterX,
            //     this.mapCenterY,
            //     'vis',
            //     this.visCenterX,
            //     this.visCenterY,
            //     'strokeW', strokeW,
            //     'strokeH', strokeH,
            //     'EOL'
            // );

            strokeX = strokeX * this.mapCanvas.width / this.previewCanvas.width;
            strokeY = strokeY * this.mapCanvas.height / this.previewCanvas.height;
            strokeW = strokeW * this.mapCanvas.width / this.previewCanvas.width;
            strokeH = strokeH * this.mapCanvas.height / this.previewCanvas.height;

            if (strokeW <= 1) {
                strokeW = 1;
            }

            if (strokeH <= 1) {
                strokeH = 1;
            }

            this.mapContext.beginPath();
            this.mapContext.lineWidth = 1;
            this.mapContext.strokeStyle = 'rgba(255, 0, 255, 1)';
            this.mapContext.strokeRect(
                strokeX,
                strokeY,
                strokeW,
                strokeH
            );
        }

        moveTo(x = null, y = null) {
            if (x !== null) {
                this.visCenterX = x;
            }

            if (y !== null) {
                this.visCenterY = y;
            }

            $(this.visCanvas).parent().toggleClass('loading', true);
            $(this.mapCanvas).parent().toggleClass('loading', true);

            this.visWorker.work(this.visMagnif, this.visCenterX, this.visCenterY, this.visCanvas.width << 1, this.visCanvas.height << 1, (e) => {
                if (e.data.final === false && typeof e.data.partStartY !== 'undefined' && typeof e.data.partHeight !== 'undefined') {
                    // console.log('Received partial render result', e.data.partStartY, 'height', e.data.partHeight);

                    let imgPart = e.data.img;

                    this.visContext.putImageData(
                        imgPart,
                        this.visCanvas.width - e.data.width >> 1,
                        (this.visCanvas.height - e.data.height >> 1) + e.data.partStartY,
                        0,
                        0,
                        imgPart.width,
                        e.data.partHeight
                    );
        
                    this.visContext.beginPath();
                    this.visContext.lineWidth = 1;
                    this.visContext.strokeStyle = 'rgba(0, 255, 0, 1)';
                    this.visContext.strokeRect(
                        1,
                        (this.visCanvas.height - e.data.height >> 1) + e.data.partStartY,
                        this.visCanvas.width - 2,
                        e.data.partHeight
                    );

                    if (this.visWorker.working || this.mapWorker.working) {
                        $(this.visCanvas).parent().toggleClass('loading', true);
                        $(this.mapCanvas).parent().toggleClass('loading', true);
                    }
                }

                if (e.data.final) {
                    let img = e.data.img;

                    this.visImg = img;
            
                    this.visContext.putImageData(img, this.visCanvas.width - img.width >> 1, this.visCanvas.height - img.height >> 1);

                    this.visImgOffsetX = 0;
                    this.visImgOffsetY = 0;

                    this.drawHoverArea();
                    
                    if (!this.visWorker.working && !this.mapWorker.working) {
                        $(this.visCanvas).parent().removeClass('loading');
                        $(this.mapCanvas).parent().removeClass('loading');
                    }
                }
            }, this);

            this.mapWorker.work(this.mapMagnif, this.mapCenterX, this.mapCenterY, this.previewCanvas.width, this.previewCanvas.height, (e) => {
                if (e.data.final === false && typeof e.data.partStartY !== 'undefined' && typeof e.data.partHeight !== 'undefined') {
                    // console.log('Received partial render result for Minimap & Preview', e.data);

                    let imgPart = e.data.img;

                    this.previewContext.putImageData(
                        imgPart,
                        0,
                        e.data.partStartY,
                        0,
                        0,
                        imgPart.width,
                        e.data.partHeight
                    );

                    createImageBitmap(imgPart).then(((imgBitmap) => {
                        this.mapContext.drawImage(
                            imgBitmap,
                            0, 0, imgBitmap.width, e.data.partHeight,
                            0,
                            e.data.partStartY / this.previewCanvas.height * this.mapCanvas.height,
                            this.mapCanvas.width,
                            e.data.partHeight / this.previewCanvas.height * this.mapCanvas.height
                        );

                        this.drawHoverArea();
                    }).bind(this));

                    this.previewContext.beginPath();
                    this.previewContext.lineWidth = 1;
                    this.previewContext.strokeStyle = 'rgba(0, 255, 0, 1)';
                    this.previewContext.strokeRect(
                        1,
                        e.data.partStartY,
                        this.previewCanvas.width - 2,
                        e.data.partHeight
                    );
        
                    this.mapContext.beginPath();
                    this.mapContext.lineWidth = 1;
                    this.mapContext.strokeStyle = 'rgba(0, 255, 0, 1)';
                    this.mapContext.strokeRect(
                        1,
                        e.data.partStartY / this.previewCanvas.height * this.mapCanvas.height,
                        this.mapCanvas.width - 2,
                        e.data.partHeight / this.previewCanvas.height * this.mapCanvas.height
                    );

                    this.drawHoverArea();

                    if (this.visWorker.working || this.mapWorker.working) {
                        $(this.visCanvas).parent().toggleClass('loading', true);
                        $(this.mapCanvas).parent().toggleClass('loading', true);
                    }
                }

                if (e.data.final) {
                    let img = e.data.img;
                    
                    this.previewImg = img;                

                    createImageBitmap(img).then(((imgBitmap) => {
                        this.mapContext.drawImage(imgBitmap, 0, 0, this.mapCanvas.width, this.mapCanvas.height);
                        this.mapImg = this.mapContext.getImageData(0, 0, this.mapCanvas.width, this.mapCanvas.height);

                        this.drawHoverArea();
                    }).bind(this));

                    this.drawHoverArea();

                    if (!this.visWorker.working && !this.mapWorker.working) {
                        $(this.visCanvas).parent().removeClass('loading');
                        $(this.mapCanvas).parent().removeClass('loading');
                    }
                }
            }, this);
        }
    }

    class MinimapManager {
        constructor() {
            this.visMagnif = 10000000;
            this.mapMagnif = 300;

            this.visCanvas = null;
            this.previewCanvas = null;
            
            this.mapContainer = null;
            this.visualContainer = null;

            this.pairs = [];
            this.pairMain = null;

            this.minStrokeW = screenWidth * .3;

            this.dragInit = false;
            this.dragStartX = null;
            this.dragStartY = null;
            this.dragCurrentMouseX = null;
            this.dragCurrentMouseY = null;
            this.dragGlobalID = null;

            this.wheelInit = false;
            this.wheelDirection = null;
            this.wheelStartMagnif = null;
            this.wheelCurrentRatio = null;
            this.wheelTimeoutGlobalID = null;
            this.wheelGlobalID = null;
        }

        initMaps(visCanvas, previewCanvas, mapContainer, visualContainer, hoverX = 0, hoverY = 0) {
            this.visCanvas = visCanvas;
            this.previewCanvas = previewCanvas;

            this.mapContainer = mapContainer;
            this.visualContainer = visualContainer;

            let currentMapMagnif = Math.round(this.mapMagnif);
            let strokeW = this.visCanvas.width * currentMapMagnif / this.visMagnif;

            let lastMapCanvas = document.createElement('canvas');

            lastMapCanvas.width = mapWidth;
            lastMapCanvas.height = mapHeight;
        
            let li = $('<div class="li"></div>');
            let span = $('<span></span>');
            
            span.html(Math.round(currentMapMagnif));
            $(this.mapContainer).append(li.toggleClass('loading', true).append(span).append(lastMapCanvas));

            while (strokeW < this.minStrokeW) {
                let nextMapCanvas = document.createElement('canvas');

                nextMapCanvas.width = mapWidth;
                nextMapCanvas.height = mapHeight;
            
                let li = $('<div class="li"></div>');
                let span = $('<span></span>');
                
                span.html(Math.round(currentMapMagnif * this.visCanvas.width / this.minStrokeW));
                $(this.mapContainer).append(li.toggleClass('loading', true).append(span).append(nextMapCanvas));

                let currentPair = new MapVisualPair;
                
                currentPair.visMagnif = Math.round(currentMapMagnif * nextMapCanvas.width / this.minStrokeW);
                currentPair.visCenterX = hoverX;
                currentPair.visCenterY = hoverY;
            
                currentPair.mapMagnif = Math.round(currentMapMagnif);
                currentPair.mapCenterX = this.pairs.length ? hoverX : 0;
                currentPair.mapCenterY = this.pairs.length ? hoverY : 0;
            
                currentPair.init(nextMapCanvas, lastMapCanvas, this.previewCanvas);

                this.pairs.push(currentPair);

                lastMapCanvas = nextMapCanvas;

                currentMapMagnif = Math.round(currentMapMagnif * this.visCanvas.width / this.minStrokeW);
                strokeW = this.visCanvas.width * currentMapMagnif / this.visMagnif;

            }
            
            this.pairMain = new MapVisualPair;

            this.pairMain.visMagnif = this.visMagnif;
            this.pairMain.visCenterX = hoverX;
            this.pairMain.visCenterY = hoverY;

            this.pairMain.mapMagnif = currentMapMagnif;
            this.pairMain.mapCenterX = hoverX;
            this.pairMain.mapCenterY = hoverY;
            
            this.pairMain.init(this.visCanvas, lastMapCanvas, this.previewCanvas);

            this.pairs.push(this.pairMain);
            
            for (let i = 0; i < this.pairs.length; i++) {
                console.log(i, this.pairs[i]);
                this.pairs[i].moveTo();                
            }
        }

        initPairMainDrag() {
            if (this.dragInit || !this.visualContainer || !this.pairMain) {
                return;
            }

            this.dragInit = true;

            $(this.visualContainer).mousedown(this.pairMainMouseDown.bind(this));        
            $(this.visualContainer).mousemove(this.pairMainMouseMove.bind(this));
            $(this.visualContainer).mouseup(this.pairMainMouseUp.bind(this));
            $(document).mouseup(this.pairMainMouseUp.bind(this));
        }

        pairMainMouseDown(e) {
            if (e.which != 1) {
                return;
            }
    
            if (!this.dragGlobalID && this.pairMain.visImg) {
                this.dragStartX = this.dragCurrentMouseX = e.offsetX;
                this.dragStartY = this.dragCurrentMouseY = e.offsetY;
    
                this.dragGlobalID = window.requestAnimationFrame(this.pairMainStepDrag.bind(this));
                console.log('dragging start');    
            }
        }

        pairMainMouseMove(e) {
            if (this.dragGlobalID) {
                this.dragCurrentMouseX = e.offsetX;
                this.dragCurrentMouseY = e.offsetY;
            }
        }

        pairMainMouseUp(e) {
            if (e.which != 1) {
                return;
            }

            if (!this.dragGlobalID) {
                return;
            }
    
            window.cancelAnimationFrame(this.dragGlobalID);
            this.dragGlobalID = null;
    
            let offsetX = this.dragCurrentMouseX - this.dragStartX;
            let offsetY = this.dragCurrentMouseY - this.dragStartY;
    
            this.pairMain.visContext.fillRect(0, 0, this.pairMain.visCanvas.width, this.pairMain.visCanvas.height);
            this.pairMain.visContext.putImageData(
                this.pairMain.visImg,
                offsetX + this.pairMain.visImgOffsetX + (this.pairMain.visCanvas.width - this.pairMain.visImg.width >> 1),
                offsetY + this.pairMain.visImgOffsetY + (this.pairMain.visCanvas.height - this.pairMain.visImg.height >> 1)
            );
    
            this.pairMain.mapContext.fillRect(0, 0, this.pairMain.mapCanvas.width, this.pairMain.mapCanvas.height);
            this.pairMain.mapContext.putImageData(
                this.pairMain.mapImg,
                this.pairMain.mapCanvas.width - this.pairMain.mapImg.width >> 1,
                this.pairMain.mapCanvas.height - this.pairMain.mapImg.height >> 1
            );
    
            this.pairMain.drawHoverArea(- offsetX / this.pairMain.visMagnif, offsetY / this.pairMain.visMagnif);
    
            this.pairMain.visImgOffsetX += offsetX;
            this.pairMain.visImgOffsetY += offsetY;
    
            console.log('dragging stop at', this.pairMain.visCenterX - offsetX / this.pairMain.visMagnif, this.pairMain.visCenterY + offsetY / this.pairMain.visMagnif);
    
            for (let i = this.pairs.length - 1; i >= 0; i--) {
                const currentPair = this.pairs[i];

                let destRealX = this.pairMain.visCenterX - offsetX / this.pairMain.visMagnif;
                let destRealY = this.pairMain.visCenterY + offsetY / this.pairMain.visMagnif;

                let diffRealX = Math.abs(currentPair.mapCenterX - destRealX);
                let diffRealY = Math.abs(currentPair.mapCenterY - destRealY);

                let offsetXOnCurrentPairMinimap = Math.abs(diffRealX * currentPair.mapMagnif / currentPair.previewCanvas.width * currentPair.mapCanvas.width);
                let offsetYOnCurrentPairMinimap = Math.abs(diffRealY * currentPair.mapMagnif / currentPair.previewCanvas.height * currentPair.mapCanvas.height);

                console.log(
                    'checking update requirements of minimap with magnif',
                    currentPair.mapMagnif,
                    offsetXOnCurrentPairMinimap,
                    offsetYOnCurrentPairMinimap,
                    'EOL'
                );

                if (offsetXOnCurrentPairMinimap > 1 || offsetYOnCurrentPairMinimap > 1) {
                    currentPair.mapCenterX = destRealX;
                    currentPair.mapCenterY = destRealY;

                    $(currentPair.mapCanvas).parent().toggleClass('loading', true);
                    
                    currentPair.moveTo(destRealX, destRealY);
                } else {
                    console.log('Breaking at pair', i, 'updating', this.pairs.length - i - 1, 'maps');

                    break;
                }
            }

            console.log('All current pairs, mouse dragging stopped', this.pairs);
            
        }

        pairMainStepDrag(timestamp) {
            if (this.dragCurrentMouseX - this.dragStartX !== 0 || this.dragCurrentMouseY - this.dragStartY !== 0) {
        
                let offsetX = this.dragCurrentMouseX - this.dragStartX;
                let offsetY = this.dragCurrentMouseY - this.dragStartY;
        
                this.pairMain.visContext.fillRect(0, 0, this.pairMain.visCanvas.width, this.pairMain.visCanvas.height);
                this.pairMain.visContext.putImageData(
                    this.pairMain.visImg,
                    offsetX + this.pairMain.visImgOffsetX + (this.pairMain.visCanvas.width - this.pairMain.visImg.width >> 1),
                    offsetY + this.pairMain.visImgOffsetY + (this.pairMain.visCanvas.height - this.pairMain.visImg.height >> 1)
                );
    
                this.pairMain.mapContext.fillRect(0, 0, this.pairMain.mapCanvas.width, this.pairMain.mapCanvas.height);
                this.pairMain.mapContext.putImageData(
                    this.pairMain.mapImg,
                    this.pairMain.mapCanvas.width - this.pairMain.mapImg.width >> 1,
                    this.pairMain.mapCanvas.height - this.pairMain.mapImg.height >> 1
                );
    
                this.pairMain.drawHoverArea(- offsetX / this.pairMain.visMagnif, offsetY / this.pairMain.visMagnif);
            }
    
            this.dragGlobalID = window.requestAnimationFrame(this.pairMainStepDrag.bind(this));
        }

        initPairMainWheel() {
            if (this.wheelInit || !this.pairMain) {
                return;
            }

            this.wheelInit = true;

            $('#visual-container').bind('mousewheel', this.pairMainWheel.bind(this));
        }

        pairMainWheel(e) {
            if (this.wheelTimeoutGlobalID === null) {
                this.wheelCurrentRatio = 1;
                this.wheelStartMagnif = this.pairMain.visMagnif;
    
                this.wheelGlobalID = window.requestAnimationFrame(this.pairMainStepWheel.bind(this));
                this.wheelTimeoutGlobalID = setTimeout(this.pairMainTimeoutWheel.bind(this), 500);
            } else {
                clearTimeout(this.wheelTimeoutGlobalID);
                this.wheelTimeoutGlobalID = setTimeout(this.pairMainTimeoutWheel.bind(this), 500);
            }
    
            // Up, decrease magnification
            if(e.originalEvent.wheelDelta > 0) {
                this.wheelDirection = -1;
            }
            
            // Down, increase magnification
            if(e.originalEvent.wheelDelta < 0) {
                this.wheelDirection = 1;
            }
        }

        pairMainTimeoutWheel() {
            console.log('Wheeling stop at magnif', this.pairMain.visMagnif);

            window.cancelAnimationFrame(this.wheelGlobalID);
            this.wheelGlobalID = null;
    
            clearTimeout(this.wheelTimeoutGlobalID);
            this.wheelTimeoutGlobalID = null;

            this.pairMain.mapContext.fillRect(0, 0, this.pairMain.mapCanvas.width, this.pairMain.mapCanvas.height);

            if (this.wheelDirection > 0) {
                console.log('Adding more maps now');

                let currentMapMagnif = Math.round(this.pairMain.mapMagnif);
                let strokeW = this.visCanvas.width * currentMapMagnif / this.pairMain.visMagnif;
    
                let lastMapCanvas = this.pairMain.mapCanvas;

                let startingMapIndex = this.pairs.length - 1;

                this.pairs.pop();
    
                // console.log(strokeW);

                while (strokeW < this.minStrokeW) {
                    // console.log(strokeW, currentMapMagnif);

                    let nextMapCanvas = document.createElement('canvas');
    
                    nextMapCanvas.width = mapWidth;
                    nextMapCanvas.height = mapHeight;
                
                    let li = $('<div class="li"></div>');
                    let span = $('<span></span>');
                    
                    span.html(Math.round(currentMapMagnif * this.visCanvas.width / this.minStrokeW));
                    $(this.mapContainer).append(li.toggleClass('loading', true).append(span).append(nextMapCanvas));
    
                    let currentPair = new MapVisualPair;
                    
                    currentPair.visMagnif = Math.round(currentMapMagnif * nextMapCanvas.width / this.minStrokeW);
                    currentPair.visCenterX = this.pairMain.visCenterX;
                    currentPair.visCenterY = this.pairMain.visCenterY;
                
                    currentPair.mapMagnif = Math.round(currentMapMagnif);
                    currentPair.mapCenterX = this.pairs.length ? this.pairMain.visCenterX : 0;
                    currentPair.mapCenterY = this.pairs.length ? this.pairMain.visCenterY : 0;
                
                    currentPair.init(nextMapCanvas, lastMapCanvas, this.previewCanvas);
    
                    this.pairs.push(currentPair);
    
                    lastMapCanvas = nextMapCanvas;
    
                    currentMapMagnif = Math.round(currentMapMagnif * this.visCanvas.width / this.minStrokeW);
                    strokeW = this.visCanvas.width * currentMapMagnif / this.visMagnif;    
                }

                this.pairs.push(this.pairMain);

                this.pairMain.mapMagnif = currentMapMagnif;
    
                this.pairMain.init(this.visCanvas, lastMapCanvas, this.previewCanvas);
                
                for (let i = startingMapIndex; i < this.pairs.length; i++) {
                    console.log('Applied moveTo() on', i, this.pairs[i]);
                    this.pairs[i].moveTo();
                }
            }

            if (this.wheelDirection < 0) {
                console.log('Checking if removing some maps is needed now');

                let currentMapMagnif = Math.round(this.pairMain.mapMagnif);
                let strokeW = this.visCanvas.width * currentMapMagnif / this.visMagnif;
    
                // this.pairs.push(this.pairMain);

                // this.pairMain.mapMagnif = currentMapMagnif;
    
                // this.pairMain.init(this.visCanvas, lastMapCanvas, this.previewCanvas);
                
                for (let i = this.pairs.length - 1; i >= 0; i--) {


                    currentMapMagnif = Math.round(this.pairs[i].mapMagnif);
                    strokeW = this.visCanvas.width * currentMapMagnif / this.visMagnif;

                    console.log('Current map', i, 'strokeW', strokeW, 'mapMagnif', currentMapMagnif);

                    if (strokeW < screenWidth) {
                        console.log('Stopped with index', i, 'removing from', i + 1, 'to', this.pairs.length - 1);

                        this.pairMain = this.pairs[i];

                        this.pairMain.visMagnif = this.visMagnif;
                        this.pairMain.mapMagnif = currentMapMagnif;
    
                        this.pairMain.init(this.visCanvas, this.pairs[i].mapCanvas, this.previewCanvas);

                        for (let r = i + 1, len = this.pairs.length; r < len; r++) {
                            this.pairs[r].destroy();
                        }

                        if (i + 1 < this.pairs.length) {
                            this.pairs.splice(i + 1);
                        }

                        break;
                    }
                }

                this.pairMain.moveTo();
            }

            console.log('All current pairs, mouse wheeling stopped', this.pairs);
    
            this.wheelDirection = null;
            this.wheelStartMagnif = null;
            this.wheelCurrentRatio = null;    
        }

        pairMainStepWheel() {
            this.pairMain.visContext.fillRect(0, 0, this.pairMain.visCanvas.width, this.pairMain.visCanvas.height);

            if (this.wheelDirection > 0) {
                this.wheelCurrentRatio *= 1.02;
            }
    
            if (this.wheelDirection < 0) {
                this.wheelCurrentRatio /= 1.02;
            }
    
            
            this.pairMain.visMagnif = this.visMagnif = Math.round(this.wheelStartMagnif * this.wheelCurrentRatio);
            
            // console.log('Wheeling current magnif', this.pairMain.visMagnif);

            createImageBitmap(this.pairMain.visImg).then(((imgBitmap) => {
                this.pairMain.visContext.drawImage(
                    imgBitmap,
                    this.pairMain.visCanvas.width - this.wheelCurrentRatio * this.pairMain.visImg.width >> 1,
                    this.pairMain.visCanvas.height - this.wheelCurrentRatio * this.pairMain.visImg.height >> 1,
                    this.pairMain.visImg.width * this.wheelCurrentRatio,
                    this.pairMain.visImg.height * this.wheelCurrentRatio
                );
    
                this.pairMain.drawHoverArea();
            }).bind(this));
    
            this.wheelGlobalID = window.requestAnimationFrame(this.pairMainStepWheel.bind(this));
        }
    }

    class EffectManager {
        constructor() {

        }
    }

    // var screenWidth = 1440;
    // var screenHeight = 821;

    var screenWidth = 1920;
    var screenHeight = 978;

    var mapWidth = 160;
    var mapHeight = 90;

    var visMagnif = 10000;
    var mapMagnif = 300;
    var hoverX = 0.3602404434376143632361252444495453084826078079585857504883758147401953460592;
    var hoverY = 0.6413130610648031748603750151793020665794949522823052595561775430644485741727;

    var mainCanvas = document.createElement('canvas');

    $('#visual-container').append(mainCanvas);

    mainCanvas.width = screenWidth;
    mainCanvas.height = screenHeight;
    
    mainCanvas.getContext('2d').fillRect(0, 0, screenWidth, screenHeight);

    // $(mainCanvas).hide();

    var previewCanvas = document.createElement('canvas');

    $('#visual-container').append(previewCanvas);

    previewCanvas.width = screenWidth;
    previewCanvas.height = screenHeight;

    previewCanvas.getContext('2d').fillRect(0, 0, screenWidth, screenHeight);

    $(previewCanvas).hide();

    // $('#maps-container').css('max-height', screenHeight + 'px');
    var miniBar = new MiniBar($('#maps-container')[0], {
        scrollX: false,
        scrollY: true,
        alwaysShowBars: true,
        onUpdate() {
            this.scrollTo("end", "y");
        }
    });

    var minimapManager = new MinimapManager;
    
    minimapManager.visMagnif = visMagnif;
    minimapManager.mapMagnif = mapMagnif;
    
    minimapManager.initMaps(mainCanvas, previewCanvas, $('#maps-container .mb-content'), $('#visual-container'), hoverX, hoverY);
    minimapManager.initPairMainDrag();
    minimapManager.initPairMainWheel();

    miniBar.update();

    $(document).keydown(function(e) {
        // Numpad +
        if (e.keyCode === 107 || e.keyCode === 187) {
            actualMagif *= 2;

            naiveWorker.work(actualMagif, hoverX, hoverY, screenWidth << 1, screenHeight << 1);
        }

        // Numpad -
        if (e.keyCode === 109 || e.keyCode === 189) {
            actualMagif *= 0.5;

            naiveWorker.work(actualMagif, hoverX, hoverY, screenWidth << 1, screenHeight << 1);
        }

        // ArrowUp
        if (e.keyCode === 38 || e.keyCode === 87) {
            hoverY += 100 / actualMagif;

            naiveWorker.work(actualMagif, hoverX, hoverY, screenWidth << 1, screenHeight << 1);
        }

        // ArrowDown
        if (e.keyCode === 40 || e.keyCode === 83) {
            hoverY -= 100 / actualMagif;

            naiveWorker.work(actualMagif, hoverX, hoverY, screenWidth << 1, screenHeight << 1);
        }

        // ArrowLeft
        if (e.keyCode === 37 || e.keyCode === 65) {
            hoverX -= 100 / actualMagif;

            naiveWorker.work(actualMagif, hoverX, hoverY, screenWidth << 1, screenHeight << 1);
        }

        // ArrowRight
        if (e.keyCode === 39 || e.keyCode === 68) {
            hoverX += 100 / actualMagif;

            naiveWorker.work(actualMagif, hoverX, hoverY, screenWidth << 1, screenHeight << 1);
        }
    });

})()