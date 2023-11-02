import { useMemo, useRef, useEffect, isValidElement, cloneElement, Fragment } from 'react'
import { useDidShow } from '@tarojs/taro'
import { ScrollView } from '@/duxapp'

/**
 * 用于详情页面的渲染
 * @param {*} param0
 * @returns
 */

export const createDetail = useRequest => {
  return ({
    url,
    option,
    reloadForShow,
    detailCallback,
    defaultData,
    field,
    children,
    refresh = true,
    renderHeader,
    renderFooter,
    container: Container = Fragment
  }) => {

    const init = useRef(false)

    const _option = useMemo(() => {
      return ({
        url,
        toast: true,
        ...option
      })
    }, [option, url])

    const [data, action] = useRequest(_option, { detailCallback, field, defaultData })

    useEffect(() => {
      if (!init.current && !action.status) {
        init.current = true
      }
    }, [action.status])

    useDidShow(() => {
      // 在上面页面关掉的时候刷新数据
      init.current && reloadForShow && action.reload()
    })

    const child = useMemo(() => {
      return typeof children === 'function'
        ? children?.({ data, action })
        : isValidElement(children)
          ? cloneElement(children, { data, action })
          : children
    }, [action, children, data])

    return <Container data={data} action={action}>
      {renderHeader?.({ data, action })}
      <ScrollView
        refresh={refresh && action.status}
        onRefresh={action.reload}
      >
        {child}
      </ScrollView>
      {renderFooter?.({ data, action })}
    </Container>
  }
}
