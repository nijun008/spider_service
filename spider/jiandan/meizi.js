// 随手拍（妹子图）

const Nightmare = require('nightmare')
const cheerio = require("cheerio")
const uuid = require('uuid')
const dayjs = require('dayjs')

const db = require('../../db')
const dbName = 'meizitu'

const host = require('./config').host

// const nightmare = Nightmare()


function getMeizi (url) {

  let nightmare = Nightmare()

  return nightmare
  .goto(url)
  .wait('.commentlist')
  .evaluate(() => {
    return document.querySelector('#comments').innerHTML
  })
  .end()
  .then(html => {
    $ = cheerio.load(html)
    let imgs = []
    $('.commentlist li:not(.row)').each((index, li) => {

      let img = {
        originId: $(li).find('.righttext a').html(),
        author: $(li).find('.author strong').html(),
        originUrl: `${host}${$(li).find('.text .righttext a').attr('href')}`,
        thumbnail: 'https:' + $(li).find('.text img').attr('src'),
        largeImg: 'https:' + $(li).find('.text .view_img_link').attr('href'),
        approvalCounts: $(li).find('.jandan-vote .tucao-like-container span').html(),
        opposeCounts: $(li).find('.jandan-vote .tucao-unlike-container span').html(),
        commentsCounts: $(li).find('.jandan-vote .tucao-btn').html().split('[')[1].split(']')[0]
      }

      imgs.push(img)
    })

    console.log('正在抓取：' + $('.current-comment-page').eq(0).html() + '页')

    let nextPageUrl = undefined
    if ($('.previous-comment-page').length) {
      nextPageUrl = $('.previous-comment-page').eq(0).attr('href')
    }

    return { imgs, nextPageUrl }
  })
  .catch((err) => {
    console.log(err)
    console.log('抓取煎蛋妹子图出错')
  })
  
}

async function spiderMeizi (url = `${host}ooxx`) {
  
  let { imgs, nextPageUrl } = await getMeizi(url)

  imgs.forEach(async item => {

    let queryResult = await db.query(`SELECT * FROM ${dbName} WHERE originId = ?`, [item.originId])

    if (!queryResult.length) {

      let createDate = dayjs().format('YYYY-MM-DD HH:mm:ss')

      let row = { 
        ...item,
        createDate,
        updateDate: createDate,
        id: uuid.v1()
      }

      db.insert(`INSERT INTO ${dbName} SET ?`, row).catch(err => {
        console.log('插入数据出错', err)
      })
    } else {
      console.log(`数据已存在 originId: ${item.originId}`)
    }
  })

  if (nextPageUrl) {
    setTimeout(() => {
      spiderMeizi('https:' + nextPageUrl)
    }, 5000)
  }
}

module.exports = spiderMeizi