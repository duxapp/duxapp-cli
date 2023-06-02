/* eslint-disable import/no-commonjs */
const file = require('./file')
const fs = require('fs')

const css = {
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

module.exports = css
