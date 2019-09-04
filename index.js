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

            this.visCanvasWidth = 800;
            this.visCanvasHeight = 600;

            this.visImgOffsetX = 0;
            this.visImgOffsetY = 0;

            this.mapCenterX = 0;
            this.mapCenterY = 0;

            this.previewActive = false;
            
            this.mouseOverCallback = null;
            this.mouseOverCallbackThis = null;
            this.mouseOutCallback = null;
            this.mouseOutCallbackThis = null;
        }

        init(mapCanvas, previewCanvas, visCanvas = null) {
            this.mapCanvas = mapCanvas;
            this.previewCanvas = previewCanvas;
            
            this.mapContext = mapCanvas.getContext('2d');
            this.previewContext = previewCanvas.getContext('2d');
            
            if (visCanvas) {
                this.visCanvas = visCanvas;
                this.visContext = visCanvas.getContext('2d');
            } else {
                this.visCanvas = null;
                this.visContext = null;
            }

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
                        currentPair.previewActive = true;

                        if (currentPair.mouseOverCallback) {
                            currentPair.mouseOverCallback.apply(currentPair.mouseOverCallbackThis ? currentPair.mouseOverCallbackThis : null, [e, currentPair]);
                        } else {
                            if (currentPair.previewContext && currentPair.previewImg) {
                                currentPair.previewContext.putImageData(currentPair.previewImg, 0, 0);
                                currentPair.drawPreviewHoverArea();
                            }

                            $(currentPair.previewCanvas).stop().show(0);
                        }

                    }

                    li.closest('#maps-container').find('.li').css('min-width', '');

                    if (li.closest('#maps-container').hasClass('tabs')) {
                        li.css('min-width', mapWidth + 'px');
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
                        currentPair.previewActive = false;

                        if (currentPair.mouseOutCallback) {
                            currentPair.mouseOutCallback.apply(currentPair.mouseOutCallbackThis ? currentPair.mouseOutCallbackThis : null, [e, currentPair]);
                        } else {
                            // if (currentPair.previewContext && currentPair.previewImg) {
                            //     currentPair.previewContext.putImageData(currentPair.previewImg, 0, 0);
                            //     currentPair.drawPreviewHoverArea();
                            // }

                            $(currentPair.previewCanvas).stop().hide(0);
                        }

                    }

                    li.closest('#maps-container').find('.li').css('min-width', '');
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

            this.mouseOverCallback = null;
            this.mouseOverCallbackThis = null;
            this.mouseOutCallback = null;
            this.mouseOutCallbackThis = null;
        }

        drawMapHoverArea(offsetRealX = 0, offsetRealY = 0) {
            if (this.mapImg) {
                this.mapContext.putImageData(this.mapImg, 0, 0);
            }

            let areaRealWidth = this.visCanvasWidth / this.visMagnif;
            let areaRealHeight = this.visCanvasHeight / this.visMagnif;

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

        drawPreviewHoverArea(offsetRealX = 0, offsetRealY = 0) {
            if (this.previewImg) {
                this.previewContext.putImageData(this.previewImg, 0, 0);
            }

            let areaRealWidth = this.visCanvasWidth / this.visMagnif;
            let areaRealHeight = this.visCanvasHeight / this.visMagnif;

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
        }

        moveTo(x = null, y = null) {
            if (x !== null) {
                this.visCenterX = x;
            }

            if (y !== null) {
                this.visCenterY = y;
            }

            $(this.mapCanvas).parent().toggleClass('loading', true);

            this.mapWorker.work(this.mapMagnif, this.mapCenterX, this.mapCenterY, this.previewCanvas.width, this.previewCanvas.height, (e) => {
                if (e.data.final === false && typeof e.data.partStartY !== 'undefined' && typeof e.data.partHeight !== 'undefined') {
                    // console.log('Received partial render result for Minimap & Preview', e.data);

                    let imgPart = e.data.img;

                    let tempCanvas = new OffscreenCanvas(e.data.width, e.data.height);
                    let tempContext = tempCanvas.getContext('2d');

                    if (this.previewImg) {
                        tempContext.putImageData(this.previewImg, 0, 0);
                    }

                    tempContext.putImageData(
                        imgPart,
                        0,
                        e.data.partStartY,
                        0,
                        0,
                        e.data.width,
                        e.data.partHeight
                    );

                    this.previewImg = tempContext.getImageData(0, 0, e.data.width, e.data.height);

                    tempCanvas = null;
                    tempContext = null;

                    if (this.previewActive) {
                        this.drawPreviewHoverArea();

                        let partStrokeY = (this.previewCanvas.height - e.data.height >> 1) + e.data.partStartY;
                        let partStrokeH = e.data.partHeight;

                        this.previewContext.beginPath();
                        this.previewContext.lineWidth = 1;
                        this.previewContext.strokeStyle = 'rgba(0, 255, 0, 1)';
                        this.previewContext.strokeRect(
                            1,
                            partStrokeY,
                            this.previewCanvas.width - 2,
                            partStrokeH > 1 ? partStrokeH : 1
                        );
                    }

                    createImageBitmap(imgPart).then(((imgBitmap) => {
                        if (this.mapImg) {
                            this.mapContext.putImageData(this.mapImg, 0, 0);
                        }

                        this.mapContext.drawImage(
                            imgBitmap,
                            0, 0, imgBitmap.width, e.data.partHeight,
                            0,
                            e.data.partStartY / this.previewCanvas.height * this.mapCanvas.height,
                            this.mapCanvas.width,
                            e.data.partHeight / this.previewCanvas.height * this.mapCanvas.height
                        );

                        this.mapImg = this.mapContext.getImageData(0, 0, this.mapCanvas.width, this.mapCanvas.height);

                        this.drawMapHoverArea();

                        let partStrokeY = ((this.previewCanvas.height - e.data.height >> 1) + e.data.partStartY) * this.mapCanvas.height / this.previewCanvas.height;
                        let partStrokeH = e.data.partHeight * this.mapCanvas.height / this.previewCanvas.height;

                        this.mapContext.beginPath();
                        this.mapContext.lineWidth = 1;
                        this.mapContext.strokeStyle = 'rgba(0, 255, 0, 1)';
                        this.mapContext.strokeRect(
                            1,
                            partStrokeY,
                            this.mapCanvas.width - 2,
                            partStrokeH > 1 ? partStrokeH : 1
                        );

                    }).bind(this));

                    if (this.visWorker.working || this.mapWorker.working) {
                        $(this.visCanvas).parent().toggleClass('loading', true);
                        $(this.mapCanvas).parent().toggleClass('loading', true);
                    }
                }

                if (e.data.final) {
                    let img = e.data.img;
                    
                    this.previewImg = img;

                    if (this.previewActive) {
                        this.previewContext.putImageData(this.previewImg, 0, 0);

                        this.drawPreviewHoverArea();
                    }

                    createImageBitmap(img).then(((imgBitmap) => {
                        this.mapContext.drawImage(imgBitmap, 0, 0, this.mapCanvas.width, this.mapCanvas.height);
                        this.mapImg = this.mapContext.getImageData(0, 0, this.mapCanvas.width, this.mapCanvas.height);

                        this.drawMapHoverArea();
                    }).bind(this));

                    this.drawMapHoverArea();

                    if (!this.visWorker.working && !this.mapWorker.working) {
                        $(this.visCanvas).parent().removeClass('loading');
                        $(this.mapCanvas).parent().removeClass('loading');
                    }
                }
            }, this);

            if (!this.visCanvas) {
                return;
            }
            
            $(this.visCanvas).parent().toggleClass('loading', true);

            this.visWorker.work(this.visMagnif, this.visCenterX, this.visCenterY, this.visCanvas.width << 1, this.visCanvas.height << 1, (e) => {
                if (e.data.final === false && typeof e.data.partStartY !== 'undefined' && typeof e.data.partHeight !== 'undefined') {
                    // console.log('Received partial render result', e.data.partStartY, 'height', e.data.partHeight);

                    let imgPart = e.data.img;

                    let tempCanvas = new OffscreenCanvas(e.data.width, e.data.height);
                    let tempContext = tempCanvas.getContext('2d');

                    if (this.visImg) {
                        tempContext.putImageData(this.visImg, 0, 0);
                    }

                    tempContext.putImageData(
                        imgPart,
                        0,
                        e.data.partStartY,
                        0,
                        0,
                        e.data.width,
                        e.data.partHeight
                    );

                    this.visImg = tempContext.getImageData(0, 0, e.data.width, e.data.height);

                    tempCanvas = null;
                    tempContext = null;

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
            
            this.mapsContainer = null;
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

            this.effectManager = null;
        }

        initMaps(visCanvas, previewCanvas, mapsContainer, visualContainer, hoverX = 0, hoverY = 0) {
            this.visCanvas = visCanvas;
            this.previewCanvas = previewCanvas;

            this.mapsContainer = mapsContainer;
            this.visualContainer = visualContainer;

            let currentMapMagnif = Math.round(this.mapMagnif);
            let strokeW = this.visCanvas.width * currentMapMagnif / this.visMagnif;

            let lastMapCanvas = document.createElement('canvas');

            lastMapCanvas.width = mapWidth;
            lastMapCanvas.height = mapHeight;
        
            let li = $('<div class="li"></div>');
            let span = $('<span></span>');
            
            span.html(Math.round(currentMapMagnif));
            $(this.mapsContainer).append(li.toggleClass('loading', true).append(span).append(lastMapCanvas));

            while (strokeW < this.minStrokeW) {
                let nextMapCanvas = document.createElement('canvas');

                nextMapCanvas.width = mapWidth;
                nextMapCanvas.height = mapHeight;
            
                let li = $('<div class="li"></div>');
                let span = $('<span></span>');
                
                span.html(Math.round(currentMapMagnif * this.visCanvas.width / this.minStrokeW));
                $(this.mapsContainer).append(li.toggleClass('loading', true).append(span).append(nextMapCanvas));

                let currentPair = new MapVisualPair;
                
                currentPair.visMagnif = Math.round(currentMapMagnif * this.visCanvas.width / this.minStrokeW);
                currentPair.visCenterX = hoverX;
                currentPair.visCenterY = hoverY;

                currentPair.visCanvasWidth = previewCanvas.width;
                currentPair.visCanvasHeight = previewCanvas.height;
            
                currentPair.mapMagnif = Math.round(currentMapMagnif);
                currentPair.mapCenterX = this.pairs.length ? hoverX : 0;
                currentPair.mapCenterY = this.pairs.length ? hoverY : 0;
            
                currentPair.init(lastMapCanvas, this.previewCanvas);

                this.pairs.push(currentPair);

                lastMapCanvas = nextMapCanvas;

                currentMapMagnif = Math.round(currentMapMagnif * this.visCanvas.width / this.minStrokeW);
                strokeW = this.visCanvas.width * currentMapMagnif / this.visMagnif;

            }
            
            this.pairMain = new MapVisualPair;

            this.pairMain.visMagnif = this.visMagnif;
            this.pairMain.visCenterX = hoverX;
            this.pairMain.visCenterY = hoverY;

            this.pairMain.visCanvasWidth = previewCanvas.width;
            this.pairMain.visCanvasHeight = previewCanvas.height;

            this.pairMain.mapMagnif = currentMapMagnif;
            this.pairMain.mapCenterX = hoverX;
            this.pairMain.mapCenterY = hoverY;

            this.pairMain.init(lastMapCanvas, this.previewCanvas, this.visCanvas);

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

            let em = this.effectManager;

            if (!em && typeof effectManager !== 'undefined') {
                em = effectManager;
            }

            if (em) {
                if (em.zooming || em.zoomGlobalID) {
                    return;
                }
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

            let em = this.effectManager;

            if (!em && typeof effectManager !== 'undefined') {
                em = effectManager;
            }

            if (em) {
                if (em.zooming || em.zoomGlobalID) {
                    return;
                }
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
    
            this.pairMain.drawMapHoverArea(- offsetX / this.pairMain.visMagnif, offsetY / this.pairMain.visMagnif);
    
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
    
                this.pairMain.drawMapHoverArea(- offsetX / this.pairMain.visMagnif, offsetY / this.pairMain.visMagnif);
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
            let em = this.effectManager;

            if (!em && typeof effectManager !== 'undefined') {
                em = effectManager;
            }

            if (em) {
                if (em.zooming || em.zoomGlobalID) {
                    return;
                }
            }

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
                    $(this.mapsContainer).append(li.toggleClass('loading', true).append(span).append(nextMapCanvas));
    
                    let currentPair = new MapVisualPair;
                    
                    currentPair.visMagnif = Math.round(currentMapMagnif * this.visCanvas.width / this.minStrokeW);
                    currentPair.visCenterX = hoverX;
                    currentPair.visCenterY = hoverY;
    
                    currentPair.visCanvasWidth = previewCanvas.width;
                    currentPair.visCanvasHeight = previewCanvas.height;
                
                    currentPair.mapMagnif = Math.round(currentMapMagnif);
                    currentPair.mapCenterX = this.pairs.length ? this.pairMain.visCenterX : 0;
                    currentPair.mapCenterY = this.pairs.length ? this.pairMain.visCenterY : 0;
                
                    currentPair.init(lastMapCanvas, this.previewCanvas);
    
                    this.pairs.push(currentPair);
    
                    lastMapCanvas = nextMapCanvas;
    
                    currentMapMagnif = Math.round(currentMapMagnif * this.visCanvas.width / this.minStrokeW);
                    strokeW = this.visCanvas.width * currentMapMagnif / this.visMagnif;    
                }

                this.pairs.push(this.pairMain);

                this.pairMain.mapMagnif = currentMapMagnif;
    
                this.pairMain.init(lastMapCanvas, this.previewCanvas, this.visCanvas);
                
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
    
                        this.pairMain.init(this.pairs[i].mapCanvas, this.previewCanvas, this.visCanvas);

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

            if (this.effectManager) {
                this.effectManager.update();
            } else {
                if (typeof effectManager !== 'undefined') {
                    effectManager.update();
                }
            }
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

            if (this.pairMain.visImg) {
                createImageBitmap(this.pairMain.visImg).then(((imgBitmap) => {
                    this.pairMain.visContext.drawImage(
                        imgBitmap,
                        this.pairMain.visCanvas.width - this.wheelCurrentRatio * this.pairMain.visImg.width >> 1,
                        this.pairMain.visCanvas.height - this.wheelCurrentRatio * this.pairMain.visImg.height >> 1,
                        this.pairMain.visImg.width * this.wheelCurrentRatio,
                        this.pairMain.visImg.height * this.wheelCurrentRatio
                    );
        
                    this.pairMain.drawMapHoverArea();
                }).bind(this));
            }
    
            this.wheelGlobalID = window.requestAnimationFrame(this.pairMainStepWheel.bind(this));
        }
    }

    class EffectManager {
        constructor() {
            this.minimapManager = null;

            this.controlsInit = false;

            this.currentEffect = null;
            this.noEffectsText = null;

            this.currentPreviewEffect = null;
            this.noPreviewEffectsText = null;

            this.scrollbarInstance = null;

            this.zooming = false;
            this.zoomingDestID = null;
            this.zoomingDelta = null;
            this.zoomingCurrentStep = null;
            this.zoomGlobalID = null;
        }

        init() {
            if (!this.controlsInit) {
                this.controlsInit = true;

                $('[data-toggle="tooltip"]').tooltip();

                // General page
                
                $('#controlPanelToggler').click((e) => {
                    if ($('#controlPanel').is(":hidden")) {
                        $('#controlPanel').fadeIn();
                        $('#controlPanelToggler').html('<i class="fas fa-angle-right"></i>');
                    } else {
                        $('#controlPanel').fadeOut();
                        $('#controlPanelToggler').html('<i class="fas fa-angle-left"></i>');
                    }
                });

                $('#inputControlPanelWidth').change((e) => {
                    controlPanelWidth = Math.round($('#inputControlPanelWidth').val());
                    $('#controls-container').css('width', controlPanelWidth + 'px');
                }).val(controlPanelWidth);

                $('#inputOverviewWidth').change((e) => {
                    mapWidth = Math.round($('#inputOverviewWidth').val());
                    mapHeight = Math.round(mapWidth * 9 / 16);

                    $(this.minimapManager.mapsContainer).find('canvas').css('width', mapWidth + 'px');
                    $(this.minimapManager.mapsContainer).find('canvas').css('height', mapHeight + 'px');

                    for (let i = 0; i < this.minimapManager.pairs.length; i++) {
                        const element = this.minimapManager.pairs[i];
                        element.destroy();
                    }

                    this.minimapManager.pairs = [];
                    this.minimapManager.pairMain = null;
                    
                    this.minimapManager.initMaps(mainCanvas, previewCanvas, $('#maps-container'), $('#visual-container'), hoverX, hoverY);

                    this.update();
                }).val(mapWidth);

                $('#inputVisualAreaWidth').change((e) => {
                    screenWidth = Math.round($('#inputVisualAreaWidth').val());

                    mainCanvas.width = screenWidth;
                    mainCanvas.height = screenHeight;

                    previewCanvas.width = screenWidth;
                    previewCanvas.height = screenHeight;

                    for (let i = 0; i < this.minimapManager.pairs.length; i++) {
                        const element = this.minimapManager.pairs[i];
                        element.destroy();
                    }

                    this.minimapManager.pairs = [];
                    this.minimapManager.pairMain = null;
                    
                    this.minimapManager.initMaps(mainCanvas, previewCanvas, $('#maps-container'), $('#visual-container'), hoverX, hoverY);

                    this.update();
                }).val(screenWidth);

                $('#inputVisualAreaHeight').change((e) => {
                    screenHeight = Math.round($('#inputVisualAreaHeight').val());

                    mainCanvas.width = screenWidth;
                    mainCanvas.height = screenHeight;
                    
                    previewCanvas.width = screenWidth;
                    previewCanvas.height = screenHeight;

                    for (let i = 0; i < this.minimapManager.pairs.length; i++) {
                        const element = this.minimapManager.pairs[i];
                        element.destroy();
                    }

                    this.minimapManager.pairs = [];
                    this.minimapManager.pairMain = null;
                    
                    this.minimapManager.initMaps(mainCanvas, previewCanvas, $('#maps-container'), $('#visual-container'), hoverX, hoverY);

                    this.update();
                }).val(screenHeight);

                // Effects page

                this.noEffectsText = $('#effectsDropdownBtn').html();

                $('#scrollbarActivator').click((e) => {
                    $('#effectsDropdownBtn').html($('#scrollbarActivator').html());

                    // this.destroyScrollbar();
                    this.destroyStacked();
                    this.destroyTabs();

                    this.initScrollbar();
                });

                $('#stackedActivator').click((e) => {
                    $('#effectsDropdownBtn').html($('#stackedActivator').html());

                    this.destroyScrollbar();
                    // this.destroyStacked();
                    this.destroyTabs();

                    this.initStacked();
                });

                $('#tabsActivator').click((e) => {
                    $('#effectsDropdownBtn').html($('#tabsActivator').html());

                    this.destroyScrollbar();
                    this.destroyStacked();
                    // this.destroyTabs();

                    this.initTabs();
                });

                $('#clearEffectsActivator').click((e) => {
                    $('#effectsDropdownBtn').html(this.noEffectsText);

                    this.destroyScrollbar();
                    this.destroyStacked();
                    this.destroyTabs();
                });

                this.noPreviewEffectsText = $('#previewEffectsDropdownBtn').html();

                $('#fadePreviewActivator').click((e) => {
                    if (this.zooming || this.zoomingDestID) {
                        return;
                    }

                    this.destroyPreview();

                    this.currentPreviewEffect = 'fade';
                    
                    $('#previewEffectsDropdownBtn').html($('#fadePreviewActivator').html());

                    for (let i = 0; i < this.minimapManager.pairs.length; i++) {
                        const pair = this.minimapManager.pairs[i];
                        pair.mouseOverCallback = this.fadeMouseOver;
                        pair.mouseOverCallbackThis = this;
                        pair.mouseOutCallback = this.fadeMouseOut;
                        pair.mouseOutCallbackThis = this;
                    }
                });

                $('#zoomPreviewActivator').click((e) => {
                    if (this.zooming || this.zoomingDestID) {
                        return;
                    }

                    this.destroyPreview();

                    this.currentPreviewEffect = 'zoom';

                    $('#previewEffectsDropdownBtn').html($('#zoomPreviewActivator').html());

                    for (let i = 0; i < this.minimapManager.pairs.length; i++) {
                        const pair = this.minimapManager.pairs[i];
                        pair.mouseOverCallback = this.zoomMouseOver;
                        pair.mouseOverCallbackThis = this;
                        pair.mouseOutCallback = this.zoomMouseOut;
                        pair.mouseOutCallbackThis = this;
                    }
                });

                $('#clearPreviewEffectsActivator').click((e) => {
                    if (this.zooming || this.zoomingDestID) {
                        return;
                    }

                    this.currentPreviewEffect = null;

                    $('#previewEffectsDropdownBtn').html(this.noPreviewEffectsText);

                    this.destroyPreview();
                });

                // Algorithms page
                
                // Info page

                $('#btnGetInfo').click((e) => {
                    this.getInfo($('#infoArea'));
                });
            }
        }

        getInfo(el) {
            let pMapsCount = $('<p />');

            pMapsCount.html('<b>Maps Count:</b> ' + this.minimapManager.pairs.length);

            let divMapsInfo = $('<div />');

            this.minimapManager.pairs.forEach((pair, index) => {

                let pMapInfo = $('<p />');

                pMapInfo.append('<h5>' + 'Map ' + index + '</h5>');

                pMapInfo.append('<span>' + '<b>Minimap Magnification:</b> ' + pair.mapMagnif + '</span>');
                pMapInfo.append('<br/>');

                pMapInfo.append('<span>' + '<b>Visual Magnification:</b> ' + pair.visMagnif + '</span>');
                pMapInfo.append('<br/>');
                
                pMapInfo.append('<span>' + '<b>Map Center X:</b> ' + pair.mapCenterX + '</span>');
                pMapInfo.append('<br/>');

                pMapInfo.append('<span>' + '<b>Map Center Y:</b> ' + pair.mapCenterY + '</span>');
                pMapInfo.append('<br/>');

                pMapInfo.append('<span>' + '<b>Visual Center X:</b> ' + pair.visCenterX + '</span>');
                pMapInfo.append('<br/>');

                pMapInfo.append('<span>' + '<b>Visual Center Y:</b> ' + pair.visCenterY + '</span>');
                pMapInfo.append('<br/>');

                divMapsInfo.append(pMapInfo);
            });

            $(el).html('');

            $(el).append(pMapsCount);
            $(el).append(divMapsInfo);
        }

        fadeMouseOver(e, currentPair) {
            if ($(currentPair.previewCanvas).is(':visible')) {
                $(currentPair.previewCanvas).stop().fadeOut(400, (e) => {
                    if (currentPair.previewImg) {
                        currentPair.previewContext.putImageData(currentPair.previewImg, 0, 0);
                    }

                    currentPair.drawPreviewHoverArea();

                    $(currentPair.previewCanvas).fadeIn();
                });
            } else {
                if (currentPair.previewImg) {
                    currentPair.previewContext.putImageData(currentPair.previewImg, 0, 0);
                }

                currentPair.drawPreviewHoverArea();

                $(currentPair.previewCanvas).fadeIn();
            }
        }

        fadeMouseOut(e, currentPair) {
            $(currentPair.previewCanvas).stop().fadeOut();
        }

        zoomMouseOver(e, currentPair) {
            console.log('zoom mouseOver');

            let destID = null;

            for (let i = 0; i < this.minimapManager.pairs.length; i++) {
                const pair = this.minimapManager.pairs[i];

                console.log('checking', i, 'pair info', pair);
                
                if (pair.previewActive) {
                    destID = i;
                    break;
                }
            }

            if (destID !== null) {

                this.zoomingDestID = destID;

                if (!this.zoomingCurrentStep) {
                    this.zoomingCurrentStep = this.minimapManager.pairs.length;
                }

                this.zooming = true;
        
                if (!this.zoomGlobalID) {
                    this.zoomGlobalID = window.requestAnimationFrame(this.zoomStep.bind(this));
                    console.log('zooming start, dest id', destID);
                }

            }
        }

        zoomStep(timestamp) {
            if (this.zooming) {

                // console.log('before adding', 'this.zoomingDestID', this.zoomingDestID, 'this.zoomingCurrentStep', this.zoomingCurrentStep);

                if (!$(this.minimapManager.previewCanvas).is(':visible')) {
                    $(this.minimapManager.previewCanvas).show(0);
                }

                if (this.zoomingDestID < this.zoomingCurrentStep) {
                    this.zoomingCurrentStep -= 0.01;

                    if (this.zoomingCurrentStep <= this.zoomingDestID) {
                        this.zooming = false;
                        this.zoomingCurrentStep = this.zoomingDestID;
                    }
                } else {
                    if (this.zoomingDestID > this.zoomingCurrentStep) {
                        this.zoomingCurrentStep += 0.01;
    
                        if (this.zoomingCurrentStep >= this.zoomingDestID) {
                            this.zooming = false;
                            this.zoomingCurrentStep = this.zoomingDestID;
                        }
                    } else {
                        this.zooming = false;

                        
                        if (this.zoomingDestID >= this.minimapManager.pairs.length) {
                            console.log('Reached upper zoom cancel');
                            console.log(this.minimapManager.pairs);

                            window.cancelAnimationFrame(this.zoomGlobalID);
                            this.zoomGlobalID = null;
                            
                            this.zoomingDestID = null;
                            this.zoomingCurrentStep = null;

                            $(this.minimapManager.previewCanvas).hide(0);

                            $(this.minimapManager.mapsContainer).find('.li').removeClass('zoom-current');
                        }
                    }
                }
    
                // TODO: Paint

                let previewContext = this.minimapManager.previewCanvas.getContext('2d');

                if (this.zoomingCurrentStep >= this.minimapManager.pairs.length - 1) {

                    let pair = this.minimapManager.pairs[this.minimapManager.pairs.length - 1];

                    let largeImg = this.minimapManager.pairs[this.minimapManager.pairs.length - 1].previewImg;
                    let smallImg = this.minimapManager.pairs[this.minimapManager.pairs.length - 1].visImg;

                    let percent = this.zoomingCurrentStep - Math.floor(this.zoomingCurrentStep);
                    let ultResult = pair.mapMagnif + (pair.visMagnif - pair.mapMagnif) * percent;

                    createImageBitmap(largeImg).then(((imgBitmapLarge) => {           
                        createImageBitmap(smallImg).then(((imgBitmapSmall) => {
                            previewContext.drawImage(
                                imgBitmapLarge,
                                this.minimapManager.previewCanvas.width - pair.previewImg.width * ultResult / pair.mapMagnif >> 1,
                                this.minimapManager.previewCanvas.height - pair.previewImg.height * ultResult / pair.mapMagnif >> 1,
                                pair.previewImg.width * ultResult / pair.mapMagnif,
                                pair.previewImg.height * ultResult / pair.mapMagnif
                            );

                            previewContext.drawImage(
                                imgBitmapSmall,
                                this.minimapManager.previewCanvas.width - pair.visImg.width * ultResult / pair.visMagnif >> 1,
                                this.minimapManager.previewCanvas.height - pair.visImg.height * ultResult / pair.visMagnif >> 1,
                                pair.visImg.width * ultResult / pair.visMagnif,
                                pair.visImg.height * ultResult / pair.visMagnif
                            );

                            previewContext.beginPath();
                            previewContext.lineWidth = 1;
                            previewContext.strokeStyle = 'rgba(31, 123, 187, 3)';
                            previewContext.strokeRect(
                                this.minimapManager.previewCanvas.width - pair.previewImg.width * ultResult / pair.visMagnif >> 1,
                                this.minimapManager.previewCanvas.height - pair.previewImg.height * ultResult / pair.visMagnif >> 1,
                                pair.previewImg.width * ultResult / pair.visMagnif,
                                pair.previewImg.height * ultResult / pair.visMagnif
                            );
                        }).bind(this));
                    }).bind(this));

                    $(this.minimapManager.mapsContainer).find('.li').removeClass('zoom-current');
                    $(this.minimapManager.pairs[this.minimapManager.pairs.length - 1].mapCanvas).parent().toggleClass('zoom-current', true);
                } else {
                    let largePair = this.minimapManager.pairs[Math.floor(this.zoomingCurrentStep)];
                    let smallPair = this.minimapManager.pairs[Math.floor(this.zoomingCurrentStep) + 1];

                    let largeImg = largePair.previewImg;
                    let smallImg = smallPair.previewImg;

                    let percent = this.zoomingCurrentStep - Math.floor(this.zoomingCurrentStep);
                    let ultResult = largePair.mapMagnif + (smallPair.mapMagnif - largePair.mapMagnif) * percent;

                    createImageBitmap(largeImg).then(((imgBitmapLarge) => {            
                        createImageBitmap(smallImg).then(((imgBitmapSmall) => {
                            previewContext.drawImage(
                                imgBitmapLarge,
                                this.minimapManager.previewCanvas.width - largePair.previewImg.width * ultResult / largePair.mapMagnif >> 1,
                                this.minimapManager.previewCanvas.height - largePair.previewImg.height * ultResult / largePair.mapMagnif >> 1,
                                largePair.previewImg.width * ultResult / largePair.mapMagnif,
                                largePair.previewImg.height * ultResult / largePair.mapMagnif
                            );

                            previewContext.drawImage(
                                imgBitmapSmall,
                                this.minimapManager.previewCanvas.width - smallPair.previewImg.width * ultResult / smallPair.mapMagnif >> 1,
                                this.minimapManager.previewCanvas.height - smallPair.previewImg.height * ultResult / smallPair.mapMagnif >> 1,
                                smallPair.previewImg.width * ultResult / smallPair.mapMagnif,
                                smallPair.previewImg.height * ultResult / smallPair.mapMagnif
                            );

                            previewContext.beginPath();
                            previewContext.lineWidth = 1;
                            previewContext.strokeStyle = 'rgba(123, 31, 187, 1)';
                            previewContext.strokeRect(
                                this.minimapManager.previewCanvas.width - smallPair.previewImg.width * ultResult / smallPair.mapMagnif >> 1,
                                this.minimapManager.previewCanvas.height - smallPair.previewImg.height * ultResult / smallPair.mapMagnif >> 1,
                                smallPair.previewImg.width * ultResult / smallPair.mapMagnif,
                                smallPair.previewImg.height * ultResult / smallPair.mapMagnif
                            );
                        }).bind(this));
                    }).bind(this));

                    $(this.minimapManager.mapsContainer).find('.li').removeClass('zoom-current');
                    $(this.minimapManager.pairs[Math.floor(this.zoomingCurrentStep)].mapCanvas).parent().toggleClass('zoom-current', true);
                }

                // console.log('after //paint', 'this.zoomingDestID', this.zoomingDestID, 'this.zoomingCurrentStep', this.zoomingCurrentStep);
            }

            if (this.zoomingDestID === this.zoomingCurrentStep && this.zoomingDestID >= this.minimapManager.pairs.length) {
                console.log('Reached lower zoom cancel');
                console.log(this.minimapManager.pairs);

                window.cancelAnimationFrame(this.zoomGlobalID);
                this.zoomGlobalID = null;
                
                this.zoomingDestID = null;
                this.zoomingCurrentStep = null;

                $(this.minimapManager.previewCanvas).hide(0);
                
                $(this.minimapManager.mapsContainer).find('.li').removeClass('zoom-current');
            } else {
                this.zoomGlobalID = window.requestAnimationFrame(this.zoomStep.bind(this));
            }
        }

        zoomMouseOut(e, currentPair) {
            console.log('zoom mouseOut', e, currentPair);

            if (!this.zoomGlobalID) {
                return;
            }

            this.zoomingDestID = this.minimapManager.pairs.length;

            if (!this.zooming) {
                this.zooming = true;
            }
        }

        updatePreview() {
            if (this.currentPreviewEffect === 'fade') {
                this.updateFadePreview();
            }

            if (this.currentPreviewEffect === 'zoom') {
                this.updateZoomPreview();
            }

            if (!this.currentPreviewEffect) {
                this.destroyPreview();
            }
        }

        updateFadePreview() {
            for (let i = 0; i < this.minimapManager.pairs.length; i++) {
                const pair = this.minimapManager.pairs[i];
                pair.mouseOverCallback = this.fadeMouseOver;
                pair.mouseOverCallbackThis = this;
                pair.mouseOutCallback = this.fadeMouseOut;
                pair.mouseOutCallbackThis = this;
            }
        }

        updateZoomPreview() {
            for (let i = 0; i < this.minimapManager.pairs.length; i++) {
                const pair = this.minimapManager.pairs[i];
                pair.mouseOverCallback = this.zoomMouseOver;
                pair.mouseOverCallbackThis = this;
                pair.mouseOutCallback = this.zoomMouseOut;
                pair.mouseOutCallbackThis = this;
            }
        }

        destroyPreview() {
            this.currentPreviewEffect = null;

            for (let i = 0; i < this.minimapManager.pairs.length; i++) {
                const pair = this.minimapManager.pairs[i];
                pair.mouseOverCallback = null;
                pair.mouseOverCallbackThis = null;
                pair.mouseOutCallback = null;
                pair.mouseOutCallbackThis = null;
            }

            $('#maps-container').find('li').removeClass('zoom-current');
        }

        destroy() {
            this.destroyScrollbar();
            this.destroyStacked();
            this.destroyTabs();
            this.destroyPreview();
        }

        update() {
            if (this.currentEffect === 'scrollbar') {
                this.updateScrollbar();
            }

            if (this.currentEffect === 'stacked') {
                this.updateStacked();
            }

            if (this.currentEffect === 'tabs') {
                this.updateTabs();
            }

            this.updatePreview();
        }

        initScrollbar() {
            if (this.currentEffect === 'scrollbar') {
                return;
            }

            this.currentEffect = 'scrollbar';

            if (this.scrollbarInstance) {
                this.destroyScrollbar();
            }

            // $(this.minimapManager.mapsContainer).css('width', mapWidth + 22 + 'px');
            this.scrollbarInstance = new MiniBar($(this.minimapManager.mapsContainer)[0], {
                scrollX: false,
                scrollY: true,
                alwaysShowBars: true,
                onUpdate() {
                    this.scrollTo("end", "y");
                }
            });

            this.scrollbarInstance.scrollTo("end", "y");

            this.minimapManager.mapsContainer = $(this.minimapManager.mapsContainer).find('.mb-content').first();

            // this.scrollbarInstance.update();

            $('#maps-container').toggleClass('osx-dock', true);
        }

        destroyScrollbar() {
            this.currentEffect = null;

            console.log('pre destroy', this.scrollbarInstance);

            if (this.scrollbarInstance) {
                this.scrollbarInstance.destroy();

                console.log('destroy', this.scrollbarInstance);

                this.scrollbarInstance = null;
                this.minimapManager.mapsContainer = $('#maps-container');
            }
            
            $('#maps-container').removeClass('osx-dock');
        }

        updateScrollbar() {
            if (this.currentEffect !== 'scrollbar') {
                return;
            }

            if (this.scrollbarInstance) {
                this.scrollbarInstance.update();
            }
        }

        initStacked() {
            if (this.currentEffect === 'stacked') {
                return;
            }

            this.currentEffect = 'stacked';

            this.updateStacked();
        }

        destroyStacked() {
            this.currentEffect = null;

            $('#maps-container').removeClass('stacked');
            $('#maps-container').css('height', '');

            for (let i = 0, len = this.minimapManager.pairs.length; i < len; i++) {
                const pair = this.minimapManager.pairs[i];

                $(pair.mapCanvas).parent().css('margin-top', '').css('margin-bottom', '');                
                $(pair.mapCanvas).css('transform', '');
            }

        }

        updateStacked() {
            if (this.currentEffect !== 'stacked') {
                return;
            }

            let currentMapsBottom = (this.minimapManager.pairs.length + 1) * (mapHeight + 2 + 10) + 10;
            let perMapHeight = Math.floor((screenHeight - 10 - mapHeight - 2 - 10 - 1) / (this.minimapManager.pairs.length - 1)) - 2;
            let avgMargin = perMapHeight - mapHeight - 2;
            let firstMargin = avgMargin - (10 - avgMargin);
            let stepMargin = (10 - avgMargin) * 2 / (this.minimapManager.pairs.length - 1);

            if (firstMargin <= -mapHeight + 5) {
                firstMargin = -mapHeight + 5;
                stepMargin = (avgMargin - firstMargin) * 2 / (this.minimapManager.pairs.length - 1);                
            }

            if (currentMapsBottom > screenHeight) {
                $('#maps-container').toggleClass('stacked', true);

                $('#maps-container').css('height', 'calc(100vh - ' + (mapHeight + 10) + 'px' + ')');

                for (let i = 0, len = this.minimapManager.pairs.length; i < len; i++) {
                    const pair = this.minimapManager.pairs[i];

                    if (i === 0) {
                        // $(pair.mapCanvas).parent().css('margin-top', '10px');
                    } else {
                        // $(pair.mapCanvas).parent().css('margin-top', (firstMargin + stepMargin * i) + 'px');
                    }

                    '-webkit-transform'
                    '-moz-transform'
                    '-ms-transform'
                    '-o-transform'
                    'transform'

                    // $(pair.mapCanvas).parent().css('perspective', (160 + i * 60 / this.minimapManager.pairs.length) + 'px');
                    $(pair.mapCanvas).css('transform', 'rotateX(' + (- 45 + i * 30 / this.minimapManager.pairs.length) + 'deg)');

                    $(pair.mapCanvas).tooltip('dispose').tooltip({
                        placement: 'right',
                        title: $(pair.mapCanvas).parent().find('span').html(),
                    });
                    
                }
            }
        }

        initTabs() {
            if (this.currentEffect === 'tabs') {
                return;
            }

            this.currentEffect = 'tabs';

            this.updateTabs();
        }

        destroyTabs() {
            this.currentEffect = null;

            $('#maps-container').removeClass('tabs');
            $('#maps-container').css('width', '');

            for (let i = 0, len = this.minimapManager.pairs.length; i < len; i++) {
                const pair = this.minimapManager.pairs[i];

                $(pair.mapCanvas).parent().css('flex', '');
                $(pair.mapCanvas).parent().css('height', '');
                
                $(pair.mapCanvas).css('position', '');
                $(pair.mapCanvas).css('left', '');
                $(pair.mapCanvas).css('margin-left', '');
                
                $(pair.mapCanvas).tooltip('dispose');
            }
        }

        updateTabs() {
            if (this.currentEffect !== 'tabs') {
                return;
            }

            $('#maps-container').toggleClass('tabs', true);
            $('#maps-container').css('width', 'calc(100vw - ' + (controlPanelWidth + 10) + 'px' + ')');
            
            let currentMapsRight = this.minimapManager.pairs.length * (mapWidth + 2 + 10) + 10;
            let containerMaxWidth = screenWidth - controlPanelWidth - 10;

            if (currentMapsRight < containerMaxWidth) {
                for (let i = 0, len = this.minimapManager.pairs.length; i < len; i++) {
                    const pair = this.minimapManager.pairs[i];

                    $(pair.mapCanvas).parent().css('flex', 'none');
                    $(pair.mapCanvas).parent().css('height', '');
                    
                    $(pair.mapCanvas).css('position', '');
                    $(pair.mapCanvas).css('left', '');
                    $(pair.mapCanvas).css('margin-left', '');
                    
                    $(pair.mapCanvas).tooltip('dispose').tooltip({
                        placement: 'bottom',
                        title: $(pair.mapCanvas).parent().find('span').html(),
                    });
                }
            } else {
                for (let i = 0, len = this.minimapManager.pairs.length; i < len; i++) {
                    const pair = this.minimapManager.pairs[i];

                    $(pair.mapCanvas).parent().css('flex', '');
                    $(pair.mapCanvas).parent().css('height', mapHeight + 2 + 'px');
                    
                    $(pair.mapCanvas).css('position', 'absolute');
                    $(pair.mapCanvas).css('left', '50%');
                    $(pair.mapCanvas).css('margin-left', - (mapWidth + 2 >> 1) + 'px');
                    
                    $(pair.mapCanvas).tooltip('dispose').tooltip({
                        placement: 'bottom',
                        title: $(pair.mapCanvas).parent().find('span').html(),
                    });
                }
            }
        }
    }

    // var screenWidth = 1440;
    // var screenHeight = 821;

    var screenWidth = 1920;
    var screenHeight = 978;

    var mapWidth = 160;
    var mapHeight = 90;

    var controlPanelWidth = 400;

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

    var minimapManager = new MinimapManager;
    
    minimapManager.visMagnif = visMagnif;
    minimapManager.mapMagnif = mapMagnif;
    
    minimapManager.initMaps(mainCanvas, previewCanvas, $('#maps-container'), $('#visual-container'), hoverX, hoverY);
    minimapManager.initPairMainDrag();
    minimapManager.initPairMainWheel();

    var effectManager = new EffectManager;
    effectManager.minimapManager = minimapManager;
    effectManager.init();

    minimapManager.effectManager = effectManager;

    // $(document).keydown(function(e) {
    //     // Numpad +
    //     if (e.keyCode === 107 || e.keyCode === 187) {
    //         actualMagif *= 2;

    //         naiveWorker.work(actualMagif, hoverX, hoverY, screenWidth << 1, screenHeight << 1);
    //     }

    //     // Numpad -
    //     if (e.keyCode === 109 || e.keyCode === 189) {
    //         actualMagif *= 0.5;

    //         naiveWorker.work(actualMagif, hoverX, hoverY, screenWidth << 1, screenHeight << 1);
    //     }

    //     // ArrowUp
    //     if (e.keyCode === 38 || e.keyCode === 87) {
    //         hoverY += 100 / actualMagif;

    //         naiveWorker.work(actualMagif, hoverX, hoverY, screenWidth << 1, screenHeight << 1);
    //     }

    //     // ArrowDown
    //     if (e.keyCode === 40 || e.keyCode === 83) {
    //         hoverY -= 100 / actualMagif;

    //         naiveWorker.work(actualMagif, hoverX, hoverY, screenWidth << 1, screenHeight << 1);
    //     }

    //     // ArrowLeft
    //     if (e.keyCode === 37 || e.keyCode === 65) {
    //         hoverX -= 100 / actualMagif;

    //         naiveWorker.work(actualMagif, hoverX, hoverY, screenWidth << 1, screenHeight << 1);
    //     }

    //     // ArrowRight
    //     if (e.keyCode === 39 || e.keyCode === 68) {
    //         hoverX += 100 / actualMagif;

    //         naiveWorker.work(actualMagif, hoverX, hoverY, screenWidth << 1, screenHeight << 1);
    //     }
    // });

})()