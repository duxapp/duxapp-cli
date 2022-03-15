/* eslint-disable import/no-commonjs */
const fs = require('fs')
const path = require('path')
const inquirer = require('inquirer')
const file = require('./file')
const util = require('./util')
const net = require('./net')
const rn = require('./rn')
const android = require('./android')
const ios = require('./ios')
const coding = require('./coding')
const project = require('./project')

module.exports = {

  async init() {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: '项目英文名称(小写字母)',
        validate(name) {
          if (!name) {
            return '请输入项目名称'
          }
          if (!/^[a-z]{1,}$/.test(name)) {
            return '项目名称需要全部是小写字母'
          }
          if (fs.existsSync(file.pathJoin(name))) {
            return '已经存在相同名称项目'
          }
          return true
        }
      },
      {
        type: 'input',
        name: 'displayName',
        message: '显示名称',
        filter(val, param) {
          if (!val) {
            return param.name
          }
          return val
        }
      },
      {
        type: 'input',
        name: 'description',
        message: '项目简介',
        filter(val, param) {
          if (!val) {
            return param.displayName
          }
          return val
        }
      }
    ])

    global.projectDir = path.join(global.projectDir, answers.name)
    console.log('[1/3]下载模板...')
    await util.asyncExec(`git clone https://e.coding.net/shaogongbra/duxapp/duxapp.git ${answers.name}`)


    const init = require(file.pathJoin('duxapp.init.js'))
    if (init) {
      await init(answers, {
        fs,
        path,
        inquirer,
        file,
        util,
        rn,
        android,
        ios,
        coding,
        project,
        net
      })
    }
  }
}
