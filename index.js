(function () {
    let canvas = document.getElementById("my-canvas");
    let inc = canvas.getContext("2d");
    let img = document.createElement("img");
    let out = document.getElementById("output-canvas").getContext("2d");

    // Adding instructions
    inc.save();
    inc.fillStyle = "#eee";
    inc.font = "20px sans-serif";
    inc.textAlign = "center";
    inc.fillText("(ここに画像ファイルをドロップ)", canvas.width/2, canvas.height/2);
    inc.restore();


    // function typeSelected() {
    //     let selectElt = document.getElementById("type");
    //     console.log(selectElt.selectedOptions[0].attributes['name'].value);
    //     return selectElt.selectedOptions[0].attributes['name'].value;
    // }

    // let select = document.getElementById("type");
    // select.addEventListener("change", function () {
    //     clearCanvas();
    //     let rect = shrink(img.width, img.height, 800, 600);
    //     inc.drawImage(img, rect.left, rect.top, rect.width, rect.height);
    //     applyRgbMatrix(inc, matrices[typeSelected()], 800, 600);
    // });

    let btn = document.getElementById("recur-btn");
    btn.addEventListener("click", function(evt) {
        inc.canvas.width = out.canvas.width;
        inc.canvas.height = out.canvas.height;

        inc.clearRect(0, 0, inc.canvas.width, inc.canvas.height);
        inc.drawImage(out.canvas, 0, 0);

        out.canvas.width = inc.canvas.width * 2;
        out.canvas.height = inc.canvas.height * 2;

        out.clearRect(0, 0, out.canvas.width, out.canvas.height);
        scaleImage(inc, out, inc.canvas.width, inc.canvas.height);
    });

    let getPixel = function(imageData, x, y) {
        if (y < 0  || y >= imageData.height ||
            x < 0  || x >= imageData.width)
            return undefined;

        let offset = 4*(y * imageData.width + x);
        return [
            imageData.data[offset + 0],
            imageData.data[offset + 1],
            imageData.data[offset + 2],
            imageData.data[offset + 3]
        ];
    }

    let putPixel = function(imageData, x, y, pixel) {
        let offset = 4*(y * imageData.width + x);

        if (pixel.length !== 4)
            throw new Error("pixel length error");

        for (let i = 0; i < pixel.length; i++)
            imageData.data[offset + i] = pixel[i];
    }

    let pEq = function(p1, p2) {
        if (p1.length !== p2.length)
            throw Error("pixel dimension mismatch");

        for (let i = 0; i < p1.length; i++) {
            if (p1[i] !== p2[i]) {
                return false;
            }
        }
        return true;
    };

    let epx = function(p, a, b, c, d) {
        // 1=P; 2=P; 3=P; 4=P;
        // IF C==A AND C!=D AND A!=B => 1=A
        // IF A==B AND A!=C AND B!=D => 2=B
        // IF D==C AND D!=B AND C!=A => 3=C
        // IF B==D AND B!=A AND D!=C => 4=D

        let p1, p2, p3, p4;

        p1 = p2 = p3 = p4 = p;
        if (pEq(c, a) && !pEq(c, d) && !pEq(a, b)) p1 = a;
        if (pEq(a, b) && !pEq(a, c) && !pEq(b, d)) p2 = b;
        if (pEq(d, c) && !pEq(d, b) && !pEq(c, a)) p3 = c;
        if (pEq(b, d) && !pEq(b, a) && !pEq(d, c)) p4 = d;
        return [p1, p2, p3, p4];
    };

    let isCheckerPattern = function (id, x, y) {
        let p1 = getPixel(id, x, y);
        let p2 = getPixel(id, x+1, y);
        let p3 = getPixel(id, x, y+1);
        let p4 = getPixel(id, x+1, y+1);

        if (!(p1&&p2&&p3&&p4))
            throw new Error("undefined pixel");


        // if (pEq(p1,p3) && pEq(p2,p4))
        //     return true;
        // else
        //     return false;
        if (pEq(p1, p4) && pEq(p2, p3) && !pEq(p1, p2)) {
            if (pEq(p1, getPixel(id, x, y-1) || p1) &&
                pEq(p1, getPixel(id, x-1, y) || p1) &&
                pEq(p2, getPixel(id, x+1, y-1) || p2) &&
                pEq(p2, getPixel(id, x+2, y) || p2) &&
                pEq(p3, getPixel(id, x-1, y+1) || p3) &&
                pEq(p3, getPixel(id, x, y+2) || p3) &&
                pEq(p4, getPixel(id, x+2, y+1) || p4) &&
                pEq(p4, getPixel(id, x+1, y+2) || p4))
                return true;
            else
                return false;
        } else {
            return false;
        }
    };

    let scaleImage = function (srcCtx, dstCtx, width, height) {
        let src = srcCtx.getImageData(0, 0, width, height);
        let dst = dstCtx.getImageData(0, 0, width*2, height*2);

        let locked = [];

        for (let y = 0; y < height - 1; y++) {
            for (let x = 0; x < width - 1; x++) {
                let b = isCheckerPattern(src, x, y);
                if (b) {
                    locked[y*width+x] =
                        locked[y*width+(x+1)] =
                        locked[(y+1)*width+x] =
                        locked[(y+1)*width+(x+1)] = true;
                }
            }
        }
        console.log(locked);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (locked[y*width+x]) {
                    let p;

                    p = getPixel(src, x, y);
                    putPixel(dst, 2*x,   2*y, p);
                    putPixel(dst, 2*x+1, 2*y, p);
                    putPixel(dst, 2*x,   2*y+1, p);
                    putPixel(dst, 2*x+1, 2*y+1, p);
                } else {
                    let p, a, b, c, d;

                    p = getPixel(src, x, y);
                    a = getPixel(src, x, y-1) || p;
                    b = getPixel(src, x+1, y) || p;
                    c = getPixel(src, x-1, y) || p;
                    d = getPixel(src, x, y+1) || p;

                    let [p1, p2, p3, p4] = epx(p, a, b, c, d);

                    putPixel(dst, 2*x,   2*y, p1);
                    putPixel(dst, 2*x+1, 2*y, p2);
                    putPixel(dst, 2*x,   2*y+1, p3);
                    putPixel(dst, 2*x+1, 2*y+1, p4);
                }
            }
        }
        dstCtx.putImageData(dst, 0, 0);
    };

    // Image for loading
    img.addEventListener("load", function () {
        canvas.width = img.width;
        canvas.height = img.height;

        inc.clearRect(0, 0, canvas.width, canvas.height);
        inc.drawImage(img, 0, 0);

        out.clearRect(0, 0, out.canvas.width, out.canvas.height);

        out.canvas.width = img.width * 2;
        out.canvas.height = img.height * 2;
        scaleImage(inc, out, img.width, img.height);
        //out.drawImage(img, 0, 0, img.width * 2, img.height*2);
    }, false);

    // (sWidth, sHeight, dWidth, dHeight) → {left, top, width, height}
    let shrink = function (sWidth, sHeight, dWidth, dHeight) {
        let sRatio = sWidth / sHeight;
        let dRatio = dWidth / dHeight;

        if (sRatio > dRatio) { // 横長画像
            let factor = dWidth / sWidth;
            let h = sHeight*factor;
            return { width: dWidth, height: h, left: 0, top: (dHeight - h)/2 };
        } else {
            let factor = dHeight / sHeight;
            let w = sWidth*factor;
            return { width: w, height: dHeight, left: (dWidth - w)/2, top: 0 };
        }
    }

    // To enable drag and drop
    document.addEventListener("dragover", function (evt) {
        evt.preventDefault();
    }, false);

    // Handle dropped image file - only Firefox and Google Chrome
    document.addEventListener("drop", function (evt) {
        let files = evt.dataTransfer.files;
        if (files.length > 0) {
            let file = files[0];
            if (typeof FileReader !== "undefined" && file.type.indexOf("image") != -1) {
                let reader = new FileReader();
                // Note: addEventListener doesn't work in Google Chrome for this event
                reader.onload = function (evt) {
                    img.src = evt.target.result;
                };
                reader.readAsDataURL(file);
            }
        }
        evt.preventDefault();
    }, false);
})();
