/* eslint-disable import/no-commonjs */
const fs = require('fs')
const plist = require('plist')
const net = require('./net')
const file = require('./file')
const util = require('./util')
const android = require('./android')
const ios = require('./ios')

module.exports = {
  /**
   * 替换package.json的name
   * @param {string} name
   */
  packageName(name, description = name) {
    const packageFile = util.json.get('package.json')
    packageFile.name = name
    packageFile.description = description
    util.json.set('package.json', packageFile)
  },
  /**
   * 生成app图标
   * @param {string} filePath logo路径
   */
  async appIcon(filePath = 'logo.png') {
    if (!fs.existsSync(file.pathJoin(filePath))) {
      console.log('请将logo放在项目根目录下，将其命名为 logo.png')
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
    const StreamZip = require('node-stream-zip')
    const zip = new StreamZip({
      file: file.pathJoin(filename),
      storeEntries: true
    })
    zip.on('ready', () => {
      zip.extract('android/', file.pathJoin('android/app/src/main/res'), () => {
        zip.extract('ios/AppIcon.appiconset/', file.pathJoin(ios.dir('Images.xcassets/AppIcon.appiconset')), () => {
          // 删除zip
          file.delete(filename)
          zip.close()
        })
      })
    })
  },
  /**
   * 替换app名称 默认将换为package.json里面的name
   * @param {string} name app名称 默认使用package的name
   */
  appName(name) {
    name = name || util.projectName()
    // 安卓
    file.editFile('android/app/src/main/res/values/strings.xml', data => {
      return data.replace(/<string name="app_name">([\s\S]*?)<\/string>/, () => {
        return `<string name="app_name">${name}</string>`
      })
    })
    // ios
    file.editFile(ios.dir('Info.plist'), data => {
      const info = plist.parse(data)
      info.CFBundleDisplayName = name
      return plist.build(info)
    })
  },
  /**
   * 修改安卓端packageName
   * 修改ios端BundleID
   * @param {string} id 包名
   */
  async appID(id) {
    await android.packageName(id)
    ios.BundleID(id)
  },
  /**
   * 上传到蒲公英
   * @param {string} path 安装包路径
   */
  async pgyer(path) {
    const apiKey = util.config(['pgyer', 'apiKey'])
    console.log('安装包上传中...')
    const { code, message, data } = await net.request('https://www.pgyer.com/apiv2/app/upload', 'POST', path, {
      formData: {
        _api_key: apiKey
      }
    })
    if (code !== 0) {
      console.log(message)
    } else {
      console.log(`发布成功
名称: ${data.buildName}
版本: ${data.buildVersion}
类型: ${data.buildType === 1 ? 'IOS' : 'Android'}
包名: ${data.buildIdentifier}
下载: https://www.pgyer.com/${data.buildShortcutUrl}
大小: ${data.buildFileSize} bit`)
    }
  },
  /**
   * 清理taro打包后的资源文件，防止被删除的资源占用位置
   * @param {string} os android 或者 ios
   */
  clearBuildAssets(os) {
    if (os === 'android') {
      [
        'drawable-hdpi',
        'drawable-mdpi',
        'drawable-xhdpi',
        'drawable-xxhdpi',
        'drawable-xxxhdpi'
      ].forEach(item => {
        file.delete(`android/app/src/main/res/${item}`)
      });
    } else {
      file.delete('ios/assets')
    }
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
      `appcenter codepush deployment add Test -a ${config.account}/${config.name} --token ${config.token}`
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
   * 将打包后的代码集成到codepush可以发布的包
   * @param {string} os android 或者 ios
   * @param {string} dir 打包后存在目录
   */
  buildCodepushFiles(os, dir = 'dist/code-push-' + os) {
    file.delete(dir);
    if (os === 'android') {
      [
        'drawable-hdpi',
        'drawable-mdpi',
        'drawable-xhdpi',
        'drawable-xxhdpi',
        'drawable-xxxhdpi'
      ].forEach(item => {
        file.copy(`android/app/src/main/res/${item}`, `${dir}/${item}`)
      });
      file.copy(`android/app/src/main/assets/index.android.bundle`, `${dir}/index.android.bundle`)
    } else {
      [
        'assets',
        'main.jsbundle'
      ].forEach(item => {
        file.copy(`ios/${item}`, `${dir}/${item}`)
      })
    }
  },
  /**
   * codepush热更新
   * @param {string} os android 或者 ios
   * @param {string} dir 代码所在目录
   * @param {string} deployment 上传分支
   */
  async codepush(os = 'android', dir = 'dist/code-push-' + os, deployment = 'Production') {
    const config = codepushConfig(os)
    await util.asyncExec(`appcenter codepush release -c ${dir} -a ${config.account}/${config.name} -t ${config.version} -d ${deployment} --token ${config.token}`)
    console.log(`codePush ${os}版 ${deployment}分支 发布成功`)
  },
  /**
   * codepush热更新
   * @param {string} os android 或者 ios
   * @param {string} deployment 上传分支
   */
  async codepushRN(os = 'android', deployment = 'Production') {
    const config = codepushConfig(os)
    await util.asyncExec(`appcenter codepush release-react -a ${config.account}/${config.name} -t ${config.version} -d ${deployment} --use-hermes --token ${config.token}`)
    console.log(`codePush ${os}版 ${deployment}分支 发布成功`)
  },

  /**
   * 创建打包依赖缓存
   */
  async appDependencies() {

    const getAppConfig = _apps => {
      return Object.fromEntries(_apps.map(name => [
        name,
        require(file.pathJoin('src', name, 'app.json'))
      ]))
    }
    // 获取app列表
    let apps = file.dirList('src')
    // 筛选命令行中指定的app
    const customAppsArgv = process.argv.find(item => item.startsWith('--apps=')) || JSON.parse(process.env.npm_config_argv).original.find(item => item.startsWith('--apps='))

    if (customAppsArgv) {
      const customApps = customAppsArgv.split('=')[1].split(',')
      const configs = getAppConfig(apps)
      // 检查模块依赖
      const getDependencies = (name, list = []) => {
        if (!configs[name]) {
          throw 'app配置文件不存在:' + name + '/' + 'app.json'
        }
        if (!list.includes(name)) {
          list.unshift(name)
        }
        const { dependencies } = configs[name]
        if (dependencies.length) {
          dependencies.forEach(childName => {
            getDependencies(childName, list)
          })
        }
        return list
      }

      apps = [...new Set(customApps.map(name => getDependencies(name)).flat())]
    }

    const buildDependencies = apps.map(app => {
      return require(file.pathJoin('src', app, 'app.json')).reactNativeDependencies || []
    }).flat()

    const disableDependencies = Object.keys(require(file.pathJoin('package.json')).dependencies).filter(name => {
      return fs.existsSync(file.pathJoin('node_modules', name, 'android')) || fs.existsSync(file.pathJoin('node_modules', name, 'react-native.config.js'))
    }).filter(name => {
      return !buildDependencies.includes(name)
    }).map(name => ([
      name,
      {
        platforms: {
          android: null,
          ios: null
        }
      }
    ]))
    // console.log(disableDependencies)

    file.editFile('dist/react-native-config.json', () => JSON.stringify({
      dependencies: Object.fromEntries(disableDependencies)
    }, null, 2))
  }
}

const codepushConfig = (os) => {
  const config = { ...util.config(['codePush', 'common']), ...util.config(['codePush', os]) }
  if (!config.token) {
    console.log(`请配置${os}的上传token`)
    process.exit(1)
  }
  if (!config.account) {
    console.log(`请配置${os}的上传账号`)
    process.exit(1)
  }
  config.name = config.name || (util.projectName() + '-' + os)
  config.version = config.version || '^1.0.0'
  return config
}
