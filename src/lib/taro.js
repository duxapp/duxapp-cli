import fs from 'fs'
import path from 'path'

import * as file from './file.js'

/**
 * 和Taro相关的命令
 * @app
 */
const app = 'taro'

/**
 * 批量为页面创建配置文件
 * @function
 * @param pageDir 要查找页面的路径
 * @param configFile 内容来源文件
 * @param cover 如果文件存在 是否覆盖源文件
 */
export const createPageConfig = (pageDir, configFile, cover = false) => {
  const config = file.readFile(configFile)
  file.fileList(pageDir, '.jsx', filePath => {
    const dirs = filePath.split(pageDir)[1].split(path.sep).filter(v => v)
    if (dirs.length !== 2) {
      return
    }

    const configName = dirs[dirs.length - 1].split('.')[0] + '.config.js'
    const configFile = path.join(pageDir, dirs[0], configName)
    if (!cover && fs.existsSync(file.pathJoin(configFile))) {
      // 验证文件是否存在
      return
    }
    file.editFile(configFile, () => config)
  })
}
