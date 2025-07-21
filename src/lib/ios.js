import fs from 'fs'

import * as util from './util.js'
import * as file from './file.js'

/**
 * ios的一些命令 例如安装pod依赖，这通常不需要你手动操作
 * @app
 */
const app = 'ios'

/**
 * 安装pod依赖
 * @function
 * @param args 传给pod命令的参数
 */
export const pod = async (...args) => {
  await util.asyncSpawn(`pod ${args.join(' ')}`, {
    cwd: file.pathJoin('ios'),
    env: {
      ...process.env,
      ...getPodEnv()
    }
  })
}

/**
 * 编译正式版
 * @function
 */
export const build = async () => {
  const issuerId = getConfig(['ios', 'issuerId'])
  const keyId = getConfig(['ios', 'keyId'])
  const keyPath = file.pathJoin(getConfig(['ios', 'keyPath']))
  const execs = [
    'export SKIP_BUNDLING=TRUE && ',
    'xcodebuild -workspace ios/duxapp.xcworkspace -scheme duxapp clean archive -configuration release ',
    '-allowProvisioningUpdates ',
    '-authenticationKeyPath ' + keyPath + ' ',
    '-authenticationKeyIssuerID ' + issuerId + ' ',
    '-authenticationKeyID ' + keyId + ' ',
    '-archivePath dist/ios/duxapp.xcarchive'
  ]
  await util.asyncSpawn(execs.join(''))
}

/**
 * 导出ipa
 * @function
 */
export const exportIpa = async () => {
  const issuerId = getConfig(['ios', 'issuerId'])
  const keyId = getConfig(['ios', 'keyId'])
  const keyPath = file.pathJoin(getConfig(['ios', 'keyPath']))
  const exportOptionsPlist = getConfig(['ios', 'exportOptionsPlist'])
  const execs = [
    `xcodebuild -exportArchive -archivePath dist/ios/duxapp.xcarchive -exportPath dist/ios/duxapp.ipa -exportOptionsPlist ${exportOptionsPlist} `,
    '-allowProvisioningUpdates ',
    '-authenticationKeyPath ' + keyPath + ' ',
    '-authenticationKeyIssuerID ' + issuerId + ' ',
    '-authenticationKeyID ' + keyId + ' '
  ]
  await util.asyncSpawn(execs.join(''))
}

/**
 * 上传到应用中心
 * @function
 * @param filename ipa文件路径
 */
export const upload = async filename => {
  const account = getConfig(['ios', 'account'])
  const password = getConfig(['ios', 'password'])
  await util.asyncSpawn(`xcrun altool --upload-app -t ios -f "${filename}" -u "${account}" -p "${password}"`)
}

const getConfig = async (keys = [], exit = true) => {

  const configName = await util.getConfigName()

  const fileName = file.pathJoin('configs', configName, 'duxapp.rn.js')

  if (!fs.existsSync(fileName)) {
    if (exit) {
      console.log('请在项目配置目录下创建duxapp.rn.js配置文件')
      process.exit(1)
    }
    return
  }
  const config = await util.importjs(fileName)
  const res = recursionGetValue(keys, config)
  if (res === undefined) {
    if (exit) {
      console.log('请配置', keys.join('.'))
      process.exit(1)
    }
    return
  }
  return res
}

const recursionGetValue = (keys, data = {}, childKey, splice = false) => {
  keys = typeof keys === 'string' ? keys.split('.') : [...keys]
  if (keys.length === 0) {
    return false
  } if (keys.length === 1) {
    return splice ? data.splice(keys[0], 1)[0] : data[keys[0]]
  } else {
    return recursionGetValue(keys.slice(1), childKey === undefined ? data[keys[0]] : data[keys[0]][childKey], childKey, splice)
  }
}

const getPodEnv = () => {
  // 读取文件内容
  if (!fs.existsSync(file.pathJoin('ios/.pod.env'))) {
    return {}
  }
  const envData = file.readFile('ios/.pod.env')

  // 将每一行拆分为键值对
  const envConfig = {}
  envData.split('\n').forEach(line => {
    // 忽略注释和空行
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      // 分割键和值
      const [key, value] = trimmedLine.split('=')
      envConfig[key.trim()] = value ? value.trim() : ''
    }
  })

  return envConfig
}
