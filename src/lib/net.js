import fs from 'fs'
import requestLib from 'request'

import * as file from './file.js'

export const request = (url, method = 'GET', data, options = {}) => {
  return new Promise((resolve, reject) => {
    const dataType = typeof data === 'object' ? 'object' : typeof data === 'string' && fs.existsSync(file.pathJoin(data)) ? 'file' : 'string'
    const option = {
      url,
      method,
      headers: {
        Accept: 'application/json',
        ...options.headers
      }
    }
    if (dataType === 'file') {
      option.formData = {
        ...options.formData,
        [options.fileName || 'file']: fs.createReadStream(file.pathJoin(data))
      }
      option.headers['Content-Type'] = 'multipart/form-data'
    } else if (dataType === 'object') {
      option.json = true
      option.headers['Content-Type'] = 'application/json'
      option.body = data
    }
    requestLib(option, (err, response, body) => {
      if (!err) {
        try {
          resolve(JSON.parse(body))
        } catch (error) {
          resolve(body)
        }
      } else {
        reject(err)
      }
    })
  })
}
export const download = (url, filename) => {
  return new Promise((resolve, reject) => {
    file.mkdirSync(filename, true)
    const stream = fs.createWriteStream(file.pathJoin(filename))
    requestLib(url).pipe(stream).on('close', resolve)
  })
}

