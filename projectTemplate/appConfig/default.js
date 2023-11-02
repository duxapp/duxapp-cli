// import qiniu from './base/components/UploadFileManage/drive/qiniu'

const config = {
  // 对于默认不开启的页面 配置在此处将开启这些页面
  openPages: [],
  // 不需要的页面可以配置路径禁用
  disablePages: [],
  // 覆盖app.config.js 配置
  appConfig: {
    requiredPrivateInfos: [
      'chooseLocation',
      'getLocation',
      'onLocationChange',
      'startLocationUpdateBackground',
      'chooseAddress'
    ]
  },
  // 调试配置
  debug: {
    // 在h5端开启vconsole调试功能
    vconsole: false
  },
  rn: {
    packageName: 'com.duxapp'
  },
  // 模块配置 将会调用模块生命周期的option，将对应模块的参数传入
  option: {
    // 基础模块
    duxapp: {
      // app端配置
      app: {
        wxAppid: '',
        wxUniversalLink: '',
        codePushAndroidKey: '',
        codePushAndroidTestKey: '',
        codePushIosKey: '',
        codePushIosTestKey: '',
        duxPushID: '',
        umAppKey: ''
      },
      theme: {
        primaryColor: '#CDDE00',
        secondaryColor: '#FDD000',
        successColor: '#34a853',
        warningColor: '#fbbc05',
        dangerColor: '#ea4335',
        pageColor: '#fafbf8',
        mutedColor: '#666',
        header: {
          color: '#fff', // 仅支持rgb hex值，请勿使用纯单词 设置为数组将显示一个渐变按钮
          textColor: '#000', // 文本颜色
          showWechat: false, // 微信公众号是否显示header
          showWap: true, // h5是否显示header
        }
      },
      /**
       * 如果某些字体放在本地，则配置此处，可以对不同系统配置，也可以统一配置
       */
      font: {
        local: {
          // SlimIcon: {
          //   ios: true
          //   adnroid: true
          // }
        }
      }
    },
    base: {
      fileUpload: {
        // 大文件上传驱动
        // drive: qiniu()
      },
      theme: {

        button: {
          color: ['#c0d930', '#f2d733'],
          textColor: '#fff',
          radiusType: 'round', // 按钮圆角类型 square直角 round圆角 round-min较小的圆角
          size: 'l', // 按按钮尺寸 s m l xl xxl xxxl
          plain: false, // 是否镂空
        },
        tabs: {
          lineWidth: 50,
          lineRadius: 5,
          lineHeight: 10,
        },
      }
    },
    duxui: {
      // 分享组件配置
      share: {
        // 启用分享
        open: false,
        // 开启未定义的页面分享
        pageSlef: {
          // 包含这些页面分享自身 页面路径关键词匹配 include 优先级比 exclude 高，
          // 可以配置exclude为空数组表示支持所有页面
          // pageSlef优先级高于pageHome
          // include: ['page/test'],
          // 排除这些页面 不进行分享
          // exclude: []
        },
        // 开启未定义的页面分享到指定页面
        pageHome: {
          path: '',
          params: {},
          // 包含这些页面分享自身 页面路径关键词匹配
          // include: [],
          // 排除这些页面 不进行分享
          // exclude: []
        },
        // 公共分享参数
        common: {
          title: '淘六汇',
          desc: '欢迎使用淘六汇购物平台',
          image: 'https://img.zhenxinhuixuan.com/weiwait/cropper/2lVCofRIu6Jl3jNebxCA6VkEMUeaobvLWFYMTiaG.jpg'
        }
      }
    },
    // 用户模块
    user: {
      // 使用哪个模块注册的登录功能
      use: 'slim',
      // 是否禁用h5端微信登录
      disableH5Watch: false,
      // 开启微信小程序手机号快捷登录
      weappTelLogin: true
    },
    // 老商城系统
    duxshop: {
      // 请求配置
      request: {
        origin: 'https://shop.tonglao.com.cn',
        // origin: 'https://a.yiyouwanban.com',
        path: 'a', // 域名二级目录
        secret: 'f34f01e53f0d21d9245c3f2771d1b183', // 站点token
        appid: '1651593048279300',
        devOpen: false,
        devToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOlwvXC9zaG9wLnRvbmdsYW8uY29tLmNuIiwiYXVkIjoiaHR0cDpcL1wvc2hvcC50b25nbGFvLmNvbS5jbiIsImlhdCI6MTY3MTYwNzgyOSwibmJmIjoxNjcxNjA3ODI5LCJkYXRhIjoiMTA3In0.b5Gl_ijHfPQpaJ36OyVOACcJH0rbCBF5JXwjgOry6RM'
      }
    },
    // 新php系统
    duxravel: {
      request: {
        origin: 'https://service.tonglao.com.cn',
        path: 'api', // 域名二级目录
        accessKey: '26356048',
        sign: '958fdee7f4cc68f09d60c9c297995013',
        devOpen: false,
        devToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOlwvXC9zaG9wLnRvbmdsYW8uY29tLmNuIiwiYXVkIjoiaHR0cDpcL1wvc2hvcC50b25nbGFvLmNvbS5jbiIsImlhdCI6MTY1MTYyNzk0MywibmJmIjoxNjUxNjI3OTQzLCJkYXRhIjoxMTN9.9RIvfur2va5Q-lew2rpSXStZQVErlagTMnLy7qVTI94'
      }
    },
    // 新php模块化系统
    duxslim: {
      request: {
        origin: "https://gcsd.client.jujiang.me",
        // origin: 'http://192.168.2.24:8090',
        path: "api", // 域名二级目录
        accessKey: "81506876",
        sign: "cb6d343a133c359c451d68e37d0f7ecb",
        devOpen: false,
        devToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtZW1iZXIiLCJpYXQiOjE2NzU2NjA2MzUsImV4cCI6MTY3NTc0NzAzNSwiaWQiOjF9._kX-uT-hUEbo_J3fN5F0HHs0ee01TPNQHrDiH3SHQlc'
      },
      // 登录相关配置
      loginConfig: {
        // 手机号登录
        phone: true,
        // 邮箱登录
        email: false,
        // app微信登录
        appWatch: true,
        // 小程序微信登录
        weappWatch: true,
        // 名称
        appName: 'DuxSlim'
      }
    },
    // cms框架
    duxcms: {
      request: {
        origin: "https://shujumatou.2c99.com",
        // origin: 'http://192.168.2.24:8090',
        path: "api", // 域名二级目录
        accessKey: "60461702",
        sign: "25359648c9fedc90b32359e9ed3ceefe",
        devOpen: false,
        devToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtZW1iZXIiLCJpYXQiOjE2NzU2NjA2MzUsImV4cCI6MTY3NTc0NzAzNSwiaWQiOjF9._kX-uT-hUEbo_J3fN5F0HHs0ee01TPNQHrDiH3SHQlc'
      },
      // 登录相关配置
      loginConfig: {
        // 手机号登录
        phone: true,
        // 邮箱登录
        email: false,
        // app微信登录
        appWatch: true,
        // 小程序微信登录
        weappWatch: true,
        // 名称
        appName: 'duxcms'
      }
    },
    // 新商城系统配置
    shopv2: {
      theme: {
        goods: {
          // 价格颜色
          priceColor: '#ff442a',
          // 原价颜色
          marketPriceColor: '#999',
          // 购物车图标颜色
          cartColor: '#FF442A',
          // 详情购买颜色
          detailBuyColor: '#ff442a',
          // 详情添加购物车颜色
          detailCartColor: '#ff9324'
        },
        // 规格按钮样式
        spec: {
          color: '#888',
          selectColor: '#333',
          radiusType: 'round',
          size: 'm',
          plain: true,
        },
        // 分类页面
        category: {
          // 显示多少级菜单 1-3
          level: 3
        }
      }
    }
  }
}

export default config
