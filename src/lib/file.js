import fs from 'fs'
import path from 'path'
import fsExtra from 'fs-extra'
import { fileURLToPath } from 'url'

/**
 * 文件快捷操作，通常在cli内部使用
 * @app
 */
const app = 'file'
/**
 * 移动文件或文件夹
 * @function
 * @param dir1 要移动的文件或文件夹
 * @param dir2 目标路径
 */
export const move = (dir1, dir2) => {
  return new Promise((resolve, reject) => {
    const _move = (dir1, dir2) => {
      if (fs.existsSync(dir1)) {
        mkdirSync(dir2, true)
        fs.rename(dir1, dir2, function (err) {
          if (err) {
            reject(err)
            throw err
          }
          fs.stat(dir2, function (err, stats) {
            if (err) {
              reject(err)
              throw err
            }
            resolve()
            // console.log('stats: ' + JSON.stringify(stats))
          })
        })
      } else {
        const msg = dir1 + '文件不存在'
        reject(msg)
        console.log(msg)
      }
    }
    _move(pathJoin(dir1), pathJoin(dir2))
  })
}
/**
 * 复制文件或文件夹
 * @function
 * @param dir1 要复制的文件或文件夹
 * @param dir2 目标路径
 */
export const copy = (dir1, dir2) => {
  const _copy = (dir1, dir2) => {
    if (fs.existsSync(dir1)) {
      if (fs.statSync(dir1).isDirectory()) {
        mkdirSync(dir2, false)
        fs.readdirSync(dir1).forEach(item => {
          _copy(path.join(dir1, item), path.join(dir2, item))
        })
      } else {
        mkdirSync(dir2, true)
        fs.writeFileSync(dir2, fs.readFileSync(dir1))
      }
    } else {
      console.log(dir1 + ' 不存在')
    }
  }
  _copy(pathJoin(dir1), pathJoin(dir2))
}
/**
 * 删除文件或文件夹
 * @function
 * @param dir 要删除的文件或文件夹
 */
export const remove = dir => {
  fsExtra.removeSync(pathJoin(dir))
}
export const readFile = (file) => {
  file = pathJoin(file)
  if (!fs.existsSync(file)) {
    return ''
  }
  return fs.readFileSync(pathJoin(file), { encoding: 'utf8' })
}
export const writeFile = (file, content) => {
  mkdirSync(file, true)
  fs.writeFileSync(pathJoin(file), content, { encoding: 'utf8' })
}

export const editFile = (file, callback) => {
  const filedir = pathJoin(file)
  if (!fs.existsSync(filedir)) {
    fs.writeFileSync(filedir, '', { encoding: 'utf8' })
  }
  const data = fs.readFileSync(filedir, { encoding: 'utf8' })
  fs.writeFileSync(filedir, callback(data), { encoding: 'utf8' })
}
export const dirAndFileList = (...dirs) => {
  return fs.readdirSync(pathJoin(...dirs))
}
export const fileList = (dir, ext, callback) => {
  return getFileList(pathJoin(dir), ext, callback)
}
export const dirList = (...dirs) => {
  return fs.readdirSync(pathJoin(...dirs))
    .filter(file => {
      const stat = fs.lstatSync(pathJoin(...dirs, file))
      return stat.isDirectory()
    })
}
export const existsSync = (...arg) => {
  return fs.existsSync(pathJoin(...arg))
}

export const getDirname = metaUrl => {
  if (metaUrl.startsWith('file://')) {
    return path.dirname(fileURLToPath(metaUrl))
  } else {
    return metaUrl
  }
}

export const pathJoin = (...arg) => {
  const [start, dir] = getDirname(import.meta.url || __dirname).split(path.sep)
  const dirnameStart = [start, dir].join(path.sep)
  const projectDir = process.cwd()
  const res = path.join(...arg)
  if (res.startsWith(projectDir) || res.startsWith(dirnameStart)) {
    return res
  }
  return path.join(projectDir, res)
}

const getFileList = (dir, ext, callback) => {
  if (typeof ext === 'string') {
    ext = ext.split(',')
  }
  const list = []
  fs.readdirSync(dir).forEach(item => {
    const _item = path.join(dir, item)
    if (fs.statSync(_item).isDirectory()) {
      list.push(...getFileList(_item, ext, callback))
    } else if (ext.includes(path.extname(item))) {
      callback && callback(_item)
      list.push(_item)
    }
  })
  return list
}

const fsExistsSync = dir => {
  try {
    fs.accessSync(dir, fs.F_OK)
  } catch (e) {
    return false
  }
  return true
}

export const mkdirSync = (dist, file = false) => {
  if (file) {
    dist = path.dirname(dist)
  }
  const dir = pathJoin(dist)
  if (!fsExistsSync(dir)) {
    mkdirsSync(dir)
  }
}

const mkdirsSync = dirname => {
  if (fs.existsSync(dirname)) {
    return true
  } else {
    if (mkdirsSync(path.dirname(dirname))) {
      fs.mkdirSync(dirname)
      return true
    }
  }
}
