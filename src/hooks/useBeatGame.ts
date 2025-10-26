import { useState, useEffect, useRef, useCallback } from 'react'
import { repl } from '@strudel/core'
import { mini } from '@strudel/mini'
import { getAudioContext, initAudioOnFirstClick, webaudioOutput } from '@strudel/webaudio'
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
  const currentPatternLevelRef = useRef(0)
  const audioContextRef = useRef<AudioContext | null>(null)

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
      try {
        schedulerRef.current.stop()
      } catch (e) {
        console.error('Error stopping scheduler:', e)
      }
    }

    setState(prev => ({
      ...prev,
      isPlaying: false,
      gameOver: true
    }))
  }, [])

  // Create beat callback
  const onBeat = useCallback(() => {
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
  }, [stopGame])

  // Create pattern for current level
  const createPattern = useCallback((level: number) => {
    try {
      let pattern

      switch (level) {
        case 0:
          // Simple kick-snare pattern
          pattern = mini('bd sn bd sn')
          break
        case 1:
          // Add hi-hat
          pattern = mini('bd sn hh bd sn hh')
          break
        case 2:
          // More complex pattern
          pattern = mini('bd [sn hh] bd [sn hh]')
          break
        case 3:
          // Most complex
          pattern = mini('bd sn [hh hh] bd sn hh')
          break
        default:
          pattern = mini('bd sn bd sn')
      }

      // Add beat trigger callback
      return pattern.onTrigger(onBeat)
    } catch (error) {
      console.error('Failed to create pattern:', error)
      return null
    }
  }, [onBeat])

  // Set pattern on scheduler
  const setPattern = useCallback((level: number) => {
    if (!schedulerRef.current) {
      console.error('Scheduler not initialized')
      return
    }

    try {
      const pattern = createPattern(level)
      if (pattern) {
        console.log('Setting pattern for level:', level)
        schedulerRef.current.setPattern(pattern, true)
        console.log('Pattern set successfully')
      }
    } catch (error) {
      console.error('Failed to set pattern:', error)
    }
  }, [createPattern])

  // Enrich pattern with more instruments
  const enrichPattern = useCallback(() => {
    if (currentPatternLevelRef.current < 3) {
      currentPatternLevelRef.current += 1
      console.log('Enriching pattern to level:', currentPatternLevelRef.current)
      setPattern(currentPatternLevelRef.current)
    }
  }, [setPattern])

  // Initialize audio context
  const initAudio = useCallback(async () => {
    if (audioInitializedRef.current) return

    try {
      console.log('Initializing audio...')
      await initAudioOnFirstClick()
      await Tone.start()

      audioContextRef.current = getAudioContext()
      console.log('Audio context obtained:', audioContextRef.current)

      // Initialize scheduler with proper configuration
      const { scheduler } = repl({
        defaultOutput: webaudioOutput,
        getTime: () => audioContextRef.current?.currentTime || 0
      })

      schedulerRef.current = scheduler

      // Set tempo (BPM / 60 / 4 for cycles per second)
      const cps = BPM / 60 / 4
      schedulerRef.current.setCps(cps)
      console.log('Scheduler initialized with CPS:', cps)

      audioInitializedRef.current = true
      console.log('Audio and scheduler initialized successfully')
    } catch (error) {
      console.error('Failed to initialize audio:', error)
    }
  }, [])

  // Start the game
  const startGame = useCallback(async () => {
    console.log('Starting game...')
    await initAudio()

    if (!schedulerRef.current) {
      console.error('Scheduler not initialized')
      return
    }

    setState(prev => ({
      ...prev,
      isPlaying: true,
      gameOver: false,
      score: 0,
      combo: 0,
      currentBeat: 0,
      backgroundColor: '#1a1a2e'
    }))

    currentPatternLevelRef.current = 0
    gameStartTimeRef.current = Date.now()

    try {
      // Set initial pattern
      setPattern(0)

      // Start the scheduler
      schedulerRef.current.start()
      console.log('Game started, scheduler running')
    } catch (error) {
      console.error('Failed to start game:', error)
    }
  }, [initAudio, setPattern])

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

    console.log('Tap! Time since last beat:', timeSinceLastBeat)

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
      console.log('HIT! Score:', newScore, 'Combo:', newCombo)
    } else {
      // Miss
      setState(prev => ({
        ...prev,
        combo: 0
      }))

      // Play miss sound
      playFeedbackSound(false)
      console.log('MISS!')
    }
  }, [state.isPlaying, state.gameOver, state.combo, state.score, startGame, playFeedbackSound, enrichPattern])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (schedulerRef.current) {
        try {
          schedulerRef.current.stop()
        } catch (e) {
          console.error('Error during cleanup:', e)
        }
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
