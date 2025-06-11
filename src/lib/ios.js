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
  const issuerId = util.config(['ios', 'issuerId'])
  const keyId = util.config(['ios', 'keyId'])
  const keyPath = file.pathJoin(util.config(['ios', 'keyPath']))
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
  const issuerId = util.config(['ios', 'issuerId'])
  const keyId = util.config(['ios', 'keyId'])
  const keyPath = file.pathJoin(util.config(['ios', 'keyPath']))
  const exportOptionsPlist = util.config(['ios', 'exportOptionsPlist'])
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
  const account = util.config(['ios', 'account'])
  const password = util.config(['ios', 'password'])
  await util.asyncSpawn(`xcrun altool --upload-app -t ios -f "${filename}" -u "${account}" -p "${password}"`)
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
