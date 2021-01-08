const mysql = require('mysql')
const uuid = require('uuid')
const dayjs = require('dayjs')

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '123456',
  port: '3306',
  database: 'hot_dev'
})

const getShudong = require('./shudong')

function spiderShudong () {

  getShudong(list => {
    connection.connect()

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
              console.log('数据插入成功 id：' + row.id)
            }
          })

        }
      })
    })

    // connection.end()
  })
}

module.exports = {
  spiderShudong
}