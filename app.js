const jiandan = require('./spider/jiandan')
const jav = require('./spider/jav')

const spiderJiandan = async () => {

  let shudongUrl = await jiandan.spiderShudong()
  console.log(`Shu dong done, last url: ${shudongUrl}`)

  let meiziUrl = await jiandan.spiderMeizi()
  console.log(`Mei zi done, last url: ${meiziUrl}`)

}

// spiderJiandan()

const spiderJav = async () => {
  let urls = await jav.bus.spiderMovie(['https://www.javbus.com/SSIS-001', 'https://www.javbus.com/ABW-054', 'https://www.javbus.com/ABW-043'])
}

spiderJav()