/* eslint-disable import/no-commonjs */
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const { getMetroConfig } = require('@tarojs/rn-supporter')

const configs = require('./metro.user.config.js')

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {}

module.exports = (async function (){
  return mergeConfig(getDefaultConfig(__dirname), await getMetroConfig(), config, ...configs)
})()