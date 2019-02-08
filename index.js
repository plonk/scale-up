// 自己ダウンロード
var files = ["index.html", "jszip.js", "index.js", "index.css", "hiza.png", "pcgw.png"];
function handleDownload() {
  var link = document.getElementById("download-link");
  if (!link.href.match(/#$/))
    return;

  var zip = new JSZip();
  Promise.all(
    files.map(function(f){
      return fetch(f).then(function(r) { zip.file(f, r.blob()); });
    })
  ).then(function() {
    zip.generateAsync({type:"blob"})
      .then(function(content) {
        var link = document.getElementById("download-link");
        link.href = URL.createObjectURL(content);
        link.click();
      });
  });
}

function getPixel(imageData, x, y) {
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

function putPixel(imageData, x, y, pixel) {
  let offset = 4*(y * imageData.width + x);

  if (pixel.length !== 4)
    throw new Error("pixel length error");

  for (let i = 0; i < pixel.length; i++)
    imageData.data[offset + i] = pixel[i];
}

// 4要素のuchar配列で表わされるRGBAピクセルの等価性判定。
function pEq(p1, p2) {
  if (p1.length !== p2.length)
    throw Error("pixel dimension mismatch");

  for (let i = 0; i < p1.length; i++) {
    if (p1[i] !== p2[i]) {
      return false;
    }
  }
  return true;
}

// Eric's Pixel Expansion アルゴリズム。
// ピクセルPと周辺のピクセルA,B,C,D を与えられた時に、
// P の拡大である2x2ブロック、P1,P2,P3,P4 を出力する。
//
//  |A|
// -+-+-
// C|P|B
// -+-+-
//  |D|
//
//  P1|P2
//  --+--
//  P3|P4
//
function epx(p, a, b, c, d) {
    let p1, p2, p3, p4;

    p1 = p2 = p3 = p4 = p;
    if (pEq(c, a) && !pEq(c, d) && !pEq(a, b)) p1 = a;
    if (pEq(a, b) && !pEq(a, c) && !pEq(b, d)) p2 = b;
    if (pEq(d, c) && !pEq(d, b) && !pEq(c, a)) p3 = c;
    if (pEq(b, d) && !pEq(b, a) && !pEq(d, c)) p4 = d;
    return [p1, p2, p3, p4];
}

function scaleImage(srcCtx, dstCtx, width, height, defractalize) {
    let src = srcCtx.getImageData(0, 0, width, height);
    let dst = dstCtx.getImageData(0, 0, width*2, height*2);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
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

    if (defractalize) {
        for (let y = 0; y < height*2 - 3; y += 2) {
            for (let x = 0; x < width*2 - 3; x += 2) {
                if (isCheckerPattern(dst, x, y)) {
                    fixCheckerPattern(dst, x, y);
                }
            }
        }
    }

    dstCtx.putImageData(dst, 0, 0);
}

function isCheckerPattern(id, x, y) {
    let p0 = getPixel(id, x+2, y);
    let p1 = getPixel(id, x, y);

    if (pEq(p0,p1))
        return false;

    let dy = 0;
    for (let row of [[1, 1, 0, 0],
                     [1, 0, 1, 0],
                     [0, 1, 0, 1],
                     [0, 0, 1, 1]]) {
        let dx = 0;
        for (let elt of row) {
            if (elt == 0) {
                if (!pEq(p0, getPixel(id, x+dx, y+dy)))
                    return false;
            } else {
                if (!pEq(p1, getPixel(id, x+dx, y+dy)))
                    return false;
            }
            dx++;
        }
        dy++;
    }
    return true;
}

// パターンAをパターンBに変更する。
// A:
// 1 1 0 0
// 1 0 1 0
// 0 1 0 1
// 0 0 1 1
//
// B:
// 1 1 0 0
// 1 1 0 0
// 0 0 1 1
// 0 0 1 1
function fixCheckerPattern(id, x, y) {
    let p0 = getPixel(id, x+2, y);
    let p1 = getPixel(id, x, y);

    putPixel(id, x+1, y+1, p1);
    putPixel(id, x+2, y+1, p0);
    putPixel(id, x+1, y+2, p0);
    putPixel(id, x+2, y+2, p1);
}

(function () {
    // ドキュメントにドロップされた画像ファイルは img にロードされ、入
    // 力キャンバスに転写される。
    let inc = document.getElementById("input-canvas").getContext("2d");
    let out = document.getElementById("output-canvas").getContext("2d");
    let img = document.createElement("img");

    let btn = document.getElementById("recur-btn");
    btn.addEventListener("click", function(evt) {
        inc.canvas.width = out.canvas.width;
        inc.canvas.height = out.canvas.height;

        inc.clearRect(0, 0, inc.canvas.width, inc.canvas.height);
        inc.drawImage(out.canvas, 0, 0);

        out.canvas.width = inc.canvas.width * 2;
        out.canvas.height = inc.canvas.height * 2;

        out.clearRect(0, 0, out.canvas.width, out.canvas.height);
        scaleImage(inc, out, inc.canvas.width, inc.canvas.height, document.getElementById("defractalize").checked);
    });

    // Image for loading
    img.addEventListener("load", function () {
        inc.canvas.width = img.width;
        inc.canvas.height = img.height;

        inc.clearRect(0, 0, inc.canvas.width, inc.canvas.height);
        inc.drawImage(img, 0, 0);

        out.clearRect(0, 0, out.canvas.width, out.canvas.height);

        out.canvas.width = img.width * 2;
        out.canvas.height = img.height * 2;
        scaleImage(inc, out, img.width, img.height, document.getElementById("defractalize").checked);
    }, false);

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

    document.getElementById("sample-menu").addEventListener("change", function(ev){
        if (this.selectedOptions[0] && this.selectedOptions[0].value !== "") {
            fetch(this.selectedOptions[0].value).then(function(r) {
                let reader = new FileReader();
                reader.onload = function (evt) {
                    img.src = evt.target.result;
                };
                r.blob().then(function(b) {
                    reader.readAsDataURL(b);
                });
            });
            this.selectedIndex = 0;
        }
    });
})();
