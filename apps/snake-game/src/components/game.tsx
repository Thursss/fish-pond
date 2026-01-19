import { useRef, useState } from 'react'
import Snake from './snake'

export default function Game() {
  const groupSize = useRef(400)
  const groupItemSize = useRef(20)
  const groupItemCount = useRef(groupSize.current ** 2 / groupItemSize.current ** 2)

  const [score] = useState(0)
  const [start, setStart] = useState(false)

  return (
    <div className="game-container" style={{ width: `${groupSize.current}px`, height: `${groupSize.current}px` }}>
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
      {/* 格子 */}
      {Array.from({ length: groupItemCount.current }).fill(groupItemSize.current).map((s, i) => (<div key={i} className="group" style={{ width: `${s}px`, height: `${s}px` }} />))}
      {/* 蛇 */}
      <Snake start={start} info={{ size: groupItemSize.current }} />
    </div>
  )
}
