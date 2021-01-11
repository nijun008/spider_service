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
  .then(html => {
    console.log(html)
  })
  .catch((err) => {
    console.log(err)
  })
  
}

async function testPage () {
  
  let list = await getMeizi()
  console.log(list)

}

module.exports = testPage