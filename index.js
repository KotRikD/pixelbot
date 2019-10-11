
const config = require("./config.json")
const PixelBot = require("./PixelBot.js")
const Store = require("./Store")

async function init() {
    for (let link of config.wssLinks) {
        await new Promise((resolve) => setTimeout(resolve, 3000)).then((r)=> {
            new PixelBot(link, Store)
        });
    }
}

init();


