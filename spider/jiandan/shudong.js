const Nightmare = require('nightmare')
const cheerio = require("cheerio")
const host = require('./config').host

const nightmare = Nightmare()

function getShudong (cb) {

  nightmare
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

    cb && cb(comments)
    return comments
  })
  .catch(() => {
    console.log('抓取煎蛋树洞出错')
  })
  
}

module.exports = getShudong