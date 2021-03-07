const mysql = require('mysql')
const dbConfig = require('./config')

class Db {
  constructor(mysql, dbConfig) {
    this.mysql = mysql
    this.dbConfig = dbConfig
  }

  createConnection () {
    return new Promise((resolve, reject) => {
      const connection = this.mysql.createConnection(this.dbConfig)
  
      connection.connect(err => {
        if (err) {
          console.log('数据库连接错误：', err)
          return this.createConnection()
        } else {
          resolve(connection)
        }
      })
    })
  }

  endConnection (connection) {
    return new Promise((resolve, reject) => {
      if (connection && connection.end) {
        connection.end(err => {
          if (err) {
            console.log('关闭数据库连接错误：', err)
            reject(err)
            throw err
          } else {
            resolve(connection)
          }
        })
      } else {
        resolve(connection)
      }
    })
  }

  async query (sql, params) {

    const connection = await this.createConnection()

    return new Promise((resolve, reject) => {
      connection.query(sql, params, (err, result) => {
        if (err) {
          console.log('数据库操作错误：', err)
          reject(err)
          throw err
        } else {
          resolve(result)
        }
  
        this.endConnection(connection)
      })
    })
  }

  async insert (sql, params) {

    const connection = await this.createConnection()

    return new Promise((resolve, reject) => {
      connection.query(sql, params, (err, result) => {
        if (err) {
          console.log('数据库操作错误：', err)
          reject(err)
          throw err
        } else {
          resolve(result)
        }
  
        this.endConnection(connection)
      })
    })
  }

  async delete(sql) {
    const connection = await this.createConnection()

    return new Promise((resolve, reject) => {
      connection.query(sql, (err, result) => {
        if (err) {
          console.log('数据库操作错误：', err)
          reject(err)
          throw err
        } else {
          resolve(result)
        }
  
        this.endConnection(connection)
      })
    })
  }
}

module.exports = new Db(mysql, dbConfig)