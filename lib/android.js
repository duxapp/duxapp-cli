/* eslint-disable import/no-commonjs */
const fs = require('fs')
const spawn = require('child_process').spawn
const util = require('./util')
const file = require('./file')

/**
 * 安卓相关命令 用于创建证书
 * @app
 */
module.exports = {
  /**
   * 生成证书
   * @func keystore
   * @param alias [可选]证书别名
   */
  async keystore(alias = 'duxapp') {
    const configName = util.getConfigName()
    const getKeyTools = () => {
      if (util.os() === 'Windows') {
        const javaPaths = [
          'C:/Program Files/Java',
          'C:/Program Files (x86)/Java',
          'C:/Java',
          process.env.JAVA_HOME // 使用环境变量
        ].filter(Boolean)
        let keytoolPath = null

        // 遍历检查路径，找到 JDK
        for (const path of javaPaths) {
          if (fs.existsSync(path)) {
            const jdk = fs.readdirSync(path).find(item => item.startsWith('jdk'))
            if (jdk) {
              keytoolPath = `${path}/${jdk}/bin`
              break
            }
          }
        }

        // 未找到 JDK
        if (!keytoolPath) {
          console.log(
            '未找到 JDK，无法生成证书。请按照教程安装 JDK：',
            'https://reactnative.cn/docs/environment-setup#node-jdk'
          );
          process.exit(1)
        }

        return ['start keytool.exe', keytoolPath]
      } else {
        return ['keytool', '']
      }
    }
    // 证书密码
    const password = util.randomString(16)

    const tempFile = `${process.cwd()}/configs/${configName}/${alias}.keystore`

    const output = `configs/${configName}/copy.rn/android/app/${alias}.keystore`

    const [keytook, cwd] = getKeyTools()

    const dname = 'CN=(duxapp), OU=(duxapp), O=(duxapp), L=(changsha), ST=(hunan), C=(cn)'

    const task = spawn(keytook, [
      '-genkeypair', '-v',
      '-storetype', 'PKCS12',
      '-keystore', tempFile,
      '-alias', alias,
      '-keyalg', 'RSA',
      '-keysize', '2048',
      '-validity', '15000',
      '-storepass', password,
      '-dname', process.platform === 'win32' ? `"${dname}"` : dname
    ], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      cwd
    })

    task.on('error', (data) => {
      console.log('error', data)
      process.exit(1)
    })

    task.on('exit', (code) => {
      if (code !== 0) {
        process.exit(1)
      }
      setTimeout(() => {
        file.move(tempFile, output)
        console.log('请将下列配置配置到 duxapp.rn.js 的 android.keystore 中')
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
