import fs from 'fs'

import * as file from './file.js'

/**
 * css单位换算
 * @app
 */
const app = 'css'

/**
 * 将目录内的css或者scss文件内的单位进行批量转换
 * @function
 * @param dir 需要扫描css scss的目录
 * @param original 原单位(px)
 * @param to 新单位(rem)
 * @param zoom 缩放比例(1)
 */
export const unitTransform = (dir, original = 'px', to = 'rem', zoom = 1) => {
  const fileDir = file.pathJoin(dir)
  const reg = new RegExp(' ([\\d\\.]{1,})' + original, 'gi')
  const callback = item => {
    file.editFile(item, data => {
      return data.replace(reg, function (all, item) {
        if (original === 'px' && item == 1) {
          return ' 1px'
        }
        return ' ' + item * zoom + to
      })
    })
  }
  if (fs.statSync(fileDir).isDirectory()) {
    file.fileList(dir, '.css,.scss', callback)
  } else {
    callback(fileDir)
  }
}

