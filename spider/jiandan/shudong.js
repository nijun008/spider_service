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


function getShudong (url) {
  let nightmare = Nightmare()

  return nightmare
  .goto(url)
  .wait('.commentlist')
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
        commentsCounts: $(li).find('.jandan-vote .tucao-btn').html().split('[')[1].split(']')[0],
      }

      comments.push(comment)
    })

    let currentPage = $('.current-comment-page').eq(0).html().replace(/\[|\]/g, '')
    console.log(`正在爬取第：${currentPage}页`)

    let nextPageUrl = undefined
    if ($('.previous-comment-page').length && Number(currentPage) > endPage) {
      nextPageUrl = $('.previous-comment-page').eq(0).attr('href')
    }
    
    return { comments, nextPageUrl }
  })
  .catch(() => {
    console.log('抓取煎蛋树洞出错')
  })
  
}

async function spiderShudong (url = baseUrl) {
  
  let { comments, nextPageUrl } = await getShudong(url)
  comments.forEach(async item => {

    let queryResult = await db.query(`SELECT * FROM ${dbName} WHERE originId = ?`, [item.originId])

    let nowDate = dayjs().format('YYYY-MM-DD HH:mm:ss')
    
    let time = item.originDate.substr(0, item.originDate.length - 1)
    let unit = item.originDate.substr(-1 , 1)
    let originDate = dayjs().subtract(time, timeTranslate[unit]).format('YYYY-MM-DD')

    delete item.originDate

    if (queryResult.length) { // 更新
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
    
    } else { // 新增

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
      spiderShudong('https:' + nextPageUrl)
    }, 3000)
  }
}

module.exports = spiderShudong