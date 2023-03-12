import { app } from './utils'

app.register('{{name}}')

export const appLifecycle = {
  option: option => { },
  launch: () => { },
  show: () => { },
  hide: () => { },
  effect: async () => { }
}
