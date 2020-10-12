
const config = require("./config.json")
const PixelBot = require("./PixelBot.js")
const Store = require("./Store")

console.logCopy = console.log.bind(console);

console.log = function (data) {
    const d = new Date();
    const currentDate = "[" + ("0" + d.getHours()).slice(-2) + ":" +
        ("0" + d.getMinutes()).slice(-2) + ":" +
        ("0" + d.getSeconds()).slice(-2) + "]";

    this.logCopy(currentDate, data);
};

async function init () {
    await Store.load();
    setInterval(() => {
        Store.load();
    }, 120*1000)

    for (let link of config.wssLinks) {
        await new Promise((resolve) => setTimeout(resolve, 3500));
        new PixelBot(link, Store);
    }
}

init();


