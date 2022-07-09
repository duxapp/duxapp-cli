const fs = require('fs')
const path = require('path')
const file = require('./file')

const project = {
  /**
   * 清理项目未使用的静态资源文件
   */
  clearStatic() {
    const getFileImage = dir => {
      const content = fs.readFileSync(dir, { encoding: 'utf8' })
      const list = []
      const imp = /import [\da-zA-Z_]{1,} from \'[.@\/\da-zA-Z_-]{1,}.(jpg|png|gif)\'/g
      let res = content.match(imp)
      if (res) {
        res.forEach(item => {
          list.push(item.split('\'')[1])
        })
      }
      const req = /require\(\'[.@\/\da-zA-Z_-]{1,}.(jpg|png|gif)\'\)/g
      res = content.match(req)
      if (res) {
        res.forEach(item => {
          list.push(item.split('\'')[1])
        })
      }
      return list.map(item => {
        if (item.startsWith('@/')) {
          return file.pathJoin('src', item.substr(2))
        }
        return path.join(path.dirname(dir), item)
      })
    }

    const images = []

    file.fileList('src', '.jsx', file => {
      const list = getFileImage(file)
      list.forEach(item => {
        if (!images.includes(item)) {
          images.push(item)
        }
      })
    })
    let count = 0
    file.fileList('src', '.png,.jpg,.gif', item => {
      if (!images.includes(item)) {
        count++
        fs.unlinkSync(item)
      }
    })
    console.log('清理成功 共删除了' + count + '个文件！')
  }
}

module.exports = project
