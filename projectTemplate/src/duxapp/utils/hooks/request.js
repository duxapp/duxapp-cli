import { useMemo, useState, useCallback, useEffect, useRef } from 'react'

export const createRequestHooks = request => {
  return {
    useRequest: (option, config) => {

      const _config = useRef(config || {})

      const defaultData = useMemo(() => (_config.current?.defaultData || {}), [])

      const [data, setData] = useState(defaultData)

      const [status, setStatus] = useState(true)

      // 更新配置
      useEffect(() => {
        _config.current = { ..._config.current, ...config }
      }, [config])

      const resultAction = useCallback(async res => {
        if (_config.current?.detailCallback) {
          res = _config.current.detailCallback(res)
          if (res instanceof Promise) {
            res = await res
          }
        }
        if (_config.current?.field) {
          setData(res[_config.current.field])
        } else {
          setData(res)
        }
      }, [])

      const reload = useCallback(() => {
        if (!option || _config.current.status) {
          return Promise.reject()
        }
        setStatus(true)
        _config.current.status = true
        return request(option)
          .then(res => {
            resultAction(res)
            _config.current.status = false
            setStatus(false)
          })
          .catch(err => {
            if (_config.current?.onError) {
              return _config.current?.onError(err)
            }
            _config.current.status = false
            setStatus(false)
            throw err
          })
      }, [option, resultAction])

      useEffect(() => {
        reload()
      }, [reload])

      return [
        data,
        {
          status,
          reload,
          set: setData
        }
      ]
    },
    usePageData: (url, data, option) => {

      const currentData = useRef({ url, option, data, page: 1, loadEnd: false, loading: false })
      const [list, setList] = useState(currentData.current.option?.listData || [])

      const [loading, setLoading] = useState(false)

      const [refresh, setRefresh] = useState(false)

      const [loadEnd, setLoadEnd] = useState(false)

      useEffect(() => {
        if (!option?.listData) {
          return
        }
        setList(option?.listData)
      }, [option?.listData])

      const getList = useCallback(() => {
        const _data = currentData.current
        // 使用传入的数据 不通过接口加载
        if (_data.option?.listData) {
          return Promise.reject('使用本地数据 无需请求')
        }
        _data.loading = true
        setLoading(true)
        if (_data.page === 1) {
          setRefresh(true)
        }
        return request({
          url: _data.url,
          data: { ..._data.data, page: _data.page },
          method: _data.option?.method || 'GET',
          toast: _data.option?.toast || true
        }).then(async res => {
          const field = _data.option?.field || 'list'
          let _list = res[field]
          if (typeof _list === 'undefined') {
            if (Array.isArray(res)) {
              _list = res
            } else {
              return console.error('获取列表数据错误：' + field + '字段不存在')
            }
          }
          if (_data.option?.listCallback) {
            _list = _data.option?.listCallback(_list, res)
            if (_list instanceof Promise) {
              _list = await _list
            }
          }
          if (!_list?.length) {
            currentData.current.loadEnd = true
            setLoadEnd(true)
          }
          setList(old => {
            if (_data.page > 1) {
              return [...old, ..._list]
            } else {
              return _list
            }
          })
          _data.loading = false
          setLoading(false)
          setRefresh(false)
        }).catch(() => {
          _data.loading = false
          setLoading(false)
          setRefresh(false)
        })
      }, [])

      const next = useCallback(() => {
        if (currentData.current.loadEnd) {
          return Promise.reject('数据已经加载完成')
        }
        if (currentData.current.loading) {
          return Promise.reject('请稍后 正在加载中')
        }
        currentData.current.page++
        return getList()
      }, [getList])

      const reload = useCallback(() => {
        if (currentData.current.loading) {
          return Promise.reject('请稍后 正在加载中')
        }
        if (currentData.current.loadEnd) {
          currentData.current.loadEnd = false
          setLoadEnd(false)
        }
        currentData.current.page = 1
        return getList()
      }, [getList])

      useEffect(() => {
        currentData.current.url = url
        currentData.current.data = { ...data }
        reload().catch(() => { })
      }, [url, data, reload])

      return [list, {
        loading,
        currentData: currentData.current,
        refresh,
        loadEnd,
        next,
        reload
      }]
    }
  }
}
