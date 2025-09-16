import { randomBetween } from '@fish-pond/lib'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

interface BirdProps {
  handleMove: (y: number, pipes: any[]) => void
  isRunning: boolean
}
interface PipeProps {
  index: number
  x: number
  y: number
  aisle: number
}

export default function Pipe({ handleMove, isRunning }: BirdProps) {
  const pipeRef = useRef<HTMLDivElement>(null)
  const pipeVY = useRef(-2)
  const pipesY = useRef(0)

  // ~~~ pipes ~~~
  const pipsInterval = useRef(100)
  const [pipes, setPipes] = useState<PipeProps[]>([])
  const pipeFactory = () => {
    // 每隔pipsInterval px生成一个pipe
    if (pipesY.current % pipsInterval.current === 0) {
      const aisle = randomBetween(150, 220)
      const pipeY = randomBetween(50, 350 - aisle)
      let index = pipes[pipes.length - 1]?.index
      if (index === undefined) {
        index = 1
      }
      else {
        index += 1
      }
      setPipes(pipes => [
        ...pipes.filter(pipe => pipe.x > Math.abs(pipesY.current) - 650),
        { index, x: index * pipsInterval.current, aisle, y: pipeY },
      ])
    }
  }

  // ~~~ pipe-group ~~~
  const requestId = useRef<number>(null)
  const movePipe = useCallback(() => {
    if (!isRunning) {
      return
    }
    pipesY.current += pipeVY.current

    pipeFactory()
    pipeRef.current!.style.transform = `translateX(${pipesY.current}px)`
    handleMove(pipesY.current, pipes)
    requestId.current = requestAnimationFrame(movePipe)
  }, [isRunning, handleMove])

  useLayoutEffect(() => {
    requestId.current = requestAnimationFrame(movePipe)
    return () => {
      cancelAnimationFrame(requestId.current!)
    }
  })

  return (
    <div ref={pipeRef} className="pipe-group">
      {pipes.map(pipe => (
        <div className="pipe" key={pipe.x} style={{ left: `${pipe.x}px` }}>
          <div className="top" style={{ height: `${pipe.y}px` }}></div>
          <div className="bottom" style={{ height: `${400 - pipe.y - pipe.aisle}px` }}></div>
        </div>
      ))}
    </div>
  )
}
