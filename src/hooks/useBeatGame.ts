import { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'

const GAME_DURATION = 45000 // 45 seconds
const TAP_TOLERANCE = 150 // ±150ms for perfect hit
const BPM = 100

export interface Note {
  id: number
  timestamp: number
  hit: boolean
  missed: boolean
}

export interface BeatGameState {
  score: number
  combo: number
  maxCombo: number
  isPlaying: boolean
  gameOver: boolean
  notes: Note[]
  perfectHits: number
  goodHits: number
  missedHits: number
}

export function useBeatGame() {
  const [state, setState] = useState<BeatGameState>({
    score: 0,
    combo: 0,
    maxCombo: 0,
    isPlaying: false,
    gameOver: false,
    notes: [],
    perfectHits: 0,
    goodHits: 0,
    missedHits: 0
  })

  const audioInitializedRef = useRef(false)
  const gameStartTimeRef = useRef<number>(0)
  const noteIdCounterRef = useRef(0)
  const loopRef = useRef<Tone.Loop | null>(null)
  const kickRef = useRef<Tone.MembraneSynth | null>(null)
  const snareRef = useRef<Tone.NoiseSynth | null>(null)
  const beatCountRef = useRef(0)

  // Initialize audio
  const initAudio = useCallback(async () => {
    if (audioInitializedRef.current) return

    try {
      await Tone.start()
      console.log('Tone.js started')

      // Create kick drum
      kickRef.current = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 10,
        oscillator: { type: 'sine' },
        envelope: {
          attack: 0.001,
          decay: 0.4,
          sustain: 0.01,
          release: 1.4,
          attackCurve: 'exponential'
        }
      }).toDestination()

      // Create snare drum
      snareRef.current = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: {
          attack: 0.001,
          decay: 0.2,
          sustain: 0
        }
      }).toDestination()

      audioInitializedRef.current = true
      console.log('Audio instruments initialized')
    } catch (error) {
      console.error('Failed to initialize audio:', error)
    }
  }, [])

  // Add a new note
  const addNote = useCallback(() => {
    const now = performance.now()
    const newNote: Note = {
      id: noteIdCounterRef.current++,
      timestamp: now,
      hit: false,
      missed: false
    }

    setState(prev => ({
      ...prev,
      notes: [...prev.notes, newNote]
    }))
  }, [])

  // Play beat sound
  const playBeat = useCallback((beatNumber: number) => {
    const now = Tone.now()

    if (beatNumber % 4 === 0) {
      // Kick on beats 1 and 3
      kickRef.current?.triggerAttackRelease('C1', '8n', now)
    } else if (beatNumber % 4 === 2) {
      // Snare on beats 2 and 4
      snareRef.current?.triggerAttackRelease('16n', now)
    } else {
      // Light kick on other beats
      kickRef.current?.triggerAttackRelease('C1', '16n', now, 0.3)
    }
  }, [])

  // Start the game
  const startGame = useCallback(async () => {
    await initAudio()

    console.log('Starting game...')

    // Reset state
    setState({
      score: 0,
      combo: 0,
      maxCombo: 0,
      isPlaying: true,
      gameOver: false,
      notes: [],
      perfectHits: 0,
      goodHits: 0,
      missedHits: 0
    })

    noteIdCounterRef.current = 0
    beatCountRef.current = 0
    gameStartTimeRef.current = performance.now()

    // Create beat loop
    loopRef.current = new Tone.Loop((time) => {
      const beatNumber = beatCountRef.current++

      // Play sound
      playBeat(beatNumber)

      // Add note for player to hit
      Tone.Draw.schedule(() => {
        addNote()
      }, time)

      // Check game duration
      const elapsed = performance.now() - gameStartTimeRef.current
      if (elapsed >= GAME_DURATION) {
        loopRef.current?.stop()
        Tone.Transport.stop()

        setState(prev => ({
          ...prev,
          isPlaying: false,
          gameOver: true
        }))
      }
    }, `${4}n`) // Quarter note

    loopRef.current.start(0)
    Tone.Transport.bpm.value = BPM
    Tone.Transport.start()

    console.log('Game loop started')
  }, [initAudio, addNote, playBeat])

  // Stop the game
  const stopGame = useCallback(() => {
    if (loopRef.current) {
      loopRef.current.stop()
      loopRef.current.dispose()
      loopRef.current = null
    }

    Tone.Transport.stop()

    setState(prev => ({
      ...prev,
      isPlaying: false,
      gameOver: true
    }))
  }, [])

  // Handle tap
  const onTap = useCallback(() => {
    if (!state.isPlaying || state.gameOver) {
      if (!state.isPlaying && !state.gameOver) {
        startGame()
      }
      return
    }

    const now = performance.now()

    // Find the closest unhit note
    const activeNotes = state.notes.filter(n => !n.hit && !n.missed)
    if (activeNotes.length === 0) {
      // Tap with no notes = combo breaker
      setState(prev => ({
        ...prev,
        combo: 0
      }))
      return
    }

    // Find closest note
    let closestNote = activeNotes[0]
    let minDiff = Math.abs((now - closestNote.timestamp) - 2000) // Notes travel for 2 seconds

    activeNotes.forEach(note => {
      const diff = Math.abs((now - note.timestamp) - 2000)
      if (diff < minDiff) {
        minDiff = diff
        closestNote = note
      }
    })

    const timingDiff = Math.abs((now - closestNote.timestamp) - 2000)

    if (timingDiff <= TAP_TOLERANCE) {
      // HIT!
      const points = timingDiff < 50 ? 100 : timingDiff < 100 ? 50 : 25
      const newCombo = state.combo + 1
      const comboMultiplier = Math.floor(newCombo / 5) + 1
      const totalPoints = points * comboMultiplier

      setState(prev => ({
        ...prev,
        score: prev.score + totalPoints,
        combo: newCombo,
        maxCombo: Math.max(prev.maxCombo, newCombo),
        perfectHits: timingDiff < 50 ? prev.perfectHits + 1 : prev.perfectHits,
        goodHits: timingDiff >= 50 ? prev.goodHits + 1 : prev.goodHits,
        notes: prev.notes.map(n =>
          n.id === closestNote.id ? { ...n, hit: true } : n
        )
      }))

      // Play hit sound
      const hitSynth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
      }).toDestination()

      const frequency = timingDiff < 50 ? 'C5' : 'E4'
      hitSynth.triggerAttackRelease(frequency, '16n')
      setTimeout(() => hitSynth.dispose(), 200)

      console.log(`HIT! Timing: ${timingDiff}ms, Points: ${totalPoints}, Combo: ${newCombo}`)
    } else {
      // MISS
      setState(prev => ({
        ...prev,
        combo: 0
      }))
      console.log('MISS! Too far from note')
    }
  }, [state.isPlaying, state.gameOver, state.combo, state.notes, startGame])

  // Clean up missed notes
  useEffect(() => {
    if (!state.isPlaying) return

    const interval = setInterval(() => {
      const now = performance.now()

      setState(prev => {
        const updatedNotes = prev.notes.map(note => {
          // If note is older than 2.2 seconds and not hit, mark as missed
          if (!note.hit && !note.missed && (now - note.timestamp) > 2200) {
            return { ...note, missed: true }
          }
          return note
        })

        const newMissCount = updatedNotes.filter(n => n.missed).length - prev.notes.filter(n => n.missed).length

        return {
          ...prev,
          notes: updatedNotes.filter(n => (now - n.timestamp) < 3000), // Remove old notes
          missedHits: newMissCount > 0 ? prev.missedHits + newMissCount : prev.missedHits,
          combo: newMissCount > 0 ? 0 : prev.combo
        }
      })
    }, 50)

    return () => clearInterval(interval)
  }, [state.isPlaying])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loopRef.current) {
        loopRef.current.stop()
        loopRef.current.dispose()
      }
      Tone.Transport.stop()
    }
  }, [])

  return {
    ...state,
    onTap,
    startGame,
    stopGame,
    currentTime: state.isPlaying ? performance.now() : 0
  }
}
