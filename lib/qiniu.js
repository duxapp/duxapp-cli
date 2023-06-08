/* eslint-disable import/no-commonjs */
const qiniu = require('qiniu')
const file = require('./file')
const util = require('./util')

const fileToKey = filePath => {
  if (!filePath) {
    return ''
  }
  const paths = filePath.split('/')
  const fileNames = paths[paths.length - 1].split('.')
  fileNames.splice(fileNames.length - 1, 0, new Date().getTime())
  return fileNames.join('.')
}

const coding = {
  /**
   * 上传一个文件
   * @param {string} filePath 本地文件路径
   * @param {string} key 上传文件名
   */
  async upload(filePath, key = fileToKey(filePath)) {
    const accessKey = util.config(['qiniu', 'accessKey'])
    const secretKey = util.config(['qiniu', 'secretKey'])
    const bucket = util.config(['qiniu', 'bucket'])
    const cdn = util.config(['qiniu', 'cdn'])

    const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
    const putPolicy = new qiniu.rs.PutPolicy({
      scope: bucket
    })
    const uploadToken = putPolicy.uploadToken(mac)

    const config = new qiniu.conf.Config()

    const formUploader = new qiniu.form_up.FormUploader(config)
    const putExtra = new qiniu.form_up.PutExtra()
    // 文件上传
    return new Promise((resolve, reject) => {
      if (!filePath) {
        reject('文件不存在')
        return
      }
      formUploader.putFile(
        uploadToken, key, file.pathJoin(filePath), putExtra,
        (respErr, respBody, respInfo) => {
          if (respErr) {
            throw respErr
          }
          if (respInfo.statusCode == 200) {
            resolve(`${cdn}/${respBody.key}`)
          } else {
            console.log(respInfo.statusCode)
            console.log(respBody)
            reject(respBody)
          }
        })
    })

  },

}

module.exports = coding
