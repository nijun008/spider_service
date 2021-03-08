const Nightmare = require('nightmare')
const cheerio = require("cheerio")

const spiderMovie = require('./movie')

let host = 'https://b47w.com/cn/'


function searchMovie(code) {

  console.log(`Spidering Library ${code}`)

  let nightmare = Nightmare({
    show: true,
    webPreferences: {
      images: false
    }
  })
// btnAdultAgree
  return nightmare
  .goto(host)
  .click('.btnAdultAgree')
  .wait('#idsearchbox')
  .type('#idsearchbox', code)
  .click('#idsearchbutton')
  .wait(2000)
  .evaluate(() => {
    return document.querySelector('.videos').innerHTML
  })
  .end()
  .then(html => {
    $ = cheerio.load(html)
    
    let list = []
    $('.video').each((index, item) => {
      list.push({
        url: $(item).find('a').eq(0).attr('href').replace('./', host)
      })
    })
    console.log(list)
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

// module.exports = spiderPage

module.exports = searchMovie
