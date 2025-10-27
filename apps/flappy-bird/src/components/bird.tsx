import { useKeyboard } from '@fish-pond/lib/hooks'
import { memo, useCallback, useLayoutEffect, useRef } from 'react'

interface BirdProps {
  handleMove: (y: number) => void
  isRunning: boolean
  start: boolean
}

function Bird({ handleMove, isRunning, start }: BirdProps) {
  const birdRef = useRef<HTMLDivElement>(null)
  const birdVy = useRef(1.5)
  const birdY = useRef(0)
  const requestId = useRef<number>(null)

  const moveBird = useCallback(() => {
    if (!isRunning) {
      return
    }
    if (birdY.current >= 0) {
      birdY.current += birdVy.current
      birdRef.current!.style.transform = `translateY(${birdY.current}px)`
      handleMove(birdY.current)
    }
    else {
      birdY.current = 0
    }
    requestId.current = requestAnimationFrame(moveBird)
  }, [isRunning, handleMove])

  useLayoutEffect(() => {
    if (start) {
      requestId.current = requestAnimationFrame(moveBird)
    }
    else {
      cancelAnimationFrame(requestId.current!)
    }
    return () => {
      cancelAnimationFrame(requestId.current!)
    }
  }, [isRunning, moveBird, start])

  useKeyboard('Space', () => {
    birdVy.current = -2
  }, {
    keyType: 'keydown',
  })
  useKeyboard('Space', () => {
    birdVy.current = 1.5
  }, {
    keyType: 'keyup',
  })
  return (
    <div ref={birdRef} className="bird"></div>
  )
}

export default memo(Bird)
