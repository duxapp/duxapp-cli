#!/usr/bin/env node
/* eslint-disable no-shadow */
/* eslint-disable import/no-commonjs */

const fs = require('fs')
const path = require('path')
const jsdoc = require('jsdoc-api')

const util = require('./lib/util')
const file = require('./lib/file')

const args = util.getArgv()

// 处理帮助信息
if (args.params.help) {
  help(args.route)
} else {
  route()
}

async function help(route) {
  const libDir = path.join(__dirname, 'lib')
  if (!route.length) {
    const res = await Promise.all(file.fileList(libDir, '.js').map(name => {
      return getDocs(name, file.readFile(name))
    }))
    console.log('可用命令')
    showCommand(res.filter(v => v))
  } else {
    const filePath = path.join(libDir, route[0] + '.js')
    const res = await getDocs(filePath, file.readFile(filePath))
    if (!res) {
      return console.log(`${route[0]} 命令不存在`)
    }
    if (route.length === 1) {
      console.log('可用命令')
      showCommand(res.list)
    } else {
      const fnInfo = res.list.find(v_1 => v_1.name === route[1])
      if (!fnInfo) {
        return console.log(`${route.join(' ')} 命令不存在`)
      }
      console.log(`${fnInfo.desc}`)
      showCommand(fnInfo.params)
    }
  }
}

function showCommand(list) {
  const max = Math.max(7, Math.max(...list.map(v => v.name.length))) + 2
  console.log(list.map(item => `${'  ' + item.name.padEnd(max, '                           ')}  ${item.desc}`).join('\n'))
  console.log(`
公共参数
  --app 模块      指定入口模块 大部分命令都需要指定这个参数
  --config 配置   指定配置 很多命令都可以指定这个参数(非必选) 少数命令必须指定这个参数
  -h --help      获取帮助

CLI文档
  https://duxapp.com/docs/course/started/cli`)

}

async function getDocs(filePath, source) {
  const names = filePath.split(path.sep)
  const name = names[names.length - 1].split('.')[0]
  const docs = (await jsdoc.explain({ source })).filter(v =>
    v.comment && v.comment.startsWith('/**')
    && v.longname
    && v.description
  )
  const start = docs.find(v =>
    v.longname === 'module.exports'
    && v.tags.some(t => t.title === 'app')
  )

  if (!start) {
    return
  }
  return {
    name,
    desc: start.description,
    list: docs.filter(v => v.kind === 'function' || v.longname?.startsWith('module.exports.')).map(v => {
      return {
        name: v.name,
        desc: v.description,
        params: v.params?.map(p => ({ name: p.name, desc: p.description })) || []
      }
    })
  }
}

async function route() {
  const category = args.route[0]
  const libPath = path.join(__dirname, 'lib', category + '.js')
  if (!fs.existsSync(libPath)) {
    console.log(`${category} 命令不存在，根据下面的帮助执行命令 \n`)
    await help([])
    process.exit(1)
  }
  const lib = require(libPath)
  let func = args.route[1]
  if (!lib[func] && lib._index) {
    func = '_index'
  }
  if (!lib[func]) {
    console.log(`${category}${func ? ' ' + func : ''} 命令不存在，根据下面的帮助执行命令 \n`)
    await help([category])
    process.exit(1)
  }
  try {
    const res = lib[func](...args.route.slice(func === '_index' ? 1 : 2))
    if (res instanceof Promise) {
      res.catch(error => {
        console.log('duxapp-cli 命令执行失败：', error)
        process.exit(1)
      })
    }
  } catch (error) {
    console.log('duxapp-cli 命令执行失败：', error)
    process.exit(1)
  }
}
