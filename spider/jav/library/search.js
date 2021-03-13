const cheerio = require("cheerio")
const Nightmare = require('nightmare')
const uuid = require('uuid')
const dayjs = require('dayjs')

const db = require('../../../db')
const dbName = 'movies'

let host = 'https://f50q.com/tw/'

let nightmare = null

function nightmareInit () {
  return new Promise(async (resolve, reject) => {
    if (nightmare) {
      return resolve(nightmare)
    }

    nightmare = Nightmare({
      show: true,
      webPreferences: {
        images: false
      }
    })

    await nightmare
    .goto(host)
    .wait(1000)
    .click('.btnAdultAgree')
    .wait('#idsearchbox')
    .wait(300)
    .cookies.get({ url: null })

    resolve(nightmare)
  })
}


async function searchKeywords(keywords) {

  console.log(`Search ${keywords} in Library`)

  await nightmareInit()

  return nightmare.type('#idsearchbox', keywords.toUpperCase())
  .click('#idsearchbutton')
  .wait(2000)
  .evaluate(() => {
    if (document.querySelector('.videos')) {
      return document.querySelector('.videos').innerHTML
    } else {
      return document.querySelector('#video_jacket_info').innerHTML
    }
  })
  .then(async html => {
    $ = cheerio.load(html)

    // 搜索结果为详情页
    if ($('#video_id').length) {
      let movie = analysisHtml(html, keywords.toUpperCase())
      saveMovie(movie)
    }
    
    let movieLists = []
    $('.video').each((index, item) => {
      let code = $(item).find('div.id').html()
      if (!movieLists.find(i => i.code === code)) {
        movieLists.push({
          url: $(item).find('a').eq(0).attr('href').replace('./', host),
          code: $(item).find('div.id').html().toUpperCase()
        })
      }
    })

    return movieLists
  })
  .catch(err => {
    console.log(`Library search ${keywords} err`)
    console.log(err)
  })
}

async function movieDetail ({ code, url }) {
  return nightmare.goto(url)
  .wait('#video_id')
  .evaluate(() => {
    return document.querySelector('#video_jacket_info').innerHTML
  })
  .then(html => {
    return analysisHtml(html, code)
  }).catch((err) => {
    console.log(`Library ${code} err`)
    console.log(err)
  })
}

// 解析影片详情页
function analysisHtml (html, code) {
  $ = cheerio.load(html)

  let category = []
  $('#video_genres .genre a').each((index, item) => {
    category.push($(item).html())
  })

  let actor = []
  $('#video_cast .cast a').each((index, item) => {
    actor.push($(item).html())
  })

  let movie = {
    code,
    releasedDate: $('#video_date .text').html(),
    duration: Number($('#video_length .text').html()) || 0,
    studio: $('#video_maker .text a').html(),
    publisher: $('#video_label .text a').html(),
    category: category.join(','),
    actor: actor.join(','),
    director: $('#video_director .director a').html(),
    libraryRating: Number($('#video_review .score').html().replace(/[()]/g, '') || 0)
  }

  return movie
}

async function saveMovie(movie) {
  if (movie && movie.code) {
    let queryResult = await db.query(`SELECT * FROM ${dbName} WHERE code = ?`, [movie.code])

    if (queryResult.length) {
      updateMovie(movie)
    } else {
      insertMovie(movie)
    }
  }
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
    return true
  }).catch(err => {
    console.log('插入数据出错', err)
  })
}

function updateMovie (movie) {
  let nowDate = dayjs().format('YYYY-MM-DD HH:mm:ss')

  let paramsArr = [
    movie.libraryRating,
    nowDate,
    movie.code
  ]

  db.insert(`UPDATE ${dbName} SET libraryRating = ?,updateDate = ? WHERE code = ?`, paramsArr).then(() => {
    return true
  }).catch(err => {
    console.log('更新数据出错', err)
  })
}

async function spiderMovieDetail (movieLists = [], curret = 0) {
  return new Promise(async (resolve, reject) => {

    if (!movieLists.length) return resolve({ movieLists, curret })
    
    let movie = await movieDetail(movieLists[curret])

    saveMovie(movie)

    setTimeout(() => {
      resolve({ movieLists, curret })
    }, Math.random() * 10000 + 10000)

  }).then(({ movieLists, curret }) => {
    return (curret + 1 < movieLists.length) ? spiderMovieDetail(movieLists, curret + 1) : Promise.resolve(movieLists)
  })
}

async function spiderKeywords (keyLists = [], curret = 0) {
  
  return new Promise(async (resolve, reject) => {

    if (!keyLists.length) return resolve({ keyLists, curret })
    
    let movieLists = await searchKeywords(keyLists[curret])
    console.log(movieLists)
    await spiderMovieDetail(movieLists)

    setTimeout(() => {
      resolve({ keyLists, curret })
    }, Math.random() * 10000 + 10000)

  }).then(({ keyLists, curret }) => {
    if (curret + 1 < keyLists.length) {
      return spiderKeywords(keyLists, curret + 1)
    } else {
      nightmare.end()
      return Promise.resolve(keyLists)
    }
  })
}

module.exports = spiderKeywords
