/* eslint-disable import/no-commonjs */
const file = require('./file')
const fs = require('fs')

/**
 * css单位换算
 * @app
 */
module.exports = {
  /**
   * 将目录内的css或者scss文件内的单位进行批量转换
   * @param dir 
   * @param original 
   * @param to 
   * @param zoom 
   */
  unitTransform(dir, original = 'px', to = 'rem', zoom = 1) {
    const fileDir = file.pathJoin(dir)
    const reg = new RegExp(' ([\\d\\.]{1,})' + original, 'gi')
    const callback = item => {
      file.editFile(item, data => {
        return data.replace(reg, function (all, item) {
          if (original === 'px' && item == 1) {
            return ' 1px'
          }
          return ' ' + item * zoom + to;
        })
      })
    }
    if (fs.statSync(fileDir).isDirectory()) {
      file.fileList(dir, '.css,.scss', callback)
    } else {
      callback(fileDir)
    }
  }
}
