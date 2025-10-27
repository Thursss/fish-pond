import { useState } from 'react'

export default function Game() {
  const [score] = useState(0)

  return (
    <div className="game-container">
      <div className="score">
        得分：
        {score}
      </div>
    </div>
  )
}
