// bus
const Nightmare = require('nightmare')
const cheerio = require("cheerio")
const uuid = require('uuid')
const dayjs = require('dayjs')

const db = require('../../../db')
const dbName = 'movies'

// const config = require('./config')

const urls = [
  'https://www.javbus.com/SSIS-001',
  'https://www.javbus.com/WAAA-032',
  'https://www.javbus.com/WAAA-031',
]

function getMovie(url) {
  let nightmare = Nightmare()
  
  return nightmare
  .goto(url)
  .wait('.movie')
  .evaluate(() => {
    return document.querySelector('.container').innerHTML
  })
  .end()
  .then(html => {
    $ = cheerio.load(html)
    let code = $('.movie .info p').eq(0).find('span').eq(1).html().toUpperCase()

    let series = ''
    let cateEq = 7
    if ($('.movie .info p').eq(6).html().indexOf('系列') > -1) {
      cateEq = 8
      series = $('.movie .info p').eq(6).find('a').html()
    }

    let category = []
    $('.movie .info p').eq(cateEq).find('.genre').each((index, item) => {
      let cate = $(item).find('a').html()
      if (cate) category.push(cate)
    })

    let actor = []
    $('.movie .info ul .star-name a').each((index, item) => {
      actor.push($(item).html())
    })

    let movie = {
      code,
      name: $('h3').html().replace(code, ''),
      releasedDate: $('.movie .info p').eq(1).text().split(' ')[1],
      duration: Number($('.movie .info p').eq(2).html().split('</span>')[1].replace(/[@小時分鐘 ]/g, '')) || 0,
      studio: $('.movie .info p').eq(4).find('a').html(),
      publisher: $('.movie .info p').eq(5).find('a').html(),
      series,
      category: category.join(','),
      actor: actor.join(','),
      director: $('.movie .info p').eq(3).find('a').html(),
      dbRating: 0,
      libraryRating: 0,
      rating: 0,
      favoriteCounts: 0
    }

    return movie
  })
  .catch(err => {
    console.log(err)
  })
}

function insertMovie (movie) {
  let nowDate = dayjs().format('YYYY-MM-DD HH:mm:ss')
  let row = { 
    ...movie,
    createDate: nowDate,
    updateDate: nowDate,
    id: uuid.v1()
  }

  db.insert(`INSERT INTO ${dbName} SET ?`, row).then(() => {
    console.log(movie.code + ' success')
    return true
  }).catch(err => {
    console.log('插入数据出错', err)
  })
}

async function spiderMovie (urls = [], current = 0) {
  
  return new Promise(async (resolve, reject) => {
    let url = urls[current] || ''
    if (url) {
      let urlStr = urls[current].split('/')
      let code = urlStr[urlStr.length - 1].toUpperCase()

      let queryResult = await db.query(`SELECT * FROM ${dbName} WHERE code = ?`, [code])

      if (!queryResult.length) {
        let movie = await getMovie(url)
        insertMovie(movie)
      }
    }

    setTimeout(() => {
      return resolve({ urls, current })
    }, Math.round() * 3000 + 2000)

  }).then(({ urls, current }) => {
    return (current < urls.length - 1) ? spiderMovie(urls, current + 1) : Promise.resolve(urls)
  })
}

module.exports = spiderMovie