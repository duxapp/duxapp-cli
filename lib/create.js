/* eslint-disable import/no-commonjs */
const fs = require('fs')
const file = require('./file')
const { pathJoin } = require('./file')
const inquirer = require('inquirer')
const util = require('./util')

module.exports = {

  async _index(name) {
    if (!/^[a-z][a-zA-Z_-\d]{1,}$/.test(name)) {
      console.log('名称不合法，小写字母开头，字母、数字或-或_组成')
      process.exit()
    }
    if (fs.existsSync(pathJoin(name))) {
      console.log('目录下已存在相同名称文件夹 请重试')
      process.exit()
    }

    const tempDir = 'duxapp_templates_temp_' + Date.now()

    await util.asyncExec(`git clone https://gitee.com/shaogongbra/duxapp-project-templates.git ${tempDir}`)

    // 列出模板列表
    const list = file.dirList(tempDir).filter(v => !v.startsWith('.'))

    const configs = Object.fromEntries(list.map(item => {
      const installFile = pathJoin(tempDir, item, 'install.json')
      if (fs.existsSync(installFile)) {
        return [item, JSON.parse(file.readFile(installFile))]
      } else {
        return [item, {}]
      }
    }))

    let template = 'default'
    if (list.length > 1) {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'template',
          message: '请选择模板',
          default: 'default',
          choices: list.map(item => ({
            name: configs[item]?.name || item,
            value: item
          }))
        }
      ])
      template = answers.template
    }
    const config = configs[template]

    file.dirAndFileList(`${tempDir}/${template}`).forEach(filename => {
      file.copy(`${tempDir}/${template}/${filename}`, `${name}/${filename}`)
    })
    file.delete(tempDir)
    await util.asyncSpawn('yarn', { cwd: `./${name}` })
    console.log(`创建成功！进入项目目录继续开发: 
cd ${name}

${config?.result}
`)
  }
}