/*
    Author: KotRik (vk.com/kotrik) 
*/
const WebSocket = require('ws');
const axios = require('axios');
const urlapi = require('url');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const { document } = new JSDOM(`<html></html>`).window;

const VERSION = 202307;

module.exports = class PixelBot {
    constructor(wsslink, store) {
        this.wsslink = wsslink;
        this.urldata = new URL(this.wsslink);
        this.MAX_WIDTH = 1590;
        this.MAX_HEIGHT = 400;
        this.MAX_COLOR_ID = 25;
        this.MIN_COLOR_ID = 0;

        this.SIZE = this.MAX_WIDTH * this.MAX_HEIGHT;
        this.SEND_PIXEL = 0;

        this.ws = null;
        this.wsloaded = false;
        this.busy = false;

        this.isStartedWork = false;
        this.rCode = null;

        this.load(store).catch((e) => {
            console.log(e);
        });
    }

    async load(store) {
        this.startWork(store);
    }

    // async resolveCode(store) {
    //     try {
    //         let url = urlapi.parse(this.wsslink);
    //         let result = await axios.get("https://pixel2019.vkforms.ru/api/start", {
    //             'headers': {
    //                 'X-vk-sign': url.search
    //             }
    //         })

    //         let code = result.data.response.code;
    //         code = eval(store.replaceAll(code, "window.", ""))
    //         this.wsslink = this.wsslink.replace(/&c=.*/g, `&c=${code}`)
    //         console.log(`Код решён: ${code}`)
    //     } catch (e) {
    //         console.log(e)
    //         console.log("Произошла ошибка при решении кода")
    //     }
    // }

    async initWs(store) {
        try {
            const data = await axios.get("https://pixel-dev.w84.vkforms.ru/api/start", {
                params: {
                    view: 0
                },
                headers: {
                    ...store.pbInfo.headers,
                    "x-vk-sign": this.urldata.search
                }
            })
            if ('response' in data.data) {
                console.log("Получен ответ от HSPB Startdata")
            }

            console.log(
                `[${this.urldata.searchParams.get(
                    'vk_user_id'
                )}] проверяем капчу!`
            );
            const checkCaptcha = await axios.get("https://pixel-dev.w84.vkforms.ru/api/captcha/get", {
                headers: {
                    ...store.pbInfo.headers,
                    "x-vk-sign": this.urldata.search
                }
            })
            if ('response' in checkCaptcha.data && checkCaptcha.data.response.show) {
                console.log(
                    `[${this.urldata.searchParams.get(
                        'vk_user_id'
                    )}] требуется капча!`
                );
                return;
            }

            const simulateOtherUrls = [
                "https://pixel-dev.w84.vkforms.ru/api/top",
                "https://pixel-dev.w84.vkforms.ru/api/promocodes/index",
            ]
            for (const url of simulateOtherUrls) {
                try {
                    const res = await axios.get(url, {
                        headers: {
                            ...store.pbInfo.headers,
                            "x-vk-sign": this.urldata.search
                        }
                    })
                    if ('response' in res.data) {
                        console.log(
                            `[${this.urldata.searchParams.get(
                                'vk_user_id'
                            )}] просимулировали ${url}`
                        );
                    }
                } catch (e) {
                    console.log(
                        `[${this.urldata.searchParams.get(
                            'vk_user_id'
                        )}] не удалось просимулировать ${url}`
                    );
                    console.error(e)
                    return;
                }
            }
        } catch (e) {
            console.error("Не удалось получить ответ от HSPB")
            return;
        }

        //await this.resolveCode(store);
        this.ws = new WebSocket(this.wsslink, null, {
            headers: {
                Host: 'pixel-dev.w84.vkforms.ru',
                Connection: 'Upgrade',
                Pragma: 'no-cache',
                'Cache-Control': 'no-cache',
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                Upgrade: 'websocket',
                Origin: 'https://prod-app7148888-2a1181f52eed.pages-ac.vk-apps.com',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8,ja;q=0.7',
                ...store.pbInfo.headers
            }
        });

        this.ws.on('open', async () => {
            console.log(
                `[${this.urldata.searchParams.get(
                    'vk_user_id'
                )}] connected to websocket`
            );
        });

        this.ws.on('message', async (event) => {
            while (this.busy) {
                await this.sleep(500);
            }

            try {
                this.busy = true;

                if (typeof event === 'string') {
                    //Json
                    if (event === 'ping') {
                        this.ws.send('pong');
                    }
                    // try {
                    //     let a = JSON.parse(event)
                    //     // if (a['v']) {
                    //     //     // ТО что нужно!
                    //     //     // Так и предупреждение для копирастов, если вы копируйте мой скрипт на гитхаб
                    //     //     // Ну уважьте разраба поставьте копирайт @KotRikD
                    //     //     // Человеку тоже важен респект(
                    //     //     let codeRaw = a['v']['code']

                    //     //     let code = codeRaw
                    //     //     let funnyReplacesHs = {
                    //     //         'window.': '',
                    //     //         'global': 'undefined',
                    //     //         "=== 'object'": "!== 'object'"
                    //     //     }
                    //     //     for (let replace of Object.keys(funnyReplacesHs)) {
                    //     //         // HS знаю что вы это видите, харе нам жизнь усложнять
                    //     //         // @in <3 @girl <3 @hs <3 from coin games
                    //     //         // разбаньте Вову(vk.com/m_vts)(
                    //     //         code = store.replaceAll(code, replace, funnyReplacesHs[replace])
                    //     //     }

                    //     //     this.rCode = eval(code);
                    //     //     this.ws.send("R"+this.rCode)
                    //     //     this.wsloaded = true;
                    //     //     console.log(`Код-R решён: R${this.rCode}`)
                    //     // }
                    // } catch (e) {

                    // }
                    this.wsloaded = true;
                } else {
                    const c = this.toArrayBuffer(event);

                    for (
                        let d = c.byteLength / 4,
                            e = new Int32Array(c, 0, d),
                            f = Math.floor(d / 3),
                            g = 0;
                        g < f;
                        g++
                    ) {
                        const h = e[3 * g],
                            i = e[1 + 3 * g],
                            j = e[2 + 3 * g],
                            k = this.unpack(h),
                            l = k.x,
                            m = k.y,
                            n = k.color,
                            o = k.flag;
                        // 1 - x
                        // 2 - y
                        // 3 - color
                        // 4 - uid
                        // 5 - gid
                        // 6 - flag
                        store.data[[l, m]] = n;
                    }
                }

                if (!this.isStartedWork) {
                    this.startWork(store);
                }
                this.busy = false;
            } catch (e) {
                this.busy = false;
                console.log('idk of this type (ignore this)');
                console.log(e);
            }
        });

        this.ws.on('close', () => {
            console.log(
                `[${this.urldata.searchParams.get(
                    'vk_user_id'
                )}] disconnected from socket!`
            );
            this.ws = null;
            this.wsloaded = false;
        });

        this.ws.on('error', (e) => {
            console.error(e);
            console.log("err happend")
            this.ws = null;
            this.wsloaded = false;
        })

        setInterval(() => {
            if (
                (!this.wsloaded && this.ws === null) ||
                this.ws.readyState === WebSocket.CLOSED
            ) {
                // Unloaded
                console.log(
                    `[${this.urldata.searchParams.get(
                        'vk_user_id'
                    )}] force disconnected from socket!`
                );
                this.wsloaded = false;
                this.ws = null;
                this.initWs(store); //  auto-reload
            }
        }, 60 * 1000);
    }

    async startWork(store) {
        console.log(
            `[${this.urldata.searchParams.get('vk_user_id')}] Начинаю работать!`
        );
        this.isStartedWork = true;

        let iterations = 0;
        while (true) {
            const randomElement = Math.floor(Math.random() * 30);
            const keys = Object.keys(store.pixelDataToDraw);
            const ind = keys[Math.floor(Math.random() * keys.length)]; // Рандомный элемент

            const color = store.pixelDataToDraw[ind];
            const coords = ind.split(',');
            if (iterations > keys.length || keys.length < 1) {
                console.log(
                    `[${this.urldata.searchParams.get(
                        'vk_user_id'
                    )}] отдыхаем чуток...`
                );
                await this.sleep(((60 * 2) + randomElement) * 1000); // hold on, we need to sleep
                iterations = 0;
                console.log(
                    `[${this.urldata.searchParams.get(
                        'vk_user_id'
                    )}] продолжаем работать`
                );
                continue;
            }

            iterations += 1;
            if (store.data !== null && color === store.data[ind]) {
                await this.sleep(1);
                continue;
            }

            await this.send(
                color,
                this.SEND_PIXEL,
                coords[0],
                coords[1],
                store
            );
            if (store.data) {
                store.data[ind] = color;
            }

            if (store.pbInfo.version > VERSION) {
                console.log("ПОЯВИЛАСЬ НОВАЯ ВЕРСИЯ БОТА, ПОЖАЛУЙСТА ОБНОВИТЕСЬ")
            }

            await this.sleep((60 + randomElement) * 1000); // 60 + random sec
        }
    }

    async send(colorId, flag, x, y, store) {
        let c = new ArrayBuffer(4);
        new Int32Array(c, 0, 1)[0] = this.pack(colorId, flag, x, y);
        if (!this.ws) {
            await this.initWs(store);
        }
        while (!this.wsloaded) {
            await this.sleep(500);
        }
        this.ws.send(c);
        console.log(
            `[${this.urldata.searchParams.get(
                'vk_user_id'
            )}] Зарисовываю пиксель: x${x} y${y} | Цвет: ${colorId}`
        );
    }

    pack(colorId, flag, x, y) {
        const b =
            parseInt(colorId, 10) + parseInt(flag, 10) * this.MAX_COLOR_ID;
            // 3aa7 4d00
        return (
            parseInt(x, 10) + parseInt(y, 10) * this.MAX_WIDTH + this.SIZE * b
        );
    }

    unpack(b) {
        const c = Math.floor(b / this.SIZE);
        const d = (b -= c * this.SIZE) % this.MAX_WIDTH;
        return {
            x: d,
            y: (b - d) / this.MAX_WIDTH,
            color: c % this.MAX_COLOR_ID,
            flag: Math.floor(c / this.MAX_COLOR_ID)
        };
    }

    sleep(time) {
        return new Promise((resolve) => setTimeout(resolve, time));
    }

    toArrayBuffer(buf) {
        const ab = new ArrayBuffer(buf.length);
        const view = new Uint8Array(ab);
        for (let i = 0; i < buf.length; ++i) {
            view[i] = buf[i];
        }
        return ab;
    }

    chunkString(str, length) {
        return str.match(new RegExp('.{1,' + length + '}', 'g'));
    }

    shuffle(array) {
        let currentIndex = array.length,
            temporaryValue,
            randomIndex;

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
};
