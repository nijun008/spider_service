// 树洞

const Nightmare = require('nightmare')
const cheerio = require("cheerio")
const uuid = require('uuid')
const dayjs = require('dayjs')

const db = require('../../db')
const dbName = 'shudong'

const host = require('./config').host

const nightmare = Nightmare()


function getShudong () {

  return nightmare
  .goto(`${host}top-comments`)
  .evaluate(() => {
    return document.querySelector('#comment').innerHTML
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
        approvalCounts: $(li).find('.jandan-vote span').eq(0).html(),
        opposeCounts: $(li).find('.jandan-vote span').eq(1).html(),
        commentsCounts: $(li).find('.jandan-vote .tucao-btn').html().split('[')[1].split(']')[0],
      }

      comments.push(comment)
    })

    return comments
  })
  .catch(() => {
    console.log('抓取煎蛋树洞出错')
  })
  
}

async function spiderShudong () {
  
  let list = await getShudong()
  list.forEach(async item => {

    let queryResult = await db.query(`SELECT * FROM ${dbName} WHERE originId = ?`, [item.originId])

    if (!queryResult.length) {

      let createDate = dayjs().format('YYYY-MM-DD HH:mm:ss')

      let row = { 
        ...item,
        createDate,
        updateDate: createDate,
        id: uuid.v1()
      }

      db.insert(`INSERT INTO ${dbName} SET ?`, row).then(result => {
        console.log(`数据插入成功 id ${row.id}`)
      }).catch(err => {
        console.log('插入数据出错', err)
      })
    } else {
      console.log(`数据已存在 originId: ${item.originId}`)
    }
  })
}

module.exports = spiderShudong