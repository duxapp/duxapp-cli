const fs = require('fs')
const path = require('path')
const file = require('./file')

/**
 * duxapp项目相关命令
 * @app
 */
const project = {
  /**
   * 更新项目公共文件，例如 .gitignore jsconfig.json 等
   */
  update(log = true) {
    const projectTemplate = file.pathJoin('src/duxapp/projectTemplate')
    const copyList = file.dirAndFileList(projectTemplate)
    copyList.forEach(fileName => {
      file.delete(fileName)
      file.copy(path.join(projectTemplate, fileName), fileName)
    })
    log !== false && console.log(`项目更新完成！`)
  },
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

    file.fileList('src', '.jsx,.js', file => {
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
  },
}

module.exports = project
