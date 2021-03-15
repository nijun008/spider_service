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
  // let endPage = await jav.bus(1, 4)
  // console.log(`Bus done, end page: ${endPage}`)

  jav.library(["SSNI-436"])
}

spiderJav()
