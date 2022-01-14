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
发小: ${data.buildFileSize}bit`)
    }
  }
}
