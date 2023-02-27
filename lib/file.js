/* eslint-disable import/no-commonjs */
const fs = require('fs')
const path = require('path')

module.exports = {
  move(dir1, dir2) {
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
  },
  copy(dir1, dir2) {
    const _copy = (dir1, dir2) => {
      if (fs.existsSync(dir1)) {
        if (fs.statSync(dir1).isDirectory()) {
          mkdirSync(dir2, false)
          fs.readdirSync(dir1).forEach(item => {
            _copy(path.join(dir1, item), path.join(dir2, item))
          })
        } else {
          mkdirSync(dir2, true)
          fs.createReadStream(dir1).pipe(fs.createWriteStream(dir2))
        }
      } else {
        console.log(dir1 + ' 不存在')
      }
    }
    _copy(pathJoin(dir1), pathJoin(dir2))
  },
  delete(dir) {
    const _delete = dir => {
      if (fs.existsSync(dir)) {
        if (fs.statSync(dir).isDirectory()) {
          fs.readdirSync(dir).forEach(file => {
            let currentPath = path.join(dir, file)
            if (fs.statSync(currentPath).isDirectory()) {
              _delete(currentPath)
            } else {
              fs.unlinkSync(currentPath)
            }
          })
          fs.rmdirSync(dir)
        } else {
          fs.unlinkSync(dir)
        }
      }
    }
    _delete(pathJoin(dir))
  },
  readFile(file) {
    return fs.readFileSync(pathJoin(file), { encoding: 'utf8' })
  },
  writeFile(file, content) {
    fs.writeFileSync(pathJoin(file), content, { encoding: 'utf8' })
  },
  editFile(file, callback) {
    const filedir = pathJoin(file)
    if (!fs.existsSync(filedir)) {
      fs.writeFileSync(filedir, '', { encoding: 'utf8' })
    }
    const data = fs.readFileSync(filedir, { encoding: 'utf8' })
    fs.writeFileSync(filedir, callback(data), { encoding: 'utf8' })
  },
  pathJoin,
  fileList(dir, ext, callback) {
    return getFileList(pathJoin(dir), ext, callback)
  },
  dirList(...dirs) {
    return fs.readdirSync(pathJoin(...dirs))
      .filter(file => {
        const stat = fs.lstatSync(pathJoin(...dirs, file))
        return stat.isDirectory()
      })
  }
}

function pathJoin(...arg) {
  const res = path.join(...arg)
  if (res.startsWith(global.projectDir)) {
    return res
  }
  return path.join(global.projectDir, res)
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

function fsExistsSync(dir) {
  try {
    fs.accessSync(dir, fs.F_OK)
  } catch (e) {
    return false
  }
  return true
}

function mkdirSync(dist, file) {
  if (file) {
    dist = path.dirname(dist)
  }
  const dir = pathJoin(dist)
  if (!fsExistsSync(dir)) {
    mkdirsSync(dir)
  }
}

function mkdirsSync(dirname) {
  if (fs.existsSync(dirname)) {
    return true
  } else {
    if (mkdirsSync(path.dirname(dirname))) {
      fs.mkdirSync(dirname)
      return true
    }
  }
}
