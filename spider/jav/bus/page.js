const Nightmare = require('nightmare')
const cheerio = require("cheerio")

const spiderMovie = require('./movie')

let host = 'https://www.javbus.com/'


function getList(page) {

  console.log(`Spidering Bus page number ${page}`)

  let nightmare = Nightmare({
    // show: true,
    webPreferences: {
      images: false
    }
  })

  return nightmare
  .goto(`${host}page/${page}`)
  .wait('.masonry')
  .evaluate(() => {
    return document.querySelector('.masonry').innerHTML
  })
  .end()
  .then(html => {
    $ = cheerio.load(html)
    let list = []
    $('.masonry-brick').each((index, item) => {
      let code = $(item).find('.photo-info date').eq(0).html()
      list.push({
        code: code,
        url: $(item).find('a.movie-box').attr('href')
      })
    })

    return list
  })
  .catch(err => {
    console.log(err)
  })
}

async function spiderPage (startPage = 1, endPage = 2) {
  
  return new Promise(async (resolve, reject) => {
    
    let list = await getList(startPage)

    await spiderMovie(list)

    setTimeout(() => {
      resolve({ startPage, endPage })
    }, Math.random() * 10000 + 10000)

  }).then(({ startPage, endPage }) => {
    return (startPage < endPage) ? spiderPage(startPage + 1, endPage) : Promise.resolve(endPage)
  })
}

module.exports = spiderPage
