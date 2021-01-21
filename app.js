const jiandan = require('./spider/jiandan')

const spiderJiandan = async () => {

  let shudongUrl = await jiandan.spiderShudong()
  console.log(`Shu dong done, last url: ${shudongUrl}`)

  let meiziUrl = await jiandan.spiderMeizi()
  console.log(`Mei zi done, last url: ${meiziUrl}`)

}

spiderJiandan()