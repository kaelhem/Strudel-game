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
    onTouchStart,
    onTouchEnd,
    startGame,
    stopGame
  } = useBeatGame()

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only handle game inputs when playing
    if (!isPlaying) return
    e.preventDefault()
    onTouchStart(e.clientX, e.clientY)
  }, [onTouchStart, isPlaying])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    // Only handle game inputs when playing
    if (!isPlaying) return
    e.preventDefault()
    onTouchEnd(e.clientX, e.clientY)
  }, [onTouchEnd, isPlaying])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only handle game inputs when playing
    if (!isPlaying) return
    e.preventDefault()
    const touch = e.touches[0]
    onTouchStart(touch.clientX, touch.clientY)
  }, [onTouchStart, isPlaying])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Only handle game inputs when playing
    if (!isPlaying) return
    e.preventDefault()
    const touch = e.changedTouches[0]
    onTouchEnd(touch.clientX, touch.clientY)
  }, [onTouchEnd, isPlaying])

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
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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
