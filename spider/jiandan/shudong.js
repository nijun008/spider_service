// 树洞
const Nightmare = require('nightmare')
const cheerio = require("cheerio")
const uuid = require('uuid')
const dayjs = require('dayjs')

const db = require('../../db')
const dbName = 'shudong'

const config = require('./config')

let { host, timeTranslate } = config

const baseUrl  = `${host}treehole`
const endPage = -1
const endTimeFlag = '周'


function getShudong (url) {
  let nightmare = Nightmare()

  return nightmare
  .goto(url)
  .wait('.commentlist')
  .wait(500)
  .evaluate(() => {
    return document.querySelector('#content').innerHTML
  })
  .end()
  .then(html => {

    $ = cheerio.load(html)
    let comments = []
    $('.commentlist li:not(.row)').each((index, li) => {

      let comment = {
        originId: $(li).find('.text .righttext a').html(),
        author: $(li).find('.author strong').html(),
        content: $(li).find('.text p').html(),
        originUrl: `${host}${$(li).find('.text .righttext a').attr('href')}`,
        originDate: $(li).find('.author small a').html().replace(/[@\sago钟小个]/g, ''),
        approvalCounts: $(li).find('.tucao-like-container span').html(),
        opposeCounts: $(li).find('.tucao-unlike-container span').html(),
      }

      comments.push(comment)
    })

    let currentPage = $('.current-comment-page').eq(0).html().replace(/\[|\]/g, '')
    console.log(`Spidering Shudong page number ${currentPage}`)

    let nextPageUrl = undefined
    if ($('.previous-comment-page').length && Number(currentPage) > endPage) {
      nextPageUrl = $('.previous-comment-page').eq(0).attr('href')
    }

    if (comments.find(item => item.originDate.indexOf(endTimeFlag) !== -1)) {
      nextPageUrl = undefined
    }
    
    return { comments, nextPageUrl }
  })
  .catch(() => {
    console.log('抓取煎蛋树洞出错')
  })
  
}

function insertData (comment) {
  let nowDate = dayjs().format('YYYY-MM-DD HH:mm:ss')

  let row = { 
    ...comment,
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

function updataData (comment) {
  let nowDate = dayjs().format('YYYY-MM-DD HH:mm:ss')

  let paramsArr = [
    comment.originDate,
    comment.approvalCounts,
    comment.opposeCounts,
    comment.commentsCounts,
    nowDate,
    comment.originId
  ]

  db.insert(`UPDATE ${dbName} SET originDate = ?,approvalCounts = ?,opposeCounts = ?,commentsCounts = ?,updateDate = ? WHERE originId = ?`, paramsArr).then(() => {
    return true
  }).catch(err => {
    console.log('更新数据出错', err)
  })
}

async function spiderShudong (url = baseUrl) {

  return new Promise(async (resolve, reject) => {
    let { comments, nextPageUrl } = await getShudong(url)

    for (let item of comments) {

      let queryResult = await db.query(`SELECT * FROM ${dbName} WHERE originId = ?`, [item.originId])
      
      let time = item.originDate.substr(0, item.originDate.length - 1)
      let unit = item.originDate.substr(-1 , 1)
      item.originDate = dayjs().subtract(time, timeTranslate[unit]).format('YYYY-MM-DD')

      queryResult.length ? updataData(item) : insertData(item)

    }

    setTimeout(() => {
      resolve({
        currentUrl: url,
        nextUrl: nextPageUrl
      })
    }, Math.round() * 3000 + 2000)

  }).then(({ currentUrl, nextUrl }) => {
    return nextUrl ? spiderShudong('https:' + nextUrl) : Promise.resolve(currentUrl)
  })
}

module.exports = spiderShudong