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
const { pathJoin } = require('./file')

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

    // 保留base模块和基础文件
    const noDel = ['base', 'duxapp.js', 'app.config.js', 'app.js', 'app.scss', 'index.html']
    file.dirAndFileList('src')
      .forEach(name => {
        if (!noDel.includes(name)) {
          file.delete(`src/${name}`)
        }
      })
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
  },

  /**
   * 添加app
   * @param  {...any} apps
   */
  async add(...apps) {
    await getGit()
    // 复制模块
    getApps(...apps).forEach(app => {
      file.copy(`${duxappDir.join('/')}/src/${app}`, `src/${app}`)
    })
    // 复制公共文件
    const copyList = [
      'plugins', 'patches', 'config', 'config', '.gitignore',
      '.node-version', '.eslintrc', 'babel.config.js', 'jsconfig.json', 'global.d.ts',
      'react-native.config.js', 'yarn.lock'
    ]
    copyList.forEach(name => {
      file.copy(`${duxappDir.join('/')}/${name}`, name)
    })

    // 复制package文件
    const packages = [require(pathJoin(`${duxappDir.join('/')}/package.json`)), require(pathJoin('package.json'))]
    packages[0].name = packages[1].name
    packages[0].version = packages[1].version
    packages[0].description = packages[1].description
    file.editFile('package.json', () => JSON.stringify(packages[0], null, 2))
    console.log('安装/更新完成 如果package.json更新了依赖 请执行yarn安装依赖')
  },

  /**
   * 创建app
   * @param name 名称
   * @param desc 简介
   */
  async create(name, desc) {
    await getGit()
    if (!name || !desc) {
      console.log('请输入名称和简介')
    } else if (fs.existsSync(file.pathJoin(...duxappDir, 'src', name)) || fs.existsSync(file.pathJoin('src', name))) {
      // 验证名称是否可用
      console.log('创建失败 此名称不可用')
    } else {
      // 使用模板创建app
      file.copy('node_modules/duxapp-cli/appTemplate', `src/${name}`)
      const edit = dir => {
        file.dirAndFileList(dir).forEach(fileName => {
          const fileDir = `${dir}/${fileName}`
          if (fs.lstatSync(file.pathJoin(fileDir)).isDirectory()) {
            edit(fileDir)
          } else {
            // 修改文件内容
            file.editFile(fileDir, content => {
              return content
                .replaceAll('{{name}}', name)
                .replaceAll('{{desc}}', desc)
            })
          }
        })
      }
      setTimeout(() => {
        edit(`src/${name}`)
      }, 200)
    }
  }
}

const duxappDir = ['node_modules', 'duxapp-cli', 'duxapp']

const getApps = (...customApps) => {
  const srcDir = [...duxappDir, 'src'].join('/')
  // 获取app列表
  let apps = file.dirList(srcDir)
  if (customApps.length) {
    // 筛选命令行中指定的app
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
  return apps
}

const getAppConfig = apps => {
  return Object.fromEntries(apps.map(name => [
    name,
    require(file.pathJoin(...duxappDir, 'src', name, 'app.json'))
  ]))
}

const getGit = async () => {
  if (fs.existsSync(file.pathJoin(...duxappDir))) {
    await util.asyncExec(`cd ./${duxappDir.join('/')} && git pull`)
  } else {
    await util.asyncExec(`git clone https://e.coding.net/shaogongbra/duxapp/duxapp.git ${file.pathJoin(...duxappDir)}`)
  }
}
