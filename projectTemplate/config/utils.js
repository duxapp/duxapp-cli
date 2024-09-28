import path from 'path'
import fs from 'fs'
import util from 'duxapp-cli/lib/util'

const appRoot = path.join(__dirname, '..')

/**
 * 导出别名
 * @returns
 */
export const getAlias = () => Object.fromEntries(
  fs
    .readdirSync(path.join(appRoot, 'src'))
    .filter(file => {
      const stat = fs.lstatSync(path.join(appRoot, 'src', file))
      return stat.isDirectory()
    })
    .map(file => ['@/' + file, path.join(appRoot, 'src', file)])
)

export const getAppConfig = type => {
  const customAppsArgv = util.getArgv().find(item => item.startsWith('--app='))

  let appName
  if (customAppsArgv) {
    appName = customAppsArgv.split('=')[1].split(',')[0]
  }
  let fileDir = ''
  if (appName) {
    const fileName = `taro.config${type ? '.' + type : ''}.js`
    fileDir = path.join(appRoot, 'src', appName)
    if (fs.existsSync(path.join(fileDir, fileName))) {
      fileDir = path.join(fileDir, fileName)
    } else if (fs.existsSync(path.join(fileDir, 'taro.config.js'))) {
      fileDir = path.join(fileDir, 'taro.config.js')
    } else {
      appName = ''
    }
  }

  if (appName) {
    return require(fileDir)
  }
  return {}
}
