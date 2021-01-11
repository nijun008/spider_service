// 随手拍（妹子图）

const Nightmare = require('nightmare')
const cheerio = require("cheerio")

const nightmare = Nightmare()

function getMeizi () {
  return nightmare
  .goto(`https://www.appinn.com/`)
  .wait('.latestPost')
  .wait(() => {
    window.htmlArr = window.htmlArr || []
    
    if (!document.querySelector('.latestPost')) {
      return false
    }

    window.htmlArr.push(document.querySelector('#latest-posts').innerHTML)

    let currentPage = document.querySelector('.page-numbers.current')

    if (currentPage && currentPage.innerHTML == 5) {
      return true
    }

    let nextBtn = document.querySelector(".nav-links .next")
    if (nextBtn) {
      nextBtn.click()
      return false
    }
    return true
  })
  .evaluate(() => {
    return window.htmlArr
  })
  .end()
  .then(htmlList => {
    console.log(htmlList)
    let articleList = []
    htmlList.forEach(html => {
      let $ = cheerio.load(html)
      $('article.post-box').each((index, article) => {
        let tags = []
        $(article).find('.post-info .thecategory a').each((index, tag) => tags.push($(tag).html()))

        let articleItem = {
          cover: $(article).find('.post-img img').attr('src'),
          title: $(article).find('.post-data .post-title a').html(),
          excerpt: $(article).find('.post-data .post-excerpt').html(),
          originUrl: $(article).find('.post-data .post-title a').attr('href'),
          originUrl: $(article).find('.post-info .thetime span').html(),
          tags: tags
        }

        articleList.push(articleItem)
        console.log(articleItem)
      })
    })
  })
  .catch((err) => {
    console.log(err)
  })
  
}

async function testPage () {
  
  await getMeizi()

}

module.exports = testPage