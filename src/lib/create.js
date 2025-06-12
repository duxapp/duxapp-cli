import fs from 'fs'
import inquirer from 'inquirer'

import * as file from './file.js'
import * as runtime from './runtime.js'
import * as util from './util.js'

/**
 * 用于创建新项目
 * @app
 */
const app = 'create'

/**
 * 创建一个新项目
 * @function
 * @param name 项目名称
 * @param app [可选]指定创建模板
 */
export const _index = async (name, app) => {
  if (!name) {
    console.log('请通过命令参数输入项目名称')
    process.exit(1)
  }
  if (!/^[a-z][a-zA-Z_-\d]{1,}$/.test(name)) {
    console.log('名称不合法，小写字母开头，字母、数字或-或_组成')
    process.exit(1)
  }
  if (fs.existsSync(file.pathJoin(name))) {
    console.log('目录下已存在相同名称文件夹 请重试')
    process.exit(1)
  }
  if (util.disableApp.includes(name)) {
    console.log('禁用的模块名称，请使用其他名称')
    process.exit(1)
  }

  const tempDir = 'duxapp_templates_temp_' + Date.now()

  await util.asyncSpawn(`git clone --depth=1 https://gitee.com/shaogongbra/duxapp-project-templates.git ${tempDir}`)

  const installName = 'install.json'

  // 列出模板列表
  const list = file.dirList(tempDir).filter(item => {
    return fs.existsSync(file.pathJoin(tempDir, item, installName))
  })

  const configs = Object.fromEntries(list.map(item => {
    const installFile = file.pathJoin(tempDir, item, installName)
    return [item, JSON.parse(file.readFile(installFile))]
  }).filter(v => v))

  let template = 'default'
  if (app && list.includes(app)) {
    template = app
  } else if (list.length > 1) {
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

  // 复制模板文件
  file.dirAndFileList(`${tempDir}/${template}`).forEach(filename => {
    if (filename !== installName) {
      file.copy(`${tempDir}/${template}/${filename}`, `${name}/${filename}`)
    }
  })
  // 复制模块
  config.apps.forEach(app => {
    file.copy(`${tempDir}/apps/${app}`, `${name}/src/${app}`)
  })
  file.remove(tempDir)
  // 复制公共文件
  const projectTemplate = file.pathJoin(`${name}/src/duxapp/projectTemplate`)
  file.dirAndFileList(projectTemplate).forEach(filename => {
    file.copy(`${projectTemplate}/${filename}`, `${name}/${filename}`)
  })
  // 创建package文件
  runtime.enterFile.setProjectName(name)
  runtime.enterFile.createNpmPackage(config.apps)
  // 安装依赖
  await util.asyncSpawn('yarn', { cwd: `./${name}` })
  // 用户提示
  console.log(`duxapp项目创建成功，进入${name}目录进行下一步操作！

${config?.result?.join('\n')}
`)
}

