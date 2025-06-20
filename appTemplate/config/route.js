/**
 * platform:支持的平台(weapp, h5, rn)不配置支持所有
 * subPackage:是否将其设置为分包
 * home: 是否是主页 是主页的页面将会被排在前面
 */
export default {
  path: 'pages',
  pages: {
    '{{name}}/index': {
      pages: {
        index: {
          // 创建的新模块的页面默认设置为首页，如果不需要可以删除这个配置
          home: true
        }
      }
    }
  }
}
