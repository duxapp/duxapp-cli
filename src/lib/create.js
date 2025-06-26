import fs from 'fs'
import inquirer from 'inquirer'

import * as file from './file.js'
import * as runtime from './runtime.js'
import * as util from './util.js'
import * as addModule from './app.js'

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
    console.log(`当前目录下 ${name} 文件夹已存在 请修改后重试`)
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

  // 通过入口模块查找复制模块
  const modules = Object.fromEntries(file.dirList(`${tempDir}/apps`).map(name => {
    return [name, file.readJson(`${tempDir}/apps/${name}/app.json`).dependencies || []]
  }))
  const apps = util.flattenDependencies(modules, config.app)
  apps.forEach(app => {
    file.copy(`${tempDir}/apps/${app}`, `${name}/src/${app}`)
  })

  file.remove(tempDir)
  // 切换到项目目录
  process.chdir(file.pathJoin(name))
  // 复制公共文件
  const projectTemplate = 'src/duxapp/projectTemplate'
  file.dirAndFileList(projectTemplate).forEach(filename => {
    file.copy(`${projectTemplate}/${filename}`, filename)
  })
  // 创建package文件
  runtime.enterFile.createNpmPackage(apps)
  const { createApp } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'createApp',
      message: `是否为立即创建一个用于开发项目的模块？`
    }
  ])
  if (createApp) {
    console.log()
    const info = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: '输入模块名称',
        validate(val) {
          if (!val) {
            return '请输入模块名称'
          }
          if (!/^[\da-zA-Z_-]{1,}$/.test(val)) {
            return '模块名称格式错误可以使用 字母 数字 _ -'
          }
          if (util.disableApp.includes(val)) {
            return '被禁用的模块名称，请重新输入'
          }
          if (fs.existsSync(file.pathJoin(`src/${val}`))) {
            return '要创建的模块已经存在，请重新输入'
          }
          return true
        }
      },
      {
        type: 'input',
        name: 'desc',
        message: '输入模块简介',
        validate(val) {
          if (!val) {
            return '请输入模块简介'
          }
          if (/\s/.test(val)) {
            return '简介中请勿包含空格'
          }
          return true
        }
      }
    ])

    await addModule.create(info.name, info.desc)
  }
  // 安装依赖
  console.log()
  const { yarn } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'yarn',
      message: `是否立即使用 yarn 包管理器安装项目依赖？`
    }
  ])
  if (yarn) {
    await util.asyncSpawn('yarn')
  } else {
    console.log('取消安装依赖，请稍后手动安装依赖')
  }
  // 用户提示
  console.log()
  console.log(`duxapp项目创建成功，进入${name}目录进行下一步操作！

${config?.result?.join('\n')}
`)
}

