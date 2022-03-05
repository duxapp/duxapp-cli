/* eslint-disable import/no-commonjs */
const fs = require('fs')
const path = require('path')
const util = require('./util')
const file = require('./file')

const ios = {
  /**
   * 获取ios端app所在的目录
   */
  dir(pathName = '') {
    let name = util.config(['ios', 'dirName'], false) || 'duxapp'
    if (name && fs.existsSync(file.pathJoin('ios', name))) {
      return path.join('ios', name, pathName)
    }
    const iosFiles = fs.readdirSync(file.pathJoin('ios'))
    const xcodeproj = iosFiles.find(item => /[a-zA-z.]{1,}.xcodeproj/.test(item))

    if (xcodeproj && (name = xcodeproj.substr(0, xcodeproj.length - 10))) {
      return path.join('ios', name, pathName)
    }

    console.log('无法找到你的ios项目所在目录，请在duxapp.config.js配置 ios.dirName')
    process.exit(1)
  },
  /**
   * 修改iosBundleID
   * @param {string} id 
   */
  BundleID(id) {
    id = id || `com.duxapp.${util.projectName()}`
    const filePath = path.join(ios.dir() + '.xcodeproj', 'project.pbxproj')
    const pbxproj = file.readFile(filePath)
    const reg = /PRODUCT_BUNDLE_IDENTIFIER = ([a-zA-Z.])*?;/g
    const currentID = pbxproj.match(reg)[1]
    if (currentID === id) {
      return
    }
    file.writeFile(filePath, pbxproj.replace(reg, () => {
      return `PRODUCT_BUNDLE_IDENTIFIER = ${id};`
    }))
  },
  build() {
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
    util.asyncExec(execs.join(''))
  },
  export() {
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
    util.asyncExec(execs.join(''))
  },
  upload(filename) {
    const account = util.config(['ios', 'account'])
    const password = util.config(['ios', 'password'])
    util.asyncExec(`xcrun altool --upload-app -t ios -f "${filename}" -u "${account}" -p "${password}"`)
  }
}

module.exports = ios
