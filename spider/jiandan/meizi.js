// 随手拍（妹子图）

const Nightmare = require('nightmare')
const cheerio = require("cheerio")
const uuid = require('uuid')
const dayjs = require('dayjs')

const db = require('../../db')
const dbName = 'meizi'

const host = require('./config').host

const nightmare = Nightmare()


function getMeizi () {

  return nightmare
  .goto(`${host}ooxx`)
  .evaluate(() => {
    return document.querySelector('#comments').innerHTML
  })
  .end()
  .then(html => {
    $ = cheerio.load(html)
    let imgs = []
    $('.commentlist li').each((index, li) => {
      // console.log(li)
      let img = {
        originId: $(li).find('.righttext a').html(),
        author: $(li).find('.author strong').html(),
        originUrl: `${host}${$(li).find('.text .righttext a').attr('href')}`,
        thumbnail: 'https:' + $(li).find('.text img').attr('src'),
        largeImg: 'https:' + $(li).find('.text .view_img_link').attr('href'),
        approvalCounts: $(li).find('.jandan-vote .tucao-like-container span').html(),
        opposeCounts: $(li).find('.jandan-vote .tucao-unlike-container span').html(),
        // commentsCounts: $(li).find('.jandan-vote .tucao-btn').html().split('[')[1].split(']')[0],
      }
      console.log($(li).find('.jandan-vote .tucao-btn').html())

      imgs.push(img)
    })

    return imgs
  })
  .catch((err) => {
    console.log(err)
    console.log('抓取煎蛋树洞出错')
  })
  
}

async function spiderMeizi () {
  
  let list = await getMeizi()

  console.log(list)
  // list.forEach(async item => {

  //   let queryResult = await db.query(`SELECT * FROM ${dbName} WHERE originId = ?`, [item.originId])

  //   if (!queryResult.length) {

  //     let createDate = dayjs().format('YYYY-MM-DD HH:mm:ss')

  //     let row = { 
  //       ...item,
  //       createDate,
  //       updateDate: createDate,
  //       id: uuid.v1()
  //     }

  //     db.insert(`INSERT INTO ${dbName} SET ?`, row).then(result => {
  //       console.log(`数据插入成功 id ${row.id}`)
  //     }).catch(err => {
  //       console.log('插入数据出错', err)
  //     })
  //   } else {
  //     console.log(`数据已存在 originId: ${item.originId}`)
  //   }
  // })
}

module.exports = spiderMeizi