#!/usr/bin/env node
import { existsSync } from 'fs'
import { join, sep } from 'path'
import { register } from 'node:module'
import { pathToFileURL } from 'url'
import jsdoc from 'jsdoc-api'

import * as util from './lib/util.js'
import * as file from './lib/file.js'

const run = async () => {

  if (import.meta.url) {
    const loaderPath = new URL('../scripts/loader.js', import.meta.url)
    const baseURL = pathToFileURL('./')

    register(loaderPath.href, baseURL)
  }

  const args = await util.getArgv()

  // 处理帮助信息
  if (args.params.help) {
    help(args.route)
  } else {
    route(args.route)
  }
}
run()

async function help(route) {
  const libDir = join(file.getDirname(import.meta.url || __dirname), 'lib')
  if (!route.length) {
    const res = await Promise.all(file.fileList(libDir, '.js').map(name => {
      return getDocs(name, file.readFile(name))
    }))
    console.log('可用命令')
    showCommand(res.filter(v => v))
  } else {
    const filePath = join(libDir, route[0] + '.js')
    const res = await getDocs(filePath, file.readFile(filePath))
    if (!res) {
      return console.log(`${route[0]} 命令不存在`)
    }
    if (route.length === 1) {
      console.log('可用命令')
      showCommand(res.list)
    } else {
      const fnInfo = res.list.find(v => v.name === route[1])
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
  const names = filePath.split(sep)
  const name = names[names.length - 1].split('.')[0]
  const docs = (await jsdoc.explain({ source })).filter(v =>
    v.comment && v.comment.startsWith('/**')
    && v.longname
    && v.description
  )
  const start = docs.find(v => v.comment.includes('@app'))

  if (!start) {
    return
  }
  return {
    name,
    desc: start.description,
    list: docs.filter(v => v.kind === 'function' && v.comment.includes('@function')).map(v => {
      return {
        name: v.name,
        desc: v.description,
        params: v.params?.map(p => ({ name: p.name, desc: p.description })) || []
      }
    })
  }
}

async function route(route) {
  const category = route[0]
  const libPath = join(file.getDirname(import.meta.url || __dirname), 'lib', category + '.js')
  if (!existsSync(libPath)) {
    console.log(`${category} 命令不存在，根据下面的帮助执行命令 \n`)
    await help([])
    process.exit(1)
  }
  const lib = (await util.importjs(libPath))
  let func = route[1]
  if (!lib[func] && lib._index) {
    func = '_index'
  }
  if (!lib[func]) {
    console.log(`${category}${func ? ' ' + func : ''} 命令不存在，根据下面的帮助执行命令 \n`)
    await help([category])
    process.exit(1)
  }
  try {
    const res = lib[func](...route.slice(func === '_index' ? 1 : 2))
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
