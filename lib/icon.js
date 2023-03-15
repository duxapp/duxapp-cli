
const { request } = require('./net')

module.exports = {
  /**
   * 创建一个图标组件
   * @param {*} name 
   * @param {*} url iconFont图标库的css地址
   * @param {*} savePath 
   */
  async create(name, url, savePath) {
    const content = await request(url)
    if(!content) {
      
    }
    const fontUrl = 'https:' + content.match(/url\('(\/\/at.alicdn.com\/t\/c\/[a-zA-Z0-9_]{1,}\.ttf\?t=1677569087175)'\)/)[1]

    console.log(fontUrl)
  }
}