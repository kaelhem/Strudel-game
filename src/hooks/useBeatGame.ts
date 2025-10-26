import { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'

const GAME_DURATION = 45000 // 45 seconds
const TAP_TOLERANCE = 150 // ±150ms for perfect hit
const BPM = 110

export enum NoteType {
  TAP = 'TAP',
  DOUBLE_TAP = 'DOUBLE_TAP',
  SWIPE_LEFT = 'SWIPE_LEFT',
  SWIPE_RIGHT = 'SWIPE_RIGHT',
  SWIPE_UP = 'SWIPE_UP',
  SWIPE_DOWN = 'SWIPE_DOWN'
}

export interface Note {
  id: number
  timestamp: number
  type: NoteType
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
  const lastTapTimeRef = useRef<number>(0)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  // Audio instruments
  const kickRef = useRef<Tone.MembraneSynth | null>(null)
  const snareRef = useRef<Tone.NoiseSynth | null>(null)
  const clapRef = useRef<Tone.NoiseSynth | null>(null)
  const hihatRef = useRef<Tone.MetalSynth | null>(null)

  // Initialize audio with LOUD sounds
  const initAudio = useCallback(async () => {
    if (audioInitializedRef.current) return

    try {
      console.log('🔊 Initializing Tone.js...')
      await Tone.start()

      // Set master volume
      Tone.getDestination().volume.value = 0 // 0 dB = loud!

      console.log('🔊 Creating instruments...')

      // Kick drum - LOUD
      kickRef.current = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 10,
        oscillator: { type: 'sine' },
        envelope: {
          attack: 0.001,
          decay: 0.4,
          sustain: 0.01,
          release: 1.4
        }
      }).toDestination()
      kickRef.current.volume.value = 6 // Extra loud

      // Snare drum - LOUD
      snareRef.current = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: {
          attack: 0.001,
          decay: 0.2,
          sustain: 0
        }
      }).toDestination()
      snareRef.current.volume.value = 3

      // Clap - LOUD
      clapRef.current = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: {
          attack: 0.001,
          decay: 0.15,
          sustain: 0
        }
      }).toDestination()
      clapRef.current.volume.value = 3

      // Hi-hat - LOUD
      hihatRef.current = new Tone.MetalSynth({
        envelope: {
          attack: 0.001,
          decay: 0.1,
          release: 0.01
        },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5
      }).toDestination()
      hihatRef.current.volume.value = 0

      audioInitializedRef.current = true

      // PLAY A TEST SOUND immediately
      console.log('🔊 Playing test sounds...')
      kickRef.current.triggerAttackRelease('C1', '8n')

      setTimeout(() => {
        snareRef.current?.triggerAttackRelease('8n')
      }, 250)

      setTimeout(() => {
        hihatRef.current?.triggerAttackRelease(200, '16n')
      }, 500)

      console.log('✅ Audio initialized and test played!')
    } catch (error) {
      console.error('❌ Failed to initialize audio:', error)
    }
  }, [])

  // Play beat sound based on note type
  const playBeat = useCallback((noteType: NoteType) => {
    const now = Tone.now()

    console.log(`🎵 Playing sound for ${noteType}`)

    switch (noteType) {
      case NoteType.TAP:
        kickRef.current?.triggerAttackRelease('C1', '8n', now)
        break
      case NoteType.DOUBLE_TAP:
        kickRef.current?.triggerAttackRelease('C1', '16n', now)
        setTimeout(() => {
          kickRef.current?.triggerAttackRelease('C1', '16n', Tone.now())
        }, 100)
        break
      case NoteType.SWIPE_LEFT:
        snareRef.current?.triggerAttackRelease('16n', now)
        break
      case NoteType.SWIPE_RIGHT:
        clapRef.current?.triggerAttackRelease('16n', now)
        break
      case NoteType.SWIPE_UP:
        hihatRef.current?.triggerAttackRelease(200, '32n', now)
        break
      case NoteType.SWIPE_DOWN:
        snareRef.current?.triggerAttackRelease('8n', now)
        break
    }
  }, [])

  // Create varied beat pattern
  const createBeatPattern = useCallback(() => {
    // Pattern: not every beat, varied rhythm
    const pattern = [
      NoteType.TAP,
      null,
      NoteType.SWIPE_LEFT,
      null,
      NoteType.TAP,
      NoteType.DOUBLE_TAP,
      null,
      NoteType.SWIPE_RIGHT,
      null,
      null,
      NoteType.SWIPE_UP,
      null,
      NoteType.TAP,
      null,
      NoteType.SWIPE_DOWN,
      null
    ]

    return pattern
  }, [])

  // Start the game
  const startGame = useCallback(async () => {
    console.log('🎮 Starting game...')
    await initAudio()

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
    gameStartTimeRef.current = performance.now()

    const pattern = createBeatPattern()
    let beatIndex = 0

    // Create beat loop with VARIED pattern
    loopRef.current = new Tone.Loop((time) => {
      const noteType = pattern[beatIndex % pattern.length]
      beatIndex++

      if (noteType !== null) {
        // Play sound
        Tone.Draw.schedule(() => {
          playBeat(noteType)
        }, time)

        // Add note for player to hit
        Tone.Draw.schedule(() => {
          const now = performance.now()
          const newNote: Note = {
            id: noteIdCounterRef.current++,
            timestamp: now,
            type: noteType,
            hit: false,
            missed: false
          }
          setState(prev => ({
            ...prev,
            notes: [...prev.notes, newNote]
          }))
        }, time)
      }

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
    }, `8n`) // Eighth note

    loopRef.current.start(0)
    Tone.Transport.bpm.value = BPM
    Tone.Transport.start()

    console.log('✅ Game loop started at', BPM, 'BPM')
  }, [initAudio, createBeatPattern, playBeat])

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

  // Detect gesture type
  const detectGesture = useCallback((endX: number, endY: number): NoteType | null => {
    if (!touchStartRef.current) return NoteType.TAP

    const dx = endX - touchStartRef.current.x
    const dy = endY - touchStartRef.current.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // If movement is small, it's a tap
    if (distance < 50) {
      const now = performance.now()
      const timeSinceLastTap = now - lastTapTimeRef.current
      lastTapTimeRef.current = now

      // Double tap detection
      if (timeSinceLastTap < 300) {
        return NoteType.DOUBLE_TAP
      }
      return NoteType.TAP
    }

    // Swipe detection
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)

    if (Math.abs(angle) < 45) return NoteType.SWIPE_RIGHT
    if (Math.abs(angle) > 135) return NoteType.SWIPE_LEFT
    if (angle > 45 && angle < 135) return NoteType.SWIPE_DOWN
    if (angle < -45 && angle > -135) return NoteType.SWIPE_UP

    return NoteType.TAP
  }, [])

  // Handle touch start
  const onTouchStart = useCallback((x: number, y: number) => {
    touchStartRef.current = { x, y }
  }, [])

  // Handle touch end / tap
  const onTouchEnd = useCallback((x: number, y: number) => {
    if (!state.isPlaying || state.gameOver) {
      touchStartRef.current = null
      return
    }

    const gesture = detectGesture(x, y)
    touchStartRef.current = null

    if (!gesture) return

    const now = performance.now()

    // Find the closest unhit note of the correct type
    const activeNotes = state.notes.filter(n => !n.hit && !n.missed && n.type === gesture)

    if (activeNotes.length === 0) {
      // Wrong gesture = combo breaker
      setState(prev => ({ ...prev, combo: 0 }))
      console.log('❌ Wrong gesture or no notes')
      return
    }

    // Find closest note
    let closestNote = activeNotes[0]
    let minDiff = Math.abs((now - closestNote.timestamp) - 2000)

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

      const frequency = timingDiff < 50 ? 'C6' : 'E5'
      hitSynth.triggerAttackRelease(frequency, '16n')
      setTimeout(() => hitSynth.dispose(), 200)

      console.log(`✅ HIT ${gesture}! Timing: ${timingDiff}ms, Points: ${totalPoints}`)
    } else {
      // MISS
      setState(prev => ({ ...prev, combo: 0 }))
      console.log('❌ MISS! Too far from note')
    }
  }, [state.isPlaying, state.gameOver, state.combo, state.notes, detectGesture])

  // Clean up missed notes
  useEffect(() => {
    if (!state.isPlaying) return

    const interval = setInterval(() => {
      const now = performance.now()

      setState(prev => {
        const updatedNotes = prev.notes.map(note => {
          if (!note.hit && !note.missed && (now - note.timestamp) > 2200) {
            return { ...note, missed: true }
          }
          return note
        })

        const newMissCount = updatedNotes.filter(n => n.missed).length - prev.notes.filter(n => n.missed).length

        return {
          ...prev,
          notes: updatedNotes.filter(n => (now - n.timestamp) < 3000),
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
    onTouchStart,
    onTouchEnd,
    startGame,
    stopGame,
    currentTime: state.isPlaying ? performance.now() : 0
  }
}
