import {
  app,
  route
} from './utils'

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
