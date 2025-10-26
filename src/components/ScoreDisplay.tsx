interface ScoreDisplayProps {
  score: number
  combo: number
  isPlaying: boolean
  gameOver: boolean
  beatActive: boolean
  onStart: () => void
  onRestart: () => void
}

export function ScoreDisplay({
  score,
  combo,
  isPlaying,
  gameOver,
  beatActive,
  onStart,
  onRestart
}: ScoreDisplayProps) {
  return (
    <div className="score-overlay">
      {!isPlaying && !gameOver && (
        <div className="start-screen">
          <h1 className="title">Tap My Strudel</h1>
          <p className="subtitle">Tap the screen when the sphere glows</p>
          <button className="start-button" onClick={onStart}>
            Start Game
          </button>
        </div>
      )}

      {isPlaying && (
        <>
          <div className="score-container">
            <div className="score">
              Score: <span className="score-value">{score}</span>
            </div>
            {combo > 0 && (
              <div className="combo">
                Combo: <span className="combo-value">×{combo}</span>
              </div>
            )}
          </div>

          <div className="beat-indicator-container">
            <div className={`beat-indicator ${beatActive ? 'active' : ''}`}>
              TAP!
            </div>
          </div>
        </>
      )}

      {gameOver && (
        <div className="game-over-screen">
          <h2 className="game-over-title">Game Over!</h2>
          <p className="final-score">Final Score: {score}</p>
          <button className="restart-button" onClick={onRestart}>
            Play Again
          </button>
        </div>
      )}
    </div>
  )
}
