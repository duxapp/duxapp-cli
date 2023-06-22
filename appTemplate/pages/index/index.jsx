import { View } from '@tarojs/components'
import { Header, ScrollView, TopView } from '@/base'

import './index.scss'

export default function NewApp() {
  return <TopView>
    <Header title='{{name}}' titleCenter />
    <ScrollView>
      <View className='new-app__title'>欢迎使用duxapp</View>
      <View className='new-app__p'>新创建的模块默认依赖于base模块</View>
      <View className='new-app__p'>如果需要依赖于其他的模块请在app.json中修改依赖项, 并且使用 yarn duxapp app add 添加该依赖</View>
    </ScrollView>
  </TopView>
}
