import { useState, useEffect, useRef, useCallback } from 'react'
import { repl } from '@strudel/core'
import { initAudioOnFirstClick } from '@strudel/webaudio'
import * as Tone from 'tone'

const GAME_DURATION = 30000 // 30 seconds
const TAP_WINDOW = 150 // ±150ms tolerance
const BPM = 120

export interface BeatGameState {
  score: number
  currentBeat: number
  isPlaying: boolean
  gameOver: boolean
  combo: number
  beatActive: boolean
  backgroundColor: string
}

export function useBeatGame() {
  const [state, setState] = useState<BeatGameState>({
    score: 0,
    currentBeat: 0,
    isPlaying: false,
    gameOver: false,
    combo: 0,
    beatActive: false,
    backgroundColor: '#1a1a2e'
  })

  const schedulerRef = useRef<any>(null)
  const lastBeatTimeRef = useRef<number>(0)
  const gameStartTimeRef = useRef<number>(0)
  const audioInitializedRef = useRef(false)
  const currentPatternRef = useRef('bd sn bd sn')

  // Play feedback sound
  const playFeedbackSound = useCallback((success: boolean) => {
    const synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.1,
        sustain: 0,
        release: 0.1
      }
    }).toDestination()

    if (success) {
      synth.triggerAttackRelease('C5', '16n')
    } else {
      synth.triggerAttackRelease('F2', '16n')
    }

    setTimeout(() => synth.dispose(), 200)
  }, [])

  // Stop the game
  const stopGame = useCallback(() => {
    if (schedulerRef.current) {
      schedulerRef.current.stop()
      schedulerRef.current = null
    }

    setState(prev => ({
      ...prev,
      isPlaying: false,
      gameOver: true
    }))
  }, [])

  // Enrich pattern with more instruments
  const enrichPattern = useCallback(() => {
    const patterns = [
      'bd sn bd sn',
      'bd sn hh bd sn hh',
      'bd [sn hh] bd [sn hh]',
      'bd sn [hh hh] bd sn hh'
    ]

    const currentIndex = patterns.indexOf(currentPatternRef.current)
    if (currentIndex < patterns.length - 1) {
      currentPatternRef.current = patterns[currentIndex + 1]

      // Restart with new pattern
      if (schedulerRef.current) {
        schedulerRef.current.stop()
      }

      const pattern = repl(currentPatternRef.current)
        .cpm(BPM)
        .onTrigger(() => {
          const now = Date.now()
          lastBeatTimeRef.current = now

          setState(prev => ({
            ...prev,
            currentBeat: prev.currentBeat + 1,
            beatActive: true
          }))

          setTimeout(() => {
            setState(prev => ({ ...prev, beatActive: false }))
          }, 100)

          if (now - gameStartTimeRef.current >= GAME_DURATION) {
            stopGame()
          }
        })

      schedulerRef.current = pattern.webaudio()
    }
  }, [stopGame])

  // Initialize audio context
  const initAudio = useCallback(async () => {
    if (audioInitializedRef.current) return

    try {
      await initAudioOnFirstClick()
      await Tone.start()
      audioInitializedRef.current = true
      console.log('Audio initialized')
    } catch (error) {
      console.error('Failed to initialize audio:', error)
    }
  }, [])

  // Start the game
  const startGame = useCallback(async () => {
    await initAudio()

    setState(prev => ({
      ...prev,
      isPlaying: true,
      gameOver: false,
      score: 0,
      combo: 0,
      currentBeat: 0
    }))

    gameStartTimeRef.current = Date.now()

    try {
      // Create Strudel pattern
      const pattern = repl(currentPatternRef.current)
        .cpm(BPM)
        .onTrigger(() => {
          const now = Date.now()
          lastBeatTimeRef.current = now

          // Flash the beat indicator
          setState(prev => ({
            ...prev,
            currentBeat: prev.currentBeat + 1,
            beatActive: true
          }))

          setTimeout(() => {
            setState(prev => ({ ...prev, beatActive: false }))
          }, 100)

          // Check game duration
          if (now - gameStartTimeRef.current >= GAME_DURATION) {
            stopGame()
          }
        })

      schedulerRef.current = pattern.webaudio()
    } catch (error) {
      console.error('Failed to start pattern:', error)
    }
  }, [initAudio, stopGame])

  // Handle tap
  const onTap = useCallback(() => {
    if (!state.isPlaying || state.gameOver) {
      if (!state.isPlaying && !state.gameOver) {
        startGame()
      }
      return
    }

    const now = Date.now()
    const timeSinceLastBeat = now - lastBeatTimeRef.current

    // Check if tap is within the timing window
    if (timeSinceLastBeat <= TAP_WINDOW) {
      // Success!
      const newCombo = state.combo + 1
      const newScore = state.score + 10 + (newCombo * 2)

      // Change background color on success
      const hue = (newScore * 3) % 360
      const newBgColor = `hsl(${hue}, 40%, 20%)`

      setState(prev => ({
        ...prev,
        score: newScore,
        combo: newCombo,
        backgroundColor: newBgColor
      }))

      // Every 5 combo, enrich the pattern
      if (newCombo % 5 === 0 && newCombo > 0) {
        enrichPattern()
      }

      // Play success sound
      playFeedbackSound(true)
    } else {
      // Miss
      setState(prev => ({
        ...prev,
        combo: 0
      }))

      // Play miss sound
      playFeedbackSound(false)
    }
  }, [state.isPlaying, state.gameOver, state.combo, state.score, startGame, playFeedbackSound, enrichPattern])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (schedulerRef.current) {
        schedulerRef.current.stop()
      }
    }
  }, [])

  return {
    ...state,
    onTap,
    startGame,
    stopGame
  }
}
