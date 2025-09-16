import { useEffect } from 'react'

type KeyHandler = (event: KeyboardEvent) => void

interface Options {
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean // Mac ⌘
  keyType: 'keydown' | 'keyup'
}

export function useKeyboard(key: string, handler: KeyHandler, options: Options = { keyType: 'keydown' }) {
  useEffect(() => {
    const { ctrl, shift, alt, meta, keyType } = options

    const handleKeyDown = (event: KeyboardEvent) => {
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

    document.addEventListener(keyType, handleKeyDown)
    return () => document.removeEventListener(keyType, handleKeyDown)
  }, [key, handler, options])
}
