/* eslint-disable import/no-commonjs */
const fs = require('fs')
const exec = require('child_process').exec
const util = require('./util')

module.exports = {
  /**
   * 生成证书
   */
  keystore(alias = 'duxapp') {
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
        return `cd "${java}/${jdk}/bin" && start keytool.exe`
      } else {
        return 'keytool'
      }
    }
    // 证书密码
    const password = util.randomString(16)

    const cmd = `${getKeyTools()} -genkeypair -v -storetype PKCS12 -keystore ${global.projectDir}/configs/${configName}/copy/android/app/${alias}.keystore -alias ${alias} -keyalg RSA -keysize 2048 -validity 15000 -storepass ${password} -dname "CN=(xujian), OU=(jujiang), O=(jujiang), L=(changsha), ST=(hunan), C=(cn)"`
    return new Promise((resolve, reject) => {
      exec(cmd, function (error) {
        if (error) {
          console.log('生成证书发生错误', error)
          reject(error)
          process.exit(1)
        } else {
          console.log('请将下列配置配置到 duxapp.js 的 android.keystore 中')
          console.log(JSON.stringify({
            storeFile: `${alias}.keystore`,
            keyAlias: alias,
            storePassword: password,
            keyPassword: password
          }, null, 2))
          resolve()
        }
      })
    })
  }
}
