// 随手拍
const Nightmare = require('nightmare')
const cheerio = require("cheerio")
const uuid = require('uuid')
const dayjs = require('dayjs')

const db = require('../../db')
const dbName = 'meizitu'

const config = require('./config')

let { host, timeTranslate } = config

const baseUrl  = `${host}ooxx`
const endPage = -1
const endTimeFlag = '周'


function getMeizi (url) {

  let nightmare = Nightmare({
    webPreferences: {
      images: false
    }
  })

  return nightmare
  .goto(url)
  .wait('.commentlist')
  .wait(500)
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
        originDate: $(li).find('.author small a').html().replace(/[@\sago钟小个]/g, ''),
        thumbnail: 'https:' + $(li).find('.text img').attr('src'),
        largeImg: 'https:' + $(li).find('.text .view_img_link').attr('href'),
        approvalCounts: $(li).find('.jandan-vote .tucao-like-container span').html(),
        opposeCounts: $(li).find('.jandan-vote .tucao-unlike-container span').html(),
        commentsCounts: $(li).find('.jandan-vote .tucao-btn').html().split('[')[1].split(']')[0]
      }

      imgs.push(img)
    })


    let currentPage = $('.current-comment-page').eq(0).html().replace(/\[|\]/g, '')
    console.log(`Spidering Meizi page number ${currentPage}`)

    let nextPageUrl = undefined
    if ($('.previous-comment-page').length && Number(currentPage) > endPage) {
      nextPageUrl = $('.previous-comment-page').eq(0).attr('href')
    }

    if (imgs.find(item => item.originDate.indexOf(endTimeFlag) !== -1)) {
      nextPageUrl = undefined
    }

    return { imgs, nextPageUrl }
  })
  .catch((err) => {
    console.log(err)
    console.log('抓取煎蛋妹子图出错')
  })
  
}

function insertImg (img) {
  let nowDate = dayjs().format('YYYY-MM-DD HH:mm:ss')
  let row = { 
    ...img,
    createDate: nowDate,
    updateDate: nowDate,
    id: uuid.v1()
  }

  db.insert(`INSERT INTO ${dbName} SET ?`, row).then(() => {
    return true
  }).catch(err => {
    console.log('插入数据出错', err)
  })
}

function updateImg (img) {
  let nowDate = dayjs().format('YYYY-MM-DD HH:mm:ss')

  let paramsArr = [
    img.originDate,
    img.approvalCounts,
    img.opposeCounts,
    img.commentsCounts,
    nowDate,
    img.originId
  ]

  db.insert(`UPDATE ${dbName} SET originDate = ?,approvalCounts = ?,opposeCounts = ?,commentsCounts = ?,updateDate = ? WHERE originId = ?`, paramsArr).then(() => {
    return true
  }).catch(err => {
    console.log('更新数据出错', err)
  })
}

async function spiderMeizi (url = baseUrl) {
  
  return new Promise(async (resolve, reject) => {
    let { imgs, nextPageUrl } = await getMeizi(url)

    for (let item of imgs) {
      
      if (item.largeImg.indexOf('undefined') !== -1) continue

      let queryResult = await db.query(`SELECT * FROM ${dbName} WHERE originId = ?`, [item.originId])

      let time = item.originDate.substr(0, item.originDate.length - 1)
      let unit = item.originDate.substr(-1 , 1)
      item.originDate = dayjs().subtract(time, timeTranslate[unit]).format('YYYY-MM-DD')

      queryResult.length ? updateImg(item) : insertImg(item)
    }

    setTimeout(() => {
      return resolve({ url, nextPageUrl })
    }, Math.round() * 3000 + 2000)

  }).then(({ url, nextPageUrl }) => {
    return nextPageUrl ? spiderMeizi(`https:${nextPageUrl}`) : Promise.resolve(url)
  })
}

module.exports = spiderMeizi