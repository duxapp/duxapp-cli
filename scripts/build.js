import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import fsExtra from 'fs-extra'
import { build } from 'esbuild'

// 获取当前模块的目录路径
const rootPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const cjsDir = path.join(rootPath, 'cjs')

async function renameFiles(dir, fromExt = '.js', toExt = '.cjs') {
  try {
    const files = await fs.readdir(dir, { withFileTypes: true })

    await Promise.all(files.map(async (dirent) => {
      const fullPath = path.join(dir, dirent.name)

      if (dirent.isDirectory()) {
        return renameFiles(fullPath, fromExt, toExt)
      } else if (dirent.isFile() && dirent.name.endsWith(fromExt)) {
        const newPath = fullPath.replace(new RegExp(`${fromExt}$`), toExt)
        await fs.rename(fullPath, newPath)
      }
    }))
  } catch (err) {
    if (err.code !== 'ENOENT') { // 忽略目录不存在的错误
      console.error(`Error processing directory ${dir}:`, err)
    }
  }
}

// 替换 import 路径中的 .js 为 .cjs
async function replaceImportExt(dir, fromExt = '.js', toExt = '.cjs') {
  const files = await fs.readdir(dir, { withFileTypes: true })
  await Promise.all(files.map(async (dirent) => {
    const fullPath = path.join(dir, dirent.name)
    if (dirent.isDirectory()) {
      return replaceImportExt(fullPath, fromExt, toExt)
    } else if (dirent.isFile() && dirent.name.endsWith(toExt)) {
      let content = await fs.readFile(fullPath, 'utf8')
      // 替换 require('./xxx.js')
      content = content.replace(
        new RegExp(`(require\\(['"][^'"]+)${fromExt}(['"]\\))`, 'g'),
        `$1${toExt}$2`
      )
      await fs.writeFile(fullPath, content, 'utf8')
    }
  }))
}

async function main() {
  try {
    // 清理旧构建目录
    await fsExtra.remove(cjsDir)

    // 使用 esbuild 编译
    await build({
      entryPoints: ['src/**/*.js'],
      outdir: 'cjs',
      format: 'cjs',
      platform: 'node',
      target: 'node20',
      loader: { '.js': 'js' },
      logLevel: 'warning',
      charset: 'utf8'
    })

    // 转换文件扩展名
    await renameFiles(cjsDir)
    // 替换 import 路径
    await replaceImportExt(cjsDir)
    console.log('Build completed successfully!')
  } catch (err) {
    console.error('Build failed:', err)
    process.exit(1)
  }
}

main()