import { useLayoutEffect, useRef, useState } from 'react'
import Bird from './bird'

export default function Game() {
  // ~~~ baseLine ~~~
  const gameRef = useRef<HTMLDivElement>(null)
  const height = useRef(0)

  useLayoutEffect(() => {
    const h = gameRef.current!.offsetHeight
    height.current = h
  }, [])

  // ~~~ dieLine ~~~
  const [isRunning, setIsRunning] = useState(true)
  const handleMove = (y: number) => {
    if (y > height.current - 20) {
      setIsRunning(false)
    }
  }

  return (
    <div ref={gameRef} className="game">
      <Bird isRunning={isRunning} handleMove={handleMove} />
    </div>
  )
}
