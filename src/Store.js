const axios = require('axios');
const { createCanvas, Image } = require('canvas');

const decode_colors = {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    a: 10,
    b: 11,
    c: 12,
    d: 13,
    e: 14,
    f: 15,
    g: 16,
    h: 17,
    i: 18,
    j: 19,
    k: 20,
    l: 21,
    m: 22,
    n: 23,
    o: 24,
    p: 25
};
const colors = [
    [255, 255, 255, 0], // #FFFFFF
    [194, 194, 194, 1], // #C2C2C2
    [133, 133, 133, 2], // #858585
    [71, 71, 71, 3], // #474747
    [0, 0, 0, 4], // #000000
    [58, 175, 255, 5], // #3AAFFF
    [113, 170, 235, 6], // #71AAEB
    [74, 118, 168, 7], // #4a76a8
    [7, 75, 243, 8], // #074BF3
    [94, 48, 235, 9], // #5E30EB
    [255, 108, 91, 10], // #FF6C5B
    [254, 37, 0, 11], // #FE2500
    [255, 33, 139, 12], // #FF218B
    [153, 36, 79, 13], // #99244F
    [77, 44, 156, 14], // #4D2C9C
    [255, 207, 74, 15], // #FFCF4A
    [254, 180, 63, 16], // #FEB43F
    [254, 134, 72, 17], // #FE8648
    [255, 91, 54, 18], // #FF5B36
    [218, 81, 0, 19], // #DA5100
    [148, 224, 68, 20], // #94E044
    [92, 191, 13, 21], // #5CBF0D
    [195, 209, 23, 22], // #C3D117
    [252, 199, 0, 23], // #FCC700
    [211, 131, 1, 24] // #D38301
];

let getColorIdByRGB = (x, y, r, g, b) => {
    const getDiff = (color1, color2) => {
        return color1.reduce((prev, curr, i) => prev + (curr - color2[i]) * (curr - color2[i]), 0);
    }

    const color = colors.reduce((prev, curr) => {
        const prevDiff = getDiff([r, g, b], prev);
        const currDiff = getDiff([r, g, b], curr);
        return currDiff < prevDiff ? curr : prev;
    });

    const indexColor = colors.indexOf(color);

    if (indexColor === -1) {
        throw new Error(
          `Incorrect pixel found rgb(${r}, ${g}, ${b}) x${x} y${y}`
        );
    }

    return indexColor;
};

let chunkString = function (str, length) {
    return str.match(new RegExp('.{1,' + length + '}', 'g'));
};

let randomInteger = function (min, max) {
    let rand = min - 0.5 + Math.random() * (max - min + 1);
    return Math.round(rand);
};

let loadImage = function (src) {
    return new Promise((resolve, reject) => {
        let img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
};

let replaceAll = function (string, search, replacement) {
    var target = string;
    return target.split(search).join(replacement);
};

module.exports = {
    data: null,
    canvas: null,
    pixelDataToDraw: {},
    pbInfo: {},
    lastUpdate: 0,
    replaceAll: replaceAll,

    async load() {
        const nowTime = parseInt(+new Date() / 1000);
        if (nowTime - this.lastUpdate > 60) {
            this.lastUpdate = nowTime;
            await this.loadData();
            await this.loadImg();
        }
    },

    async loadPbInfo() {
        try {
            const pbInfo = await axios.get("https://dl.kotworks.cyou/pb_info.json");
            this.pbInfo = pbInfo.data
        } catch (e) {
            console.error("Не можем получить хедеры")
            return;
        }
    },

    async loadData() {
        this.data = {};

        let startPixels;
        try {
            startPixels = await axios.get(
                'https://pixel-dev.w84.vkforms.ru/api/data',
                {
                    headers: {
                        Host: 'pixel-dev.w84.vkforms.ru',
                        Connection: 'keep-alive',
                        'Cache-Control': 'max-age=0',
                        'User-Agent':
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36 OPR/71.0.3770.228',
                        Accept: '*/*',
                        Origin: 'https://prod-app7148888-2a1181f52eed.pages-ac.vk-apps.com',
                        'Sec-Fetch-Site': 'cross-site',
                        'Sec-Fetch-Mode': 'cors',
                        'Sec-Fetch-Dest': 'empty',
                        Referer: `https://prod-app7148888-2a1181f52eed.pages-ac.vk-apps.com/index.html`,
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
                        ...this.pbInfo.headers
                    }
                }
            );
        } catch (e) {
            console.error("Ошибка при обновлении шаблона")
            return;
        }

        let chunkedString = chunkString(startPixels.data, 1590);
        chunkedString = chunkedString.slice(0, chunkedString.length - 1);
        let y = 0;
        for (let line of chunkedString) {
            let x = 0;
            let lined = line.split('');
            for (let pixel of lined) {
                let color = decode_colors[pixel];
                this.data[[x, y]] = color;
                x += 1;
            }
            y += 1;
        }
        console.log('Текущее состояние полотна обновлено');
    },

    async loadImg() {
        this.canvas = createCanvas();
        let ctx = this.canvas.getContext('2d');

        let img = await loadImage(
            'https://nocfdl.kotworks.cyou/PixelMaket.png?' +
                parseInt(new Date().getTime() / 1000)
        );

        this.canvas.width = img.width;
        this.canvas.height = img.height;
        ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);

        var imd = ctx.getImageData(0, 0, img.width, img.height).data;
        for (var i = 0; i < imd.length; i += 4) {
            var x = ((i / 4) % img.width) + 1,
                y = ~~(i / 4 / img.width) + 1;

            let color = [imd[i], imd[i + 1], imd[i + 2]];
            if (imd[i + 3] < 1) {
                continue;
            } else {
                try {
                    let colorAAA = getColorIdByRGB(
                        x,
                        y,
                        color[0],
                        color[1],
                        color[2]
                    );
                    this.pixelDataToDraw[[x, y]] = colorAAA;
                } catch (e) {
                    console.log(
                        'Обнаружен кривой пиксель. Какая-то часть рисунка может быть не дорисована'
                    );
                    console.error(e);
                }
            }
        }
        console.log('Шаблон обнолен');
    }
};
