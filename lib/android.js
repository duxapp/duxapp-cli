/* eslint-disable import/no-commonjs */
const fs = require('fs')
const spawn = require('child_process').spawn
const util = require('./util')
const file = require('./file')

module.exports = {
  /**
   * 生成证书
   */
  async keystore(alias = 'duxapp') {
    const configName = util.getConfigName()
    const getKeyTools = () => {
      if (util.os() === 'Windows') {
        const java = 'C:/Program Files/Java'
        if (!fs.existsSync(java)) {
          console.log('jdk未安装无法生成证书,请按照教程安装jdk', 'https://reactnative.cn/docs/environment-setup#node-jdk')
          process.exit(1)
        }
        const jdk = fs.readdirSync(java).find(item => item.startsWith('jdk'))
        if (!jdk) {
          console.log('jdk未安装无法生成证书,请按照教程安装jdk', 'https://reactnative.cn/docs/environment-setup#node-jdk')
          process.exit(1)
        }
        return [`start keytool.exe`, `${java}/${jdk}/bin`]
      } else {
        return ['keytool', '']
      }
    }
    // 证书密码
    const password = util.randomString(16)

    const tempFile = `${global.projectDir}/configs/${configName}/${alias}.keystore`

    const output = `configs/${configName}/copy/android/app/${alias}.keystore`

    const [keytook, cwd] = getKeyTools()

    const task = spawn(keytook, [
      '-genkeypair','-v',
      '-storetype', 'PKCS12',
      '-keystore', tempFile,
      '-alias', alias,
      '-keyalg', 'RSA',
      '-keysize', '2048',
      '-validity', '15000',
      '-storepass', password,
      '-dname', '"CN=(xujian), OU=(duxapp), O=(duxapp), L=(changsha), ST=(hunan), C=(cn)"'
    ], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      cwd
    })

    task.on('error', (data) => {
      console.log('error', data)
    })

    task.on('exit', (code) => {
      setTimeout(() => {
        file.move(tempFile, output)
        console.log('请将下列配置配置到 duxapp.js 的 android.keystore 中')
        console.log(`{
  storeFile: '${alias}.keystore',
  keyAlias: '${alias}',
  storePassword: '${password}',
  keyPassword: '${password}'
}`)
      }, 3000)
    })
  }
}
