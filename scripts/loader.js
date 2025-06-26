import { readFileSync, existsSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { join, dirname } from 'path'

export async function resolve(specifier, context, nextResolve) {
  // 规范化父URL
  let parentURL = context.parentURL
  if (parentURL && !parentURL.startsWith('file:')) {
    if (/^[a-zA-Z]:[\\/]/.test(parentURL)) {
      parentURL = pathToFileURL(parentURL).href
    }
  }

  try {
    // 特殊处理 package.json 请求
    if (specifier === './package.json' && parentURL) {
      const parentPath = fileURLToPath(parentURL)
      const pkgPath = join(dirname(parentPath), 'package.json')
      if (existsSync(pkgPath)) {
        return {
          url: pathToFileURL(pkgPath).href,
          format: 'json'
        }
      }
    }

    const resolved = await nextResolve(specifier, {
      ...context,
      parentURL: parentURL || context.parentURL
    })

    if (
      resolved.url.startsWith('file:') &&
      resolved.url.endsWith('.js') &&
      !resolved.url.includes('/node_modules/')
    ) {
      try {
        const source = readFileSync(fileURLToPath(resolved.url), 'utf8')
        const format = detectModuleType(source)
        return { ...resolved, format }
      } catch (error) {
        console.error('[resolve error]', error)
        return resolved
      }
    }

    return resolved
  } catch (error) {
    // 处理相对路径解析失败的情况
    if (error.code === 'ERR_INVALID_URL' && parentURL) {
      try {
        const basePath = fileURLToPath(parentURL)
        const fullPath = join(dirname(basePath), specifier)
        if (existsSync(fullPath)) {
          return {
            url: pathToFileURL(fullPath).href,
            format: specifier.endsWith('.json') ? 'json' : 'module'
          }
        }
      } catch (fallbackError) {
        console.error('[fallback resolve error]', fallbackError)
      }
    }
    throw error
  }
}

export async function load(url, context, nextLoad) {
  // 确保 URL 是 file: 协议
  if (!url.startsWith('file:')) {
    if (/^[a-zA-Z]:[\\/]/.test(url)) {
      url = pathToFileURL(url).href
    } else {
      return nextLoad(url, context)
    }
  }

  // 跳过非目标文件
  if (!url.endsWith('.js') && !url.endsWith('.json')) {
    return nextLoad(url, context)
  }

  // 跳过不需要处理的 node_modules
  if (url.includes('node_modules') && !url.includes(join('node_modules', 'duxapp-cli', 'src'))) {
    return nextLoad(url, context)
  }

  try {
    const source = readFileSync(fileURLToPath(url), 'utf8')
    let format = context.format

    if (!format) {
      if (url.endsWith('.json')) {
        format = 'json'
      } else {
        format = detectModuleType(source)
      }
    }

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
    console.log(source)
    throw new Error('文件同时包含 export 和 module.exports，无法判断模块类型')
  }
  return 'commonjs'
}
