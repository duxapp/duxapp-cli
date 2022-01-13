/* eslint-disable import/no-commonjs */
const fs = require('fs')
const nodepath = require('path')

module.exports = {
  move(dir1, dir2) {
    return new Promise((resolve, reject) => {
      if (fs.existsSync(pathJoin(dir1))) {
        mkdirSync(dir2, true)
        fs.rename(pathJoin(dir1), pathJoin(dir2), function (err) {
          if (err) {
            reject(err)
            throw err
          }
          fs.stat(pathJoin(dir2), function (err, stats) {
            if (err) {
              reject(err)
              throw err
            }
            resolve()
            // console.log('stats: ' + JSON.stringify(stats))
          })
        })
      } else {
        const msg = pathJoin(dir1) + '文件不存在'
        reject(msg)
        console.log(msg)
      }
    })

  },
  copy(dir1, dir2) {
    if (fs.existsSync(pathJoin(dir1))) {
      mkdirSync(dir2, true)
      fs.createReadStream(pathJoin(dir1)).pipe(fs.createWriteStream(pathJoin(dir2)))
    } else {
      console.log(pathJoin(dir1) + '文件不存在')
    }
  },
  delete(dir) {
    const func = path => {
      if (fs.existsSync(path)) {
        if (fs.statSync(path).isDirectory()) {
          const files = fs.readdirSync(path)
          files.forEach(file => {
            let currentPath = path + "/" + file
            if (fs.statSync(currentPath).isDirectory()) {
              func(currentPath)
            } else {
              fs.unlinkSync(currentPath)
            }
          })
          fs.rmdirSync(path)
        } else {
          fs.unlinkSync(path)
        }
      }
    }
    func(pathJoin(dir))
  },
  readFile(file) {
    return fs.readFileSync(pathJoin(file), { encoding: 'utf8' })
  },
  writeFile(file, content) {
    fs.writeFileSync(file, content, { encoding: 'utf8' })
  },
  editFile(file, callback) {
    const path = pathJoin(file)
    const data = fs.readFileSync(path, { encoding: 'utf8' })
    fs.writeFileSync(path, callback(data), { encoding: 'utf8' })
  },
  pathJoin
}



function pathJoin(name) {
  return nodepath.join(global.projectDir, name)
}

function fsExistsSync(path) {
  try {
    fs.accessSync(path, fs.F_OK)
  } catch (e) {
    return false
  }
  return true
}

function mkdirSync(dist, file) {
  if (file) {
    dist = dist.split('/')
    dist = dist.slice(0, dist.length - 1).join('/')
  }
  const dir = pathJoin(dist)
  if (!fsExistsSync(dir)) {
    fs.mkdirSync(dir)
  }
}
