import { useCallback } from 'react'
import { Scene } from './components/Scene'
import { ScoreDisplay } from './components/ScoreDisplay'
import { useBeatGame } from './hooks/useBeatGame'
import './styles.css'

function App() {
  const {
    score,
    combo,
    maxCombo,
    isPlaying,
    gameOver,
    notes,
    perfectHits,
    goodHits,
    missedHits,
    currentTime,
    onTap,
    startGame,
    stopGame
  } = useBeatGame()

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    onTap()
  }, [onTap])

  const handleRestart = useCallback(() => {
    stopGame()
    setTimeout(startGame, 100)
  }, [stopGame, startGame])

  // Dynamic background color based on combo
  const getBackgroundColor = () => {
    if (combo > 15) return '#ff006e'
    if (combo > 10) return '#fb5607'
    if (combo > 5) return '#3a0ca3'
    return '#1a1a2e'
  }

  return (
    <div
      className="app-container"
      onPointerDown={handleTap}
      onTouchStart={handleTap}
    >
      <Scene
        notes={notes}
        currentTime={currentTime}
        combo={combo}
        backgroundColor={getBackgroundColor()}
      />

      <ScoreDisplay
        score={score}
        combo={combo}
        maxCombo={maxCombo}
        isPlaying={isPlaying}
        gameOver={gameOver}
        perfectHits={perfectHits}
        goodHits={goodHits}
        missedHits={missedHits}
        onStart={startGame}
        onRestart={handleRestart}
      />
    </div>
  )
}

export default App
