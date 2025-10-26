interface ScoreDisplayProps {
  score: number
  combo: number
  maxCombo: number
  isPlaying: boolean
  gameOver: boolean
  perfectHits: number
  goodHits: number
  missedHits: number
  onStart: () => void
  onRestart: () => void
}

export function ScoreDisplay({
  score,
  combo,
  maxCombo,
  isPlaying,
  gameOver,
  perfectHits,
  goodHits,
  missedHits,
  onStart,
  onRestart
}: ScoreDisplayProps) {
  const accuracy = perfectHits + goodHits + missedHits > 0
    ? Math.round(((perfectHits + goodHits) / (perfectHits + goodHits + missedHits)) * 100)
    : 100

  return (
    <div className="score-overlay">
      {!isPlaying && !gameOver && (
        <div className="start-screen">
          <h1 className="title">TAP BEAT RUSH</h1>
          <p className="subtitle">Match the gesture when circles reach the target!</p>
          <div className="instructions">
            <div className="instruction-row">
              <span className="icon tap">⊙</span> Tap
            </div>
            <div className="instruction-row">
              <span className="icon double">⊙⊙</span> Double Tap
            </div>
            <div className="instruction-row">
              <span className="icon swipe-left">←</span> Swipe Left
              <span className="icon swipe-right">→</span> Swipe Right
            </div>
            <div className="instruction-row">
              <span className="icon swipe-up">↑</span> Swipe Up
              <span className="icon swipe-down">↓</span> Swipe Down
            </div>
            <p className="timing-info">Perfect: &lt;50ms • Good: &lt;150ms</p>
          </div>
          <button className="start-button" onClick={onStart}>
            START GAME
          </button>
        </div>
      )}

      {isPlaying && (
        <>
          <div className="hud-top">
            <div className="score-display">
              <div className="score-label">SCORE</div>
              <div className="score-value">{score}</div>
            </div>

            {combo > 0 && (
              <div className={`combo-display ${combo > 10 ? 'mega' : combo > 5 ? 'super' : ''}`}>
                <div className="combo-label">COMBO</div>
                <div className="combo-value">×{combo}</div>
              </div>
            )}
          </div>

          <div className="stats-bottom">
            <span>Perfect: {perfectHits}</span>
            <span>Good: {goodHits}</span>
            <span>Miss: {missedHits}</span>
          </div>
        </>
      )}

      {gameOver && (
        <div className="game-over-screen">
          <h2 className="game-over-title">PERFECT!</h2>
          <div className="final-stats">
            <div className="stat-item">
              <span className="stat-label">Final Score</span>
              <span className="stat-value">{score}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Max Combo</span>
              <span className="stat-value">×{maxCombo}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Accuracy</span>
              <span className="stat-value">{accuracy}%</span>
            </div>
            <div className="stat-breakdown">
              <div>Perfect: {perfectHits}</div>
              <div>Good: {goodHits}</div>
              <div>Missed: {missedHits}</div>
            </div>
          </div>
          <button className="restart-button" onClick={onRestart}>
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  )
}
