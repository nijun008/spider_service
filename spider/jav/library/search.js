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
      waitTimeout: 60000,
      show: true,
      webPreferences: {
        images: false
      },
      openDevTools: {
        mode: 'detach'
      }
    })

    await nightmare
    .goto(host)
    .wait('.btnAdultAgree')
    .wait(1000)
    .click('.btnAdultAgree')
    .wait('#idsearchbox')
    .wait(500)
    .cookies.get({ url: null })

    resolve(nightmare)
  })
}

async function checkPageDom(selector, times = 0) {
  return new Promise(async (resolve, reject) => {
    nightmare.evaluate(selector => {
      console.log('选择器:' + selector)
      console.log($(selector).length)
      // return document.querySelector(selector).innerHTML
      return new Promise((resolve, reject) => {
        setTimeout(() => resolve(document.querySelector(selector).innerText), 900000)
      }, selector)
    }).then(async dom => {
      if (dom) {
        return resolve()
      } else if (times > 5) {
        return reject('More than 5 times number of retries')
      } else {
        await nightmare.end().then()
        nightmare = null
        await nightmareInit()
        await nightmare.goto(host).wait(2000)
        console.log('Try refresh page')
        return checkPageDom(selector, times + 1)
      }
    })
  })
}


async function searchKeywords(keywords) {

  console.log(`Search ${keywords} in Library`)

  await nightmareInit()

  // await checkPageDom('#idsearchbox')

  return nightmare.type('#idsearchbox', keywords.toUpperCase())
  .click('#idsearchbutton')
  .wait(7000)
  .evaluate(() => {
    if (document.querySelector('.videos')) {
      return document.querySelector('.videos').innerHTML
    } else if (document.querySelector('#rightcolumn')) {
      return document.querySelector('#rightcolumn').innerHTML
    }
  })
  .then(async html => {
    $ = cheerio.load(html)

    // 搜索结果为详情页
    if ($('#video_id').length) {
      let movie = analysisHtml(html, keywords.toUpperCase())
      saveMovie(movie)
    }
    
    // 搜索结果为列表页

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
    return document.querySelector('#rightcolumn').innerHTML
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
  let $ = cheerio.load(html)

  let category = []
  $('#video_jacket_info #video_genres .genre a').each((index, item) => {
    category.push($(item).html())
  })

  let actor = []
  $('#video_jacket_info #video_cast .cast a').each((index, item) => {
    actor.push($(item).html())
  })

  let score = $('#video_jacket_info #video_review .score').html() || null

  if (score) {
    score = Number(score.replace(/[()]/g, ''))
  }

  let movie = {
    code,
    name: $('#video_title a').html().replace(code + ' ', '').replace(code, ''),
    releasedDate: $('#video_jacket_info #video_date .text').html(),
    duration: Number($('#video_jacket_info #video_length .text').html()) || 0,
    studio: $('#video_jacket_info #video_maker .text a').html(),
    publisher: $('#video_label .text a').html(),
    category: category.join(','),
    actor: actor.join(','),
    director: $('#video_jacket_info #video_director .director a').html(),
    libraryRating: score,
    rating: 0,
    dbRating: null,
    favoriteCounts: 0
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
    movie.name,
    movie.libraryRating,
    nowDate,
    movie.code
  ]

  db.insert(`UPDATE ${dbName} SET name = ?,libraryRating = ?,updateDate = ? WHERE code = ?`, paramsArr).then(() => {
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
    }, Math.random() * 10000 + 2000)

  }).then(({ movieLists, curret }) => {
    return (curret + 1 < movieLists.length) ? spiderMovieDetail(movieLists, curret + 1) : Promise.resolve(movieLists)
  })
}

async function spiderKeywords (keyLists = [], curret = 0) {
  
  return new Promise(async (resolve, reject) => {

    if (!keyLists.length) return resolve({ keyLists, curret })
    
    let movieLists = await searchKeywords(keyLists[curret])

    await spiderMovieDetail(movieLists)

    setTimeout(() => {
      resolve({ keyLists, curret })
    }, Math.random() * 10000 + 2000)

  }).then(({ keyLists, curret }) => {
    if (curret + 1 < keyLists.length) {
      return spiderKeywords(keyLists, curret + 1)
    } else {
      nightmare.end().then().catch()
      return Promise.resolve(keyLists)
    }
  })
}

module.exports = spiderKeywords
