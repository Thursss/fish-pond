import { useCallback, useEffect, useRef } from 'react'

interface SnakeProps {
  start: boolean
  info: {
    size: number
  }
}

export default function Snake({ start, info }: SnakeProps) {
  const requestId = useRef<number>(null)
  const snake = useRef(new SnakeClass())

  const moveSnake = useCallback(() => {
    console.log('moveSnake: ', snake.current)
    requestId.current = requestAnimationFrame(moveSnake)
  }, [info])

  useEffect(() => {
    if (start) {
      requestId.current = requestAnimationFrame(moveSnake)
    }
    else {
      cancelAnimationFrame(requestId.current!)
    }
    return () => {
      cancelAnimationFrame(requestId.current!)
    }
  }, [start, moveSnake])

  return <div className="snake" style={{ width: `${info.size}px`, height: `${info.size}px` }}></div>
}

class SnakeClass {}
