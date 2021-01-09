// 树洞

const Nightmare = require('nightmare')
const cheerio = require("cheerio")
const host = require('./config').host

const mysql = require('mysql')
const uuid = require('uuid')
const dayjs = require('dayjs')


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
    $('.commentlist li').each((index, li) => {

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
  console.log(list)

  const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'queen',
    port: '3306',
    database: 'hot_dev'
  })

  connection.connect()
  console.log('数据库连接')

  
  list.forEach(item => {
    connection.query('SELECT * FROM `shudong` WHERE `originId` = ?', [item.originId], (err, result) => {
      if (!result.length) {

        let createDate = dayjs().format('YYYY-MM-DD HH:mm:ss')
        let row = { 
          ...item,
          createDate,
          updateDate: createDate,
          id: uuid.v1()
        }
        connection.query('INSERT INTO shudong SET ?', row, (err, result) => {
          if (err) {
            console.log('插入数据出错', err)
          } else {
            console.log(`数据插入成功 id ${row.id}`)
          }
        })

      } else {
        console.log(`数据已存在 originId: ${item.originId}`)
      }
    })

  })

  setTimeout(() => {
    connection.end()
    console.log('数据库断开')
  }, 10)
  
}

module.exports = spiderShudong