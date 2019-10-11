
const config = require("./config.json")
const PixelBot = require("./PixelBot.js")
const Store = require("./Store")

console.logCopy = console.log.bind(console);

console.log = function(data)
{
    const d = new Date()
    const currentDate = `[${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}]`
    this.logCopy(currentDate, data)
};

async function init() {
    for (let link of config.wssLinks) {
        await new Promise((resolve) => setTimeout(resolve, 3000)).then((r)=> {
            new PixelBot(link, Store)
        });
    }
}

init();


