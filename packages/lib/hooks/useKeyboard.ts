import { useEffect } from 'react'

type KeyHandler = (event: KeyboardEvent) => void

interface Options {
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean // Mac ⌘
}

export function useKeyboard(event: 'keydown' | 'keyup', key: string, handler: KeyHandler, options: Options = {}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { ctrl, shift, alt, meta } = options

      // 校验组合键
      if ((ctrl && !event.ctrlKey)
        || (shift && !event.shiftKey)
        || (alt && !event.altKey)
        || (meta && !event.metaKey)) {
        return
      }

      if (event.code === key) {
        handler(event)
      }
    }

    document.addEventListener(event, handleKeyDown)
    return () => document.removeEventListener(event, handleKeyDown)
  }, [event, key, handler, options])
}
