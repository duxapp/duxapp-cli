/* eslint-disable import/no-commonjs */
const fs = require('fs')
const path = require('path')
const StreamZip = require('node-stream-zip')
const net = require('./net')
const file = require('./file')
const util = require('./util')

const fileExec = {
  reg: /\{#([a-zA-Z0-9 -.@#_\/]{1,})\}/g,
  getPosition(content, exec, mark) {
    const lines = content.split('\n')
    return lines.map((lineContent, index) => {
      const res = [...lineContent.matchAll(fileExec.reg)]
      if (res[0]) {
        const attr = res[0][1].split(' ')
        if ((!exec || attr[0] === exec) && (!mark || attr[1] === mark)) {
          return {
            line: index,
            start: res[0].index,
            length: res[0][0].length,
            attr,
            lines
          }
        }
      }
    }).filter(v => v)
  },
  insert(fileName, mark, content, config) {
    file.editFile(fileName, old => {
      const [res] = this.getPosition(old, 'duxapp-insert', mark)
      if (!res) {
        console.log(`${fileName} 中的 duxapp-insert ${mark} 未找到`)
        return old
      }
      const { line, lines } = res
      if (~line) {
        // 找到文件
        lines.splice(line, 1, ...content.map(item => {
          if (typeof item === 'function') {
            return item(config)
          }
          return item
        }))
        return lines.join('\n')
      }
      return old
    })
  },
  replace(fileName, mark, content, config) {
    const con = typeof content === 'function' ? content(config) : content
    if (typeof con === 'undefined' || con === null) {
      return
    }
    file.editFile(fileName, old => {
      let cons
      this.getPosition(old, 'duxapp', mark).forEach(({ line, start, length, lines, attr }) => {
        const arr = lines[line].split('')
        arr.splice(start, length, con)
        lines[line] = arr.join('')
        cons = lines
      })
      if (cons) {
        return cons.join('\n')
      }
      return old
    })
  },
  removeAll(fileName) {
    file.editFile(fileName, old => {
      let cons
      this.getPosition(old).reverse().forEach(({ line, start, length, lines, attr }) => {
        if (attr[0] === 'duxapp') {
          // 读取默认值
          const val = attr[2] || ''
          const arr = lines[line].split('')
          arr.splice(start, length, val)
          lines[line] = arr.join('')
        } else if (attr[0] === 'duxapp-insert') {
          // 删除行
          lines.splice(line, 1)
        }
        cons = lines
      })
      if (cons) {
        return cons.join('\n')
      }
      return old
    })
  }
}

module.exports = {
  create() {
    const apps = util.getApps()
    const configName = util.getConfigName()

    const configPath = file.pathJoin('configs', configName, 'duxapp.js')
    if (!fs.existsSync(configPath)) {
      console.log('duxapp.js配置文件不存在 请创建')
      process.exit()
    }
    const duxappConfig = require(configPath)
    if (!duxappConfig.android?.appid) {
      console.log('请配置 android.appid')
      process.exit()
    }
    if (!duxappConfig.ios?.BundleId) {
      console.log('请配置 ios.BundleId')
      process.exit()
    }

    /**
     * 复制文件
     */
    const tempList = 'node_modules/duxapp-cli/rnTemplate'
    file.dirAndFileList(tempList).forEach(name => {
      file.delete(name)
      file.copy(tempList + '/' + name, name)
    })

    // 在mac上给 gradlew 添加可执行权限
    if (process.platform === 'darwin') {
      util.asyncExec('cd android && chmod +x ./gradlew')
    }

    /**
     * 模块处理
     */
    const inserts = {}
    apps.forEach(app => {
      const configPath = file.pathJoin('src', app, 'update', 'index.js')
      if (fs.existsSync(configPath)) {
        // 文件内容替换 插入 复制
        const config = require(configPath)
        if (config.insert) {
          Object.keys(config.insert).forEach(file => {
            if (!inserts[file]) {
              inserts[file] = {}
            }
            const pos = config.insert[file]
            Object.keys(pos).forEach(mark => {
              if (!inserts[file][mark]) {
                inserts[file][mark] = []
              }
              inserts[file][mark].push(pos[mark])
            })
          })
        }
        if (config.replace) {
          Object.keys(config.replace).forEach(fileName => {
            const marks = config.replace[fileName]
            Object.keys(marks).forEach(mark => {
              fileExec.replace(fileName, mark, marks[mark], duxappConfig)
            })
          })
        }
        // 复制文件
        const copyPath = file.pathJoin('src', app, 'update', 'copy')
        if (fs.existsSync(copyPath)) {
          file.copy(copyPath, '')
        }
        // 对复制过去的文件进行操作
        if (config.copy) {
          Object.keys(config.copy).forEach(fileName => {
            const callback = config.copy[fileName]
            file.editFile(fileName, content => {
              return callback(content, duxappConfig)
            })
          })
        }
      }
    })
    // 插入内容
    Object.keys(inserts).forEach(fileName => {
      const marks = inserts[fileName]
      Object.keys(marks).forEach(mark => {
        fileExec.insert(fileName, mark, marks[mark], duxappConfig)
      })
    })
    /**
     * 安卓处理
     */
    // 包名 名称 图标 logo 版本
    const androidFiles = [
      'android/settings.gradle',
      'android/gradle.properties',
      'android/build.gradle',
      'android/app/proguard-rules.pro',
      'android/app/build.gradle',
      'android/app/src/main/AndroidManifest.xml',
      'android/app/src/main/java/com/duxapp/MainActivity.kt',
      'android/app/src/main/java/com/duxapp/MainApplication.kt',
      'android/app/src/main/res/values/colors.xml',
      'android/app/src/main/res/values/strings.xml',
      'android/app/src/main/res/values/styles.xml',
    ]
    // 替换包名
    androidFiles.forEach(file => {
      fileExec.replace(file, 'packageName', duxappConfig.android.appid, duxappConfig)
    })
    // 替换名称
    fileExec.replace('android/app/src/main/res/values/strings.xml', 'appName', duxappConfig.android.appName, duxappConfig)
    // 版本号
    fileExec.replace('android/app/build.gradle', 'versionCode', duxappConfig.android.versionCode, duxappConfig)
    fileExec.replace('android/app/build.gradle', 'versionName', duxappConfig.android.versionName, duxappConfig)
    // 证书
    if (duxappConfig.android?.keystore) {
      fileExec.replace('android/gradle.properties', 'keyFile', duxappConfig.android.keystore.storeFile, duxappConfig)
      fileExec.replace('android/gradle.properties', 'keyAlias', duxappConfig.android.keystore.keyAlias, duxappConfig)
      fileExec.replace('android/gradle.properties', 'keyStorePassword', duxappConfig.android.keystore.storePassword, duxappConfig)
      fileExec.replace('android/gradle.properties', 'keyPassword', duxappConfig.android.keystore.keyPassword, duxappConfig)
    }
    /**
     * ios处理 待开发
     */
    // 包名 名称 图标 logo 版本

    /**
     * 复制用户文件
     */
    file.dirAndFileList(`configs/${configName}/copy`).forEach(name => {
      file.copy(`configs/${configName}/copy/${name}`, name)
    })
    /**
     * 未使用的标签 将其删除或者读取默认值
     */
    const allFile = [
      ...androidFiles
    ]
    allFile.forEach(file => {
      fileExec.removeAll(file)
    })

    /**
     * 执行运行时函数生成项目文件
     */

  },
  /**
   * 生成app图标
   * @param {string} filePath logo路径
   */
  async logo(filePath = 'logo.png') {
    const configName = util.getConfigName()
    filePath = path.join('configs', configName, filePath)
    if (!fs.existsSync(file.pathJoin(filePath))) {
      console.log('请将logo放在配置目录下，将其命名为 logo.png')
      process.exit(1)
    }
    // 上传图片
    const { data } = await net.request('https://icon.wuruihong.com/icon/upload', 'POST', filePath, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    // 处理图片
    const generateData = {
      id: data,
      platforms: ['ios', 'android'],
      sizes: [],
      radius: 17.54,
      padding: 0,
      bgColor: null,
      iosLevel: '7+',
      androidFolder: 'mipmap',
      androidName: 'ic_launcher',
      position: 'cover_center',
      badge: { 'type': '无', 'color': '浅色' },
      shield: { 'enabled': false, 'start': 'Version', 'middle': '1.0.0', 'end': 'blue' }
    }
    const { success, message } = await net.request('https://icon.wuruihong.com/icon/generate', 'POST', generateData)
    if (!success) {
      console.log(message)
      process.exit(1)
    }
    // 下载解压图片
    const filename = 'logo.zip'
    await net.download('https://icon.wuruihong.com/icon/download/' + data, filename)
    const zip = new StreamZip({
      file: file.pathJoin(filename),
      storeEntries: true
    })
    zip.on('ready', () => {
      const copyPath = path.join('configs', configName, 'copy')
      zip.extract('android/', file.pathJoin(copyPath, 'android/app/src/main/res'), () => {
        zip.extract('ios/AppIcon.appiconset/', file.pathJoin(copyPath, 'ios/duxapp/Images.xcassets/AppIcon.appiconset'), () => {
          // 删除zip
          file.delete(filename)
          zip.close()
        })
      })
    })
  },
  /**
   * 初始化项目codepush仓库
   * @param {string} os android 或者 ios
   */
  async codepushInit(os) {
    const config = codepushConfig(os)
    await util.asyncExec(
      `appcenter apps create -p React-Native -o ${os === 'android' ? 'Android' : 'iOS'} -d ${config.name} -n ${config.name} --token ${config.token}`,
      `appcenter codepush deployment add Production -a ${config.account}/${config.name} --token ${config.token}`,
      // `appcenter codepush deployment add Test -a ${config.account}/${config.name} --token ${config.token}`
    )
    console.log(`app名称 ${config.account}/${config.name}`)
  },
  async codepushDeploymentKey(os) {
    const config = codepushConfig(os)
    const res = await util.asyncExec(`appcenter codepush deployment list -a ${config.account}/${config.name} -k --token ${config.token}`)
    const keys = Object.fromEntries(res.split('\n').filter((item, index) => {
      return index % 2 === 1 && index > 2 && !!item
    }).map(item => {
      const reg = /[ ]{1,}[\da-zA-Z-_]{1,}[ ]{1,}/g
      return item.match(reg).map(v => v.trim())
    }))
    console.log(os + '端分支key：')
    console.log(res)
    return keys
  },
  /**
   * codepush热更新
   * @param {string} os android 或者 ios
   * @param {string} deployment 上传分支
   */
  async codepush(os = 'android', deployment = 'Production') {
    const config = codepushConfig(os)
    await util.asyncExec(`appcenter codepush release-react -a ${config.account}/${config.name} -t ${config.version} -d ${deployment} --use-hermes --token ${config.token}`)
    console.log(`codePush ${os}版 ${deployment}分支 发布成功`)
  }
}

const codepushConfig = os => {
  const config = { ...util.config(['option', 'codepush', 'common']), ...util.config(['option', 'codepush', os]) }
  if (!config.token) {
    console.log(`请配置${os}的上传token`)
    process.exit(1)
  }
  if (!config.account) {
    console.log(`请配置${os}的上传账号`)
    process.exit(1)
  }
  if (!config.name) {
    console.log(`请配置${os}的上传标识`)
    process.exit(1)
  }
  config.version = config.version || '^1.0.0'
  return config
}
