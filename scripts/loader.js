import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join } from 'path'

export async function resolve(specifier, context, nextResolve) {
  const resolved = await nextResolve(specifier, context)

  if (
    resolved.url.startsWith('file:') &&
    resolved.url.endsWith('.js') &&
    !resolved.url.includes('/node_modules/')
  ) {
    const source = readFileSync(fileURLToPath(resolved.url), 'utf8')
    const format = detectModuleType(source)
    return { ...resolved, format }
  }

  return resolved
}

export async function load(url, context, nextLoad) {
  if (!url.startsWith('file:')) {
    return nextLoad(url, context)
  }
  if (!url.endsWith('.js')) {
    return nextLoad(url, context)
  }
  if (url.includes('node_modules') && !url.includes(join('node_modules', 'duxapp-cli', 'src'))) {
    return nextLoad(url, context)
  }

  try {
    const source = readFileSync(fileURLToPath(url), 'utf8')
    const format = context.format || detectModuleType(source)
    return {
      format,
      source,
      shortCircuit: true
    }
  } catch (error) {
    console.error('[load error]', error)
    return nextLoad(url, context)
  }
}

function detectModuleType(source) {
  const hasModuleExports = /module\.exports\s*=/.test(source)
  const hasExports = /\bexport\b/.test(source)

  if (hasExports && !hasModuleExports) return 'module'
  if (hasModuleExports && !hasExports) return 'commonjs'
  if (hasExports && hasModuleExports) {
    throw new Error('文件同时包含 export 和 module.exports，无法判断模块类型')
  }
  return 'commonjs' // 默认 fallback
}
