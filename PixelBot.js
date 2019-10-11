/*
    Author: KotRik (vk.com/kotrik) 
*/
const WebSocket = require('ws');
const { createCanvas, Image } = require('canvas');
const axios = require("axios");

module.exports = class PixelBot {
    constructor (wsslink, store) {
        this.wsslink = wsslink;
        this.MAX_WIDTH = 1590
        this.MAX_HEIGHT = 400
        this.MAX_COLOR_ID = 25
        this.MIN_COLOR_ID = 0

        this.SIZE = this.MAX_WIDTH * this.MAX_HEIGHT
        this.SEND_PIXEL = 0

        this.pixelDataToDraw = {};
        this.initPixelCanvas = {};

        this.canvas = null;
        this.img = null;
        this.ws = null;
        this.wsloaded = false;
        this.busy = false;

        this.colors = [
            [255, 255, 255, 0],
            [0, 0, 0, 4],
            [58, 175, 255, 5],
            [255, 0, 0, 11]
        ]

        this.decode_colors = {
            '0': 0,
            '1': 1,
            '2': 2,
            '3': 3,
            '4': 4,
            '5': 5,
            '6': 6,
            '7': 7,
            '8': 8,
            '9': 9,
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

        this.isStartedWork = false;
        this.thatsMy = false;

        this.load(store).catch((e) => {
            console.log(e)
        })
    }

    async load (store) {
        await this.loadFirstTemplate(store)

        this.canvas = createCanvas();
        let ctx = this.canvas.getContext("2d");

        this.img = new Image();
        this.img.onload = () => {
            console.log("img loaded")
            this.canvas.width = this.img.width;
            this.canvas.height = this.img.height;
            ctx.drawImage(this.img, 0, 0, this.canvas.width, this.canvas.height);

            var imd = ctx.getImageData(0, 0, this.img.width, this.img.height).data
            for (var i = 0; i < imd.length; i += 4) {
                var x = (i / 4) % this.img.width + 1,
                    y = ~~((i / 4) / this.img.width) + 1;

                let color = [imd[i], imd[i + 1], imd[i + 2]]
                if (imd[i + 3] < 1) {
                    continue
                } else {
                    for (let colord of this.colors) {
                        if (color[0] == colord[0] && color[1] == colord[1] && color[2] == colord[2]) {
                            this.pixelDataToDraw[[x, y]] = colord[3]
                            break
                        }
                    }
                }
            }
            console.log("pixels loaded")
            this.startWork(store)
        }


        this.img.src = "https://pixelbattle.id0.pw/pixel-logo.png?" + parseInt(new Date().getTime() / 1000);
    }


    async loadFirstTemplate (store) {
        if (!store.initPixelCanvas) {
            store.initPixelCanvas = {}
            this.thatsMy = true;
        }
        //try {}
        let startPixels = await axios.get("https://pixel2019.vkforms.ru/api/data/" + this.randomInteger(1, 19))
        let chunkedString = this.chunkString(startPixels.data, 1590)
        chunkedString = chunkedString.slice(0, chunkedString.length - 1)
        let y = 1;
        for (let line of chunkedString) {
            let x = 1;
            let lined = line.split("")
            for (let pixel of lined) {
                let color = this.decode_colors[pixel];
                store.initPixelCanvas[[x, y]] = color
                x += 1
            }
        }
    }

    initWs (store) {
        this.ws = new WebSocket(this.wsslink);

        this.ws.on('open', async () => {
            console.log("connected to websocket")
            this.wsloaded = true;
        })

        this.ws.on('message', async (event) => {
            while (this.busy) {
                await this.sleep(500)
            }
            try {
                this.busy = true;

                if (this.thatsMy) {
                    let c = this.toArrayBuffer(event)
                    for (var d = c.byteLength / 4, e = new Int32Array(c, 0, d), f = Math.floor(d / 3), g = 0; g < f; g++) {
                        var h = e[3 * g], i = e[1 + 3 * g], j = e[2 + 3 * g], k = this.unpack(h), l = k.x, m = k.y, n = k.color, o = k.flag;
                        // 1 - x
                        // 2 - y
                        // 3 - color
                        // 4 - uid
                        // 5 - gid
                        // 6 - flag
                        store.initPixelCanvas[[l, m]] = n
                    }
                }

                if (!this.isStartedWork) {
                    this.startWork()
                }
                this.busy = false;
            } catch (e) {
                this.busy = false;
                console.log("idk of this type (ignore this)")
                console.log(e)
            }
        });

        this.ws.on('close', () => {
            this.ws = null;
            this.wsloaded = false;
        })
    }

    async startWork (store) {
        console.log("start work")
        this.isStartedWork = true;
        for (let ind of this.shuffle(Object.keys(this.pixelDataToDraw))) {
            let color = this.pixelDataToDraw[ind]
            let coords = ind.split(",")
            if (store.initPixelCanvas && store.initPixelCanvas[ind] && store.initPixelCanvas[ind] == color) {
                continue
            }

            await this.send(color, this.SEND_PIXEL, coords[0], coords[1], store)
            if (store.initPixelCanvas) {
                store.initPixelCanvas[ind] = color
            }

            await this.sleep(60000) // 60 sec
        }
        this.isStartedWork = false;
    }

    async send (colorId, flag, x, y, store) {
        let c = new ArrayBuffer(4);
        new Int32Array(c, 0, 1)[0] = this.pack(colorId, flag, x, y)
        if (!this.ws) {
            this.initWs(store);
        }
        while (!this.wsloaded) {
            await this.sleep(500)
        }
        this.ws.send(c)
        console.log(`Поставил пиксель: x${x} y${y} cid${colorId}`)
    }

    pack (colorId, flag, x, y) {
        let b = parseInt(colorId, 10) + parseInt(flag, 10) * this.MAX_COLOR_ID;
        return parseInt(x, 10) + parseInt(y, 10) * this.MAX_WIDTH + this.SIZE * b;
    }

    unpack (b) {
        let c = Math.floor(b / this.SIZE)
        let d = (b -= c * this.SIZE) % this.MAX_WIDTH;
        return {
            x: d,
            y: (b - d) / this.MAX_WIDTH,
            color: c % this.MAX_COLOR_ID,
            flag: Math.floor(c / this.MAX_COLOR_ID)
        };
    }

    sleep (time) {
        return new Promise((resolve) => setTimeout(resolve, time));
    }

    toArrayBuffer (buf) {
        var ab = new ArrayBuffer(buf.length);
        var view = new Uint8Array(ab);
        for (var i = 0; i < buf.length; ++i) {
            view[i] = buf[i];
        }
        return ab;
    }

    chunkString (str, length) {
        return str.match(new RegExp('.{1,' + length + '}', 'g'));
    }

    randomInteger (min, max) {
        let rand = min - 0.5 + Math.random() * (max - min + 1);
        return Math.round(rand);
    }

    shuffle (array) {
        var currentIndex = array.length, temporaryValue, randomIndex;

        // While there remain elements to shuffle...
        while (0 !== currentIndex) {

            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    }

}