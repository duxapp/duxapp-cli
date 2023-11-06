import {
  app,
  route
} from './utils'
import './utils/init'

app.register('duxapp')

export default {
  option: () => {},
  launch: () => {
    // route.init()
  },
  show: (...arg) => {
    route.showInit(...arg)
  },
  hide: () => { },
  effect: () => {}
}
