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

  jav.library(["IPX-400", "PBD-340", "JUFD-866", "IPX-274", "ID-036", "ABP-340", "TAAK-024", "SSNI-865", "JUFD-767", "PFES-012", "VRTM-240", "PGD-876", "IPZ-976", "ABP-320"])
}

spiderJav()
