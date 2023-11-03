/* eslint-disable import/no-commonjs */
const fs = require('fs')
const path = require('path')
const file = require('./file')
const { pathJoin } = require('./file')
const util = require('./util')

module.exports = {

  async _index(name) {
    if (!/^[a-z][a-zA-Z_-\d]{1,}$/.test(name)) {
      console.log('名称不合法，小写字母开头，字母、数组或-或_组成')
      process.exit()
    }
    if (fs.existsSync(pathJoin(name))) {
      console.log('目录下已存在相同名称文件夹 请重试')
      process.exit()
    }
    const copyList = [
      'config', 'configs', 'src', '.editorconfig', '.eslintrc', '.gitignore', 'babel.config.js',
      'global.d.ts', 'jsconfig.json', 'package.json', 'project.config.json', 'project.private.config.json',
      'project.tt.json', 'Readme.md', 'yarn.lock'
    ]
    copyList.forEach(fileName => {
      file.copy(path.join(__dirname, '..', 'projectTemplate', fileName), path.join(name, fileName))
    })
    global.projectDir = path.join(global.projectDir, name)
    await util.asyncSpawn('cd ' + name + ' && yarn')
    console.log(`创建成功！
执行: 
cd ${name}
yarn dev:weapp --app=duxapp 
即可调试小程序端`)
  }
}