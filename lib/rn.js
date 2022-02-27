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
   * 将打包后的代码集成到codepush可以发布的包
   * @param {string} os android 或者 ios
   */
  buildCodepushFiles(os) {
    if (os === 'android') {
      file.delete('dist/code-push-android');
      [
        'drawable-hdpi',
        'drawable-mdpi',
        'drawable-xhdpi',
        'drawable-xxhdpi',
        'drawable-xxxhdpi'
      ].forEach(item => {
        file.copy(`android/app/src/main/res/${item}`, `dist/code-push-android/${item}`)
      });
      file.copy(`android/app/src/main/assets/index.android.bundle`, `dist/code-push-android/index.android.bundle`)
    } else {
      file.delete('dist/code-push-ios');
      [
        'assets',
        'main.jsbundle'
      ].forEach(item => {
        file.copy(`ios/${item}`, `dist/code-push-ios/${item}`)
      })
    }
  },
  /**
   * codepush热更新
   * @param {string} os android 或者 ios
   * @param {string} dir 代码所在目录
   * @param {string} deployment 上传分支
   */
  codepush(os = 'android', dir, deployment = 'Production') {
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
    util.asyncExec(`appcenter codepush release -c ${dir} -a ${config.account}/${config.name} -t ${config.version} -d ${deployment} --token ${config.token}`)
    console.log(`code push ${os}版 ${deployment}分支 发布成功 `)
  }
}
