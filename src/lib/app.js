import fs from 'fs'
import crypto from 'crypto'
import archiver from 'archiver'
import StreamZip from 'node-stream-zip'
import inquirer from 'inquirer'
import path from 'path'

import * as file from './file.js'
import * as user from './user.js'
import * as net from './net.js'
import * as util from './util.js'
import { appsInfoPath } from './util.js'

/**
 * 模块相关操作 添加、更新、创建、发布等模块命令
 * @app
 */
const app = 'app'

/**
 * 将应用市场的模块添加到你的项目中，如果模块已经存在，则会覆盖存在的模块，添加模块会将这个模块所依赖的模块也进行添加
 * @function
 * @param apps 传入一个或者多个模块名称(多个用空格分开)
 */
export const add = async (...apps) => {
  if (!apps.length) {
    console.log('请输入要安装的模块')
  }
  // 1 add 2 update
  let addType = 1
  if (typeof apps[0] === 'number') {
    [addType] = apps.splice(0, 1)
  }
  try {
    const res = await user.request(
      `package/version/query?type=duxapp&download=1${addType === 2 ? '&filter=1' : ''}`,
      'POST',
      Object.fromEntries(apps.map(app => [app, '']))
    )
    // 验证模块是否被修改，提醒用户是否覆盖
    if (file.existsSync(appsInfoPath)) {
      const appsInfo = Object.keys(file.readJson(appsInfoPath).modules || {})
      const apps = res.map(v => v.app).filter(app => appsInfo.includes(app))
      const results = checkIntegrity(2, ...apps)
      if (results.modified.length) {
        console.log(`模块: ${results.modified.map(v => v.app).join(' ')} 的文件被修改，通过上面的日志获取详情\n`)
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `检测到要更新的模块已经被修改，是否覆盖安装？`
          }
        ])
        if (!confirm) {
          console.log('取消安装')
          process.exit()
        }
      }
    }
    // 删除关联模块 重新下载
    await Promise.all(res.map(item => {
      return net.download(item.url, `dist/${item.app}.zip`)
    }))

    await Promise.all(res.map(({ app }) => {
      return new Promise((resolve, reject) => {
        file.remove('src/' + app)
        const filename = `dist/${app}.zip`
        file.mkdirSync(filename, true)
        const zip = new StreamZip({
          file: file.pathJoin(filename),
          storeEntries: true
        })
        zip.on('ready', () => {
          const appPath = file.pathJoin('src', app)
          file.mkdirSync(appPath)
          zip.extract('', appPath, err => {
            file.remove(filename)
            zip.close()
            if (err) {
              reject(err)
            } else {
              try {
                let version = 'unknown'
                const appJsonPath = file.pathJoin(appPath, 'app.json')
                if (fs.existsSync(appJsonPath)) {
                  const appJson = file.readJson(appJsonPath)

                  // 模块在另外一个模块安装的情况下才安装
                  if (
                    appJson.installRequire
                    && !res.some(v => v.app === appJson.installRequire)
                    && !util.getAllApps().includes(appJson.installRequire)
                  ) {
                    // 不安装模块
                    file.editJson(appsInfoPath, registry => {
                      registry.installRequire ||= {}
                      registry.installRequire[appJson.name] = appJson.installRequire
                      return registry
                    })
                    file.remove(appPath)

                    resolve()
                    return
                  }

                  version = appJson.version || 'unknown'
                }
                const checksums = calculateModuleChecksums(appPath)
                updateModuleRegistry(app, version, checksums)
                resolve()
              } catch (error) {
                console.error(`Warning: Failed to calculate checksums for ${app}:`, error.message)
                resolve()
              }
            }
          })
        })
        zip.on('error', err => {
          zip.close()
          reject(err)
        })
      })
    }))

    console.log(`\n模块: ${res.map(v => v.name)
      .filter(app => file.existsSync('src', app))
      .join(' ')
      } 已${addType === 2 ? '更新' : '经安装或更新'}`)

    const duxapp = file.readJson('src/duxapp/package.json')
    const project = file.readJson('package.json')
    if (duxapp.devDependencies['duxapp-cli'] !== project.devDependencies['duxapp-cli']) {
      project.devDependencies['duxapp-cli'] = duxapp.devDependencies['duxapp-cli']
      file.editJson('package.json', () => project)
      console.log('CLI 工具已更新，即将为你安装新版本')
      await util.asyncSpawn('yarn')
    }
  } catch (error) {
    console.log('安装失败: ', error.message || error)
  }
}

/**
 * 更新模块依赖，任意模块都可以，会检查当前模块所依赖的模块是否在应用商店发布
 * 如果不传入任何参数，会更新所有可更新的模块
 * @function
 * @param apps 传入一个或者多个模块名称(多个用空格分开)
 */
export const update = async (...apps) => {
  if (!apps.length) {
    apps = util.getAllApps()
  } else {
    apps = await util.getApps(apps)
  }
  add(2, ...apps)
}

/**
 * 将模块上传到应用市场
 * @function
 * @param name 模块名称
 * @param dependent [可选]是否将依赖的模块上传
 */
export const publish = async (name, dependent) => {
  const push = apps => {
    const app = apps.pop()
    if (!app) {
      console.log('全部完成！')
    } else {
      const outputFile = file.pathJoin('dist', app + '.zip')
      const output = fs.createWriteStream(outputFile)
      const archive = archiver('zip', {
        zlib: { level: 9 }
      })
      archive.pipe(output)
      archive.directory(file.pathJoin('src', app + '/'), false, data => {
        if (
          data.name.endsWith('.git') ||
          data.name.endsWith('config/userConfig.js') ||
          data.name.endsWith('userTheme/index.js') ||
          data.name.endsWith('userTheme/index.rn.js') ||
          data.name.endsWith('userTheme/index.scss') ||
          data.name.endsWith('.DS_Store')
        ) {
          return false
        }
        return data
      })
      archive.finalize()

      output.on('finish', async () => {
        const buffer = fs.readFileSync(outputFile)
        const hash = crypto.createHash('md5')
        hash.update(buffer, 'utf8')
        const md5 = hash.digest('hex')
        try {
          await user.request('package/version/push', 'POST', outputFile, {
            formData: {
              md5,
              name: app,
              type: 'duxapp',
              app,
            }
          })
          console.log(app + ' 发布成功')
        } catch (error) {
          // 版本号较低时自动更新版本号
          if (error.message.startsWith('This version has been released')) {

            const appJson = JSON.parse(file.readFile(file.pathJoin('src', app, 'app.json')))

            const versions = error.message.split(':')[1].split('.')
            versions[2] = +versions[2] + 1
            const newVersion = versions.join('.')

            const { confirm } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'confirm',
                message: `${app}的版本号:${appJson.version}已过时，是否更新版本号为:${newVersion}继续发布？`
              }
            ])
            if (confirm) {
              appJson.version = newVersion
              file.editFile(`src/${app}/app.json`, () => JSON.stringify(appJson, null, 2) + '\n')
              apps.push(app)
            } else {
              console.log(app + ' 未发布:版本号低于线上版本')
            }
          } else {
            console.log(app + ' 未发布:', error?.message || error)
          }
        }
        fs.unlinkSync(outputFile)
        push(apps)
      })
    }
  }
  const apps = dependent ? await util.getApps([name]) : [name]
  const count = await check(...apps)
  if (count.file) {
    throw new Error('请根据提示先处理完所有的问题后再发布模块')
  }
  push(apps)
}

/**
 * 快速创建一个模块
 * @function
 * @param name 模块名称(使用英文字母、数字)
 * @param desc 模块简介
 */
export const create = async (name, desc) => {

  if (!name || !desc) {
    console.log('请输入名称和简介')
  } else if (fs.existsSync(file.pathJoin('src', name)) || util.disableApp.includes(name)) {
    // 验证名称是否可用
    console.log('创建失败 此名称不可用（模块名称已经存在或者是被禁用的）')
  } else {

    const dist = file.pathJoin('dist')

    file.mkdirSync(dist)

    const templateName = 'duxapp-app-templates'

    if (file.existsSync(dist, templateName)) {
      file.remove(`${dist}/${templateName}`)
    }

    await util.asyncSpawn(`git clone --depth=1 https://gitee.com/shaogongbra/${templateName}.git`, {
      cwd: dist
    })

    const appsDir = file.pathJoin(dist, templateName, 'apps')

    const apps = file.dirList(appsDir)

    const createName = 'create.json'

    const configs = Object.fromEntries(apps.map(item => {
      return [item, file.readJson(file.pathJoin(appsDir, item, createName))]
    }).filter(v => v))

    const { template } = await inquirer.prompt([
      {
        type: 'list',
        name: 'template',
        message: '请选择模板',
        default: 'default',
        choices: apps.map(item => ({
          name: configs[item].name,
          value: item
        }))
      }
    ])

    // 使用模板创建app
    file.copy(`${appsDir}/${template}`, `src/${name}`)
    file.remove(`src/${name}/${createName}`)
    // 替换文件内容
    file.fileList(`src/${name}`, '.js,.ts,.jsx,.tsx,.json,.html,.scss,.css,.sass,.md', fileDir => {
      // 修改文件内容
      file.editFile(fileDir, content => {
        return content
          .replaceAll('{{name}}', name)
          .replaceAll('{{desc}}', desc)
      })
    })
    // 验证依赖是否已经安装
    const { dependencies = [] } = file.readJson(`src/${name}/app.json`)
    const installRequire = file.readJson(appsInfoPath).installRequire || {}
    const allApps = util.getAllApps()
    const noInstall = dependencies.filter(app => {
      if (file.existsSync(`src/${app}`)) {
        return false
      }
      if (installRequire[app] && !allApps[installRequire[app]]) {
        return false
      }
      return true
    })
    file.remove(`${dist}/${templateName}`)
    console.log(`模块创建成功: ${name}`)
    if (noInstall.length) {
      console.warn(`当前模板使用的模块依赖 ${noInstall.join(' ')} 未安装 安装命令：yarn duxapp app add ${noInstall.join(' ')}`)
    }
    return noInstall
  }
}

/**
 * 检查模块存在的问题，如是否使用到未依赖模块里面的组件等
 * @function
 * @param apps 传入一个或者多个模块名称(多个用空格分开)
 */
export const check = async (...apps) => {

  if (!apps.length) {
    apps = await util.getApps()
  }

  const regex = /(["'])@\/([^/"']+)[^"']*\1/g

  const count = {
    file: 0,
    line: 0
  }

  await Promise.all(apps.map(async app => {
    const dependencies = await util.getApps([app])
    file.fileList(`src/${app}`, '.jsx,.tsx,.js,.ts', filePath => {
      const content = file.readFile(filePath)
      const matches = content.matchAll(regex)
      const noApps = []
      for (const match of matches) {
        if (!dependencies.includes(match[2])) {
          count.line++
          noApps.push(match[2])
        }
      }
      if (noApps.length) {
        count.file++
        console.log(`文件: ${filePath}
错误: ${noApps.join(' ')} 模块未在模块依赖中定义
`)
      }
    })
  }))

  console.log(count.file ? `${count.file}个文件中，有${count.line}个引用问题` : '全部检查完成，未发现问题')

  return count
}

/**
 * 检查模块完整性，验证应用商店安装的模块文件是否被修改
 * @function
 * @param apps 传入一个或者多个模块名称(多个用空格分开)，不传则检查所有已安装模块
 */
export const checkIntegrity = (...apps) => {
  const registry = readModulesRegistry()

  // 打印日志类型 1完整日志 2仅警告
  let logType = 1
  if (typeof apps[0] === 'number') {
    [logType] = apps.splice(0, 1)
  }

  // If no apps specified, check all registered modules
  if (!apps.length) {
    apps = Object.keys(registry.modules)
  }

  if (apps.length === 0) {
    console.log('没有找到已安装的模块记录')
    return
  }

  const results = {
    unmodified: [],
    modified: [],
    notFound: [],
    notRegistered: []
  }

  for (const app of apps) {
    const modulePath = file.pathJoin('src', app)

    // Check if module exists in registry
    if (!registry.modules[app]) {
      results.notRegistered.push(app)
      continue
    }

    // Check if module directory exists
    if (!fs.existsSync(modulePath)) {
      results.notFound.push(app)
      continue
    }

    // Calculate current checksums
    try {
      const currentChecksums = calculateModuleChecksums(modulePath)
      const registeredChecksum = registry.modules[app].checksum

      if (currentChecksums.checksum === registeredChecksum) {
        results.unmodified.push(app)
      } else {
        // Find which files were modified
        const modifiedFiles = []
        const registeredFiles = registry.modules[app].files || {}

        // Check modified and deleted files
        Object.entries(registeredFiles).forEach(([file, hash]) => {
          if (!currentChecksums.files[file]) {
            modifiedFiles.push(`${file} (删除)`)
          } else if (currentChecksums.files[file] !== hash) {
            modifiedFiles.push(`${file} (修改)`)
          }
        })

        // Check new files
        Object.keys(currentChecksums.files).forEach(file => {
          if (!registeredFiles[file]) {
            modifiedFiles.push(`${file} (新增)`)
          }
        })

        results.modified.push({ app, files: modifiedFiles })
      }
    } catch (error) {
      console.error(`检查 ${app} 时出错:`, error.message)
    }
  }

  // Display results
  if (logType === 1) {
    console.log('\n=== 模块完整性检查结果 ===\n')

    if (results.unmodified.length > 0) {
      console.log('✓ 未修改的模块:')
      results.unmodified.forEach(app => {
        const info = registry.modules[app]
        console.log(`  - ${app} (v${info.version}, 校验值: ${info.checksum.substring(0, 8)}...)`)
      })
      console.log()
    }
  }

  if (results.modified.length > 0) {
    console.log('✗ 已修改的模块:')
    results.modified.forEach(({ app, files }) => {
      const info = registry.modules[app]
      console.log(`  - ${app} (v${info.version})`)
      console.log(`    修改的文件 (${files.length} 个):`)
      files.slice(0, 5).forEach(file => {
        console.log(`      • ${file}`)
      })
      if (files.length > 5) {
        console.log(`      ... 还有 ${files.length - 5} 个文件`)
      }
    })
    console.log()
  }

  if (logType === 1 && results.notFound.length > 0) {
    console.log('⚠ 模块目录不存在:')
    results.notFound.forEach(app => {
      console.log(`  - ${app}`)
    })
    console.log()
  }

  if (results.notRegistered.length > 0) {
    console.log('⚠ 未在注册表中找到:')
    results.notRegistered.forEach(app => {
      console.log(`  - ${app} (可能是手动添加或旧版本安装)`)
    })
    console.log()
  }

  if (logType === 1) {
    // Summary
    const total = apps.length
    console.log(`总计检查 ${total} 个模块: ${results.unmodified.length} 个未修改, ${results.modified.length} 个已修改`)
  }
  return results
}

/**
 * Calculate MD5 checksum for a file
 * @param {string} filePath - Path to the file
 * @returns {string} MD5 hash
 */
const calculateFileChecksum = (filePath) => {
  const hash = crypto.createHash('md5')
  const content = fs.readFileSync(filePath)
  hash.update(content)
  return hash.digest('hex')
}

/**
 * Calculate checksums for all files in a module directory
 * @param {string} modulePath - Path to the module directory
 * @returns {object} Object containing overall checksum and individual file checksums
 */
const calculateModuleChecksums = (modulePath) => {
  const fileChecksums = {}
  const allHashes = []

  // Files to exclude from checksum calculation
  const excludePatterns = [
    /\.git/,
    /\.DS_Store$/,
    /config[\/\\]userConfig\.js$/,
    /userTheme[\/\\]index\.js$/,
    /userTheme[\/\\]index\.rn\.js$/,
    /userTheme[\/\\]index\.scss$/
  ]

  const processDirectory = (dirPath, relativePath = '') => {
    const items = fs.readdirSync(dirPath)

    items.forEach(item => {
      const fullPath = path.join(dirPath, item)
      const relativeFilePath = path.join(relativePath, item)

      // Check if should exclude
      if (excludePatterns.some(pattern => pattern.test(relativeFilePath))) {
        return
      }

      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        processDirectory(fullPath, relativeFilePath)
      } else if (stat.isFile()) {
        const fileHash = calculateFileChecksum(fullPath)
        fileChecksums[relativeFilePath] = fileHash
        allHashes.push(fileHash)
      }
    })
  }

  processDirectory(modulePath)

  // Sort hashes for consistent overall checksum
  allHashes.sort()
  const overallHash = crypto.createHash('md5')
  overallHash.update(allHashes.join(''))

  return {
    checksum: overallHash.digest('hex'),
    files: fileChecksums
  }
}

/**
 * Read appsInfo.json file
 * @returns {object} Modules registry data
 */
const readModulesRegistry = () => {
  if (file.existsSync(appsInfoPath)) {
    return file.readJson(appsInfoPath)
  }
  return { modules: {} }
}

/**
 * Update module registry with checksum information
 * @param {string} moduleName - Name of the module
 * @param {string} version - Module version
 * @param {object} checksums - Checksum data
 */
const updateModuleRegistry = (moduleName, version, checksums) => {
  file.editJson(appsInfoPath, registry => {
    registry.modules ||= {}
    registry.modules[moduleName] = {
      checksum: checksums.checksum,
      version: version || 'unknown',
      installedAt: new Date().toISOString(),
      files: checksums.files
    }
    return registry
  })
}
