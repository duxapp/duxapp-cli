/* eslint-disable import/no-commonjs */
const fs = require('fs')
const path = require('path')
const file = require('./file')
const util = require('./util')
const rn = require('./rn')
const android = require('./android')
const coding = require('./coding')


module.exports = {
  /**
   * 初始化一个app
   * @param {string} name 项目名称
   * @param {string} displayName 显示名称 默认等于 name
   * @param {string} description 应用简介 默认等于 displayName
   */
  async init(name, displayName = name, description = displayName) {
    if (!name) {
      console.log('请输入项目名称')
      process.exit(1)
    }
    if (!/^[a-z]{1,}$/.test(name)) {
      console.log('项目名称需要全部是小写字母')
      process.exit(1)
    }
    if (fs.existsSync(file.pathJoin(name))) {
      console.log('已经存在相同名称项目')
      process.exit(1)
    }
    try {
      global.projectDir = path.join(global.projectDir, name)
      console.log('[1/3]下载模板...')
      await util.asyncExec(`git clone https://e.coding.net/shaogongbra/duxapp/duxapp.git ${name}`)
      console.log('[2/3]模板处理中...')
      rn.packageName(name, description)
      rn.appName(displayName)
      await rn.appID()
      await android.keystore()
      const project = await coding.projectByName(name)
      if (project) {
        console.log('coding 已经存在相同名称项目 不会在coding创建项目')
      } else {
        await coding.init(name, displayName, description)
      }
      console.log('[3/3]安装依赖(时间较长，你可以取消进程手动安装)...')
      await util.asyncExec(`cd ${name} && yarn`)
      console.log(`项目初始化成功 请打开 ${name} 目录，开始编码`)
    } catch (error) {
      console.log('初始化错误：', error.message || error)
    }
  }
}