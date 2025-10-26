import { useCallback } from 'react'
import { Scene } from './components/Scene'
import { ScoreDisplay } from './components/ScoreDisplay'
import { useBeatGame } from './hooks/useBeatGame'
import './styles.css'

function App() {
  const {
    score,
    combo,
    isPlaying,
    gameOver,
    beatActive,
    backgroundColor,
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

  return (
    <div
      className="app-container"
      onPointerDown={handleTap}
      onTouchStart={handleTap}
    >
      <Scene
        beatActive={beatActive}
        combo={combo}
        backgroundColor={backgroundColor}
      />

      <ScoreDisplay
        score={score}
        combo={combo}
        isPlaying={isPlaying}
        gameOver={gameOver}
        beatActive={beatActive}
        onStart={startGame}
        onRestart={handleRestart}
      />
    </div>
  )
}

export default App
