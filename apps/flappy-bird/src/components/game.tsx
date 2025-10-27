import { useLayoutEffect, useRef, useState } from 'react'
import Bird from './bird'
import Pipe from './pipe'

export default function Game() {
  const [start, setStart] = useState(false)

  const [isRunning, setIsRunning] = useState(true)
  const [score, setScore] = useState(0)

  // ~~~ baseLine ~~~
  const gameRef = useRef<HTMLDivElement>(null)
  const height = useRef(0)
  const birdY = useRef(0)

  useLayoutEffect(() => {
    const h = gameRef.current!.offsetHeight
    height.current = h
  }, [])

  // ~~~ pipe ~~~
  const handlePipeMove = (x: number, pipes: any[]) => {
    const absX = Math.abs(x)
    const hiddenX = absX - 600
    const isDie = pipes.some((pipe) => {
      const visibleX = pipe.x - hiddenX
      if (visibleX < 95 && visibleX > 55) {
        return birdY.current < pipe.y || birdY.current > pipe.y + pipe.aisle
      }
      return false
    })
    if (isDie) {
      setIsRunning(false)
      setStart(false)
    }
    setScore(absX)
  }

  // ~~~ bird ~~~
  const handleBirdMove = (y: number) => {
    birdY.current = y
    if (y > height.current - 20) {
      setIsRunning(false)
      setStart(false)
    }
  }

  return (
    <div className="game-container">
      { !start && (
        <div className="start-button">
          <span onClick={() => {
            setStart(!start)
          }}
          >
            开始
          </span>
        </div>
      )}
      <div className="score">
        得分：
        {score}
      </div>
      <div ref={gameRef} className="game">
        <Pipe start={start} isRunning={isRunning} handleMove={handlePipeMove} />
        <Bird start={start} isRunning={isRunning} handleMove={handleBirdMove} />
      </div>
    </div>
  )
}
