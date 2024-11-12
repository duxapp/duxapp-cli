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

  return util.getApps().map(app => {
    const appDir = path.join(appRoot, 'src', app)
    const config = []
    let configFile = path.join(appDir, 'taro.config.js')
    if (fs.existsSync(configFile)) {
      config.push(require(configFile))
    }
    configFile = path.join(appDir, `taro.config.${type}.js`)
    if (type && fs.existsSync(configFile)) {
      config.push(require(configFile))
    }
    return config
  }).flat()
}
