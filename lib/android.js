/* eslint-disable import/no-commonjs */
const fs = require('fs')
const path = require('path')
const exec = require('child_process').exec
const util = require('./util')
const file = require('./file')

module.exports = {
  /**
   * 生成证书
   */
  keystore() {
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
    // 证书别名
    const alias = util.projectName()

    const cmd = `${getKeyTools()} -genkeypair -v -storetype PKCS12 -keystore ${global.projectDir}/android/app/${alias}.keystore -alias ${alias} -keyalg RSA -keysize 2048 -validity 15000 -storepass ${password} -dname "CN=(xujian), OU=(jujiang), O=(jujiang), L=(changsha), ST=(hunan), C=(cn)"`
    return new Promise((resolve, reject) => {
      exec(cmd, function (error) {
        if (error) {
          console.log('生成证书发生错误', error)
          reject(error)
          process.exit(1)
        } else {
          // 配置gradle.properties
          file.editFile('android/gradle.properties', data => {
            const keys = [
              ['MYAPP_RELEASE_STORE_FILE=', alias + '.keystore'],
              ['MYAPP_RELEASE_KEY_ALIAS=', alias],
              ['MYAPP_RELEASE_STORE_PASSWORD=', password],
              ['MYAPP_RELEASE_KEY_PASSWORD=', password]
            ]
            return data.split('\n').map(item => {
              const current = keys.find(key => item.startsWith(key[0]))
              if (current) {
                return current.join('')
              }
              return item
            }).join('\n')
          })
          resolve()
        }
      })
    })
  },
  /**
   * 替换包名
   */
  async packageName(name) {
    const currentName = file.readFile('android/app/src/main/AndroidManifest.xml').match(/package="([a-z.]{1,})"/)[1]
    const currentNames = currentName.split('.')
    const currentPath = currentNames.join('/')

    name = name || `com.duxapp.${util.projectName()}`
    if (name === currentName) {
      onclose.log('相同的包名，无需修改')
      return
    }
    const names = name.split('.')

    const func1 = data => data.replace(new RegExp(currentName, 'gim'), name)
    const func2 = data => data
      .replace(`package ${currentName};`, `package ${name};`)
      .replace(`import ${currentName}.newarchitecture.MainApplicationReactNativeHost;`, `import ${name}.newarchitecture.MainApplicationReactNativeHost;`)
      .replace(`"${currentName}.ReactNativeFlipper"`, `"${name}.ReactNativeFlipper"`)
    const func3 = data => data.replace(`package ${currentName}.wxapi;`, `package ${name}.wxapi;`)
    const func4 = data => data.replace(`Lcom/${currentNames.slice(1).join('/')}/newarchitecture`, `Lcom/${names.slice(1).join('/')}/newarchitecture`)
    const func5 = data => data
      .replace(`package ${currentName}.newarchitecture;`, `package ${name}.newarchitecture;`)
      .replace(`import ${currentName}.BuildConfig;`, `import ${name}.BuildConfig;`)
      .replace(`import ${currentName}.newarchitecture.components.MainComponentsRegistry;`, `import ${name}.newarchitecture.components.MainComponentsRegistry;`)
      .replace(`import ${currentName}.newarchitecture.modules.MainApplicationTurboModuleManagerDelegate;`, `import ${name}.newarchitecture.modules.MainApplicationTurboModuleManagerDelegate;`)
    const func6 = data => data.replace(`package ${currentName}.newarchitecture`, `package ${name}.newarchitecture`)

    const files = [
      ['android/app/_BUCK', func1],
      ['android/gradle.properties', func1],
      ['android/app/src/main/AndroidManifest.xml', func1],
      ['android/app/src/main/java/' + currentPath + '/MainActivity.java', func2],
      ['android/app/src/main/java/' + currentPath + '/MainApplication.java', func2],
      ['android/app/src/main/java/' + currentPath + '/wxapi/WXEntryActivity.java', func3],
      ['android/app/src/main/java/' + currentPath + '/wxapi/WXPayEntryActivity.java', func3],
      [`android/app/src/main/java/${currentPath}/newarchitecture/MainApplicationReactNativeHost.java`, func5],
      [`android/app/src/main/java/${currentPath}/newarchitecture/components/MainComponentsRegistry.java`, func6],
      [`android/app/src/main/java/${currentPath}/newarchitecture/modules/MainApplicationTurboModuleManagerDelegate.java`, func6],
      ['android/app/src/main/jni/MainApplicationTurboModuleManagerDelegate.h', func4],
      ['android/app/src/main/jni/MainComponentsRegistry.h', func4]
    ]
    files.forEach(item => file.editFile(...item))

    // 更改包名目录结构
    const javaDir = 'android/app/src/main/java/'
    const fromDir = javaDir + currentPath
    const tempDir = javaDir + 'temp'
    const toDir = javaDir + name.split('.').join('/')
    if (!fs.existsSync(toDir)) {
      await file.move(fromDir, tempDir)
      await file.move(tempDir, toDir)
    }
  }
}
