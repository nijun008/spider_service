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
const endPage = 70


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
    console.log(`正在爬取第：${currentPage}页`)

    let nextPageUrl = undefined
    if ($('.previous-comment-page').length && Number(currentPage) > endPage) {
      nextPageUrl = $('.previous-comment-page').eq(0).attr('href')
    }

    return { imgs, nextPageUrl }
  })
  .catch((err) => {
    console.log(err)
    console.log('抓取煎蛋妹子图出错')
  })
  
}

async function spiderMeizi (url = baseUrl) {
  
  let { imgs, nextPageUrl } = await getMeizi(url)

  imgs.forEach(async item => {

    let queryResult = await db.query(`SELECT * FROM ${dbName} WHERE originId = ?`, [item.originId])

    let nowDate = dayjs().format('YYYY-MM-DD HH:mm:ss')
    
    let time = item.originDate.substr(0, item.originDate.length - 1)
    let unit = item.originDate.substr(-1 , 1)
    let originDate = dayjs().subtract(time, timeTranslate[unit]).format('YYYY-MM-DD')

    delete item.originDate

    if (queryResult.length) {

      let paramsArr = [
        originDate,
        item.approvalCounts,
        item.opposeCounts,
        item.commentsCounts,
        nowDate,
        item.originId
      ]

      db.insert(`UPDATE ${dbName} SET originDate = ?,approvalCounts = ?,opposeCounts = ?,commentsCounts = ?,updateDate = ? WHERE originId = ?`, paramsArr).then(() => {
        return true
      }).catch(err => {
        console.log('更新数据出错', err)
      })

    } else {

      let row = { 
        ...item,
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
  })

  if (nextPageUrl) {
    setTimeout(() => {
      spiderMeizi('https:' + nextPageUrl)
    }, 3000)
  }
}

module.exports = spiderMeizi