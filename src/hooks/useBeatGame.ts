import { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'
import { repl } from '@strudel/core'

const GAME_DURATION = 60000 // 60 seconds per level
const TAP_TOLERANCE = 200 // ±200ms for perfect hit (more forgiving)
const BASE_BPM = 95 // Slower, more manageable tempo

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
  level: number
  musicStyle: string
}

type MusicStyle = 'techno' | 'hiphop' | 'ambient' | 'funk' | 'dnb'

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
    missedHits: 0,
    level: 1,
    musicStyle: 'techno'
  })

  const audioInitializedRef = useRef(false)
  const gameStartTimeRef = useRef<number>(0)
  const noteIdCounterRef = useRef(0)
  const loopRef = useRef<Tone.Loop | null>(null)
  const lastTapTimeRef = useRef<number>(0)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const strudelRef = useRef<any>(null)

  // Only keep hit feedback synth - Strudel will handle music
  const hitSynthRef = useRef<Tone.Synth | null>(null)

  // Get Strudel pattern based on music style
  const getMusicPattern = useCallback((style: MusicStyle) => {
    switch (style) {
      case 'techno':
        return `
          stack(
            s("bd:3").every(4, x => x.fast(2)),
            s("~ hh:2 ~ hh:2").gain(0.5),
            s("~ ~ sd:4 ~").gain(0.7),
            note("c2 ~ g1 ~").s("sawtooth").lpf(800).room(0.5)
          ).cpm(${BASE_BPM})
        `
      case 'hiphop':
        return `
          stack(
            s("bd:5 ~ ~ bd:5 ~ bd:5 ~ ~"),
            s("~ ~ sd:8 ~").gain(0.8),
            s("~ hh:3 ~ hh:3").gain(0.4),
            note("<c3 eb3 f3 g3>").s("triangle").lpf(1200).delay(0.25).room(0.3)
          ).cpm(${BASE_BPM})
        `
      case 'ambient':
        return `
          stack(
            s("bd:1 ~ ~ ~ ~ ~ ~ ~").gain(0.5),
            note("<a2 c3 e3 g3>/4").s("sine").lpf(600).delay(0.5).room(0.9).gain(0.6),
            note("<e4 g4 a4 c5>/8").s("triangle").delay(0.375).room(0.8).gain(0.4)
          ).cpm(${BASE_BPM * 0.7})
        `
      case 'funk':
        return `
          stack(
            s("bd:6 ~ bd:6 ~ ~ bd:6 ~ ~"),
            s("~ ~ sd:6 ~ ~ sd:6 ~ ~").gain(0.7),
            s("~ hh:5 ~ hh:5 ~ hh:5 ~ hh:5").gain(0.5),
            note("<c3 d3 f3 g3>*2").s("sawtooth").lpf(1000).room(0.4)
          ).cpm(${BASE_BPM * 1.1})
        `
      case 'dnb':
        return `
          stack(
            s("bd:4 ~ ~ ~ bd:4 ~ ~ ~"),
            s("~ sd:7 ~ sd:7 ~ sd:7 sd:7 ~").gain(0.6).fast(2),
            s("hh:6*8").gain(0.4),
            note("<d2 f2 a2 c3>/2").s("sawtooth").lpf(900).room(0.5)
          ).cpm(${BASE_BPM * 1.6})
        `
    }
  }, [])

  // Initialize audio
  const initAudio = useCallback(async () => {
    if (audioInitializedRef.current) return

    try {
      console.log('🔊 Initializing audio...')
      await Tone.start()

      // Set master volume
      Tone.getDestination().volume.value = -3 // Slightly quieter than before

      // Initialize Strudel
      console.log('🎹 Initializing Strudel...')
      strudelRef.current = repl()

      // Create hit feedback synth
      hitSynthRef.current = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.15 }
      }).toDestination()
      hitSynthRef.current.volume.value = 0

      audioInitializedRef.current = true
      console.log('✅ Audio initialized!')
    } catch (error) {
      console.error('❌ Failed to initialize audio:', error)
    }
  }, [getMusicPattern])

  // Get note types based on level difficulty
  const getNoteTypesForLevel = useCallback((level: number): NoteType[] => {
    if (level === 1) return [NoteType.TAP]
    if (level === 2) return [NoteType.TAP, NoteType.SWIPE_LEFT, NoteType.SWIPE_RIGHT]
    if (level === 3) return [NoteType.TAP, NoteType.DOUBLE_TAP, NoteType.SWIPE_LEFT, NoteType.SWIPE_RIGHT, NoteType.SWIPE_UP, NoteType.SWIPE_DOWN]
    return [NoteType.TAP, NoteType.DOUBLE_TAP, NoteType.SWIPE_LEFT, NoteType.SWIPE_RIGHT, NoteType.SWIPE_UP, NoteType.SWIPE_DOWN]
  }, [])

  // Get random music style
  const getRandomMusicStyle = useCallback((): MusicStyle => {
    const styles: MusicStyle[] = ['techno', 'hiphop', 'ambient', 'funk', 'dnb']
    return styles[Math.floor(Math.random() * styles.length)]
  }, [])

  // Start the game
  const startGame = useCallback(async (level: number = 1) => {
    console.log(`🎮 Starting game Level ${level}...`)
    await initAudio()

    const musicStyle = getRandomMusicStyle()
    const allowedNoteTypes = getNoteTypesForLevel(level)

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
      missedHits: 0,
      level,
      musicStyle
    })

    noteIdCounterRef.current = 0
    gameStartTimeRef.current = performance.now()

    // Start Strudel music in background
    try {
      const pattern = getMusicPattern(musicStyle)
      console.log('🎵 Starting Strudel pattern:', musicStyle)
      await strudelRef.current?.evaluate(pattern)
    } catch (error) {
      console.error('❌ Failed to start Strudel:', error)
    }

    let beatCount = 0
    // Spawn interval based on level: Level 1 = every 8 beats, Level 2 = every 6, Level 3+ = every 4
    const spawnInterval = level === 1 ? 8 : level === 2 ? 6 : 4

    // Create note spawning loop - only spawn on certain beats
    loopRef.current = new Tone.Loop((time) => {
      beatCount++

      // Only spawn a note every N beats
      if (beatCount % spawnInterval === 0) {
        const noteType = allowedNoteTypes[Math.floor(Math.random() * allowedNoteTypes.length)]

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
          console.log(`📍 Note spawned: ${noteType}`)
        }, time)
      }

      // Check game duration
      const elapsed = performance.now() - gameStartTimeRef.current
      if (elapsed >= GAME_DURATION) {
        loopRef.current?.stop()
        Tone.Transport.stop()

        // Stop Strudel
        try {
          strudelRef.current?.scheduler?.stop()
        } catch (error) {
          console.error('Error stopping Strudel:', error)
        }

        setState(prev => ({
          ...prev,
          isPlaying: false,
          gameOver: true
        }))
      }
    }, `8n`) // Eighth note beat

    loopRef.current.start(0)
    Tone.Transport.bpm.value = BASE_BPM
    Tone.Transport.start()

    console.log(`✅ Game started - Level ${level}, Style: ${musicStyle}, BPM: ${BASE_BPM}`)
  }, [initAudio, getMusicPattern, getRandomMusicStyle, getNoteTypesForLevel])

  // Stop the game
  const stopGame = useCallback(() => {
    if (loopRef.current) {
      loopRef.current.stop()
      loopRef.current.dispose()
      loopRef.current = null
    }

    Tone.Transport.stop()

    // Stop Strudel
    try {
      strudelRef.current?.scheduler?.stop()
    } catch (error) {
      console.error('Error stopping Strudel:', error)
    }

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

    // Find closest note (notes take 3.5 seconds to reach target)
    const NOTE_TRAVEL_TIME = 3500
    let closestNote = activeNotes[0]
    let minDiff = Math.abs((now - closestNote.timestamp) - NOTE_TRAVEL_TIME)

    activeNotes.forEach(note => {
      const diff = Math.abs((now - note.timestamp) - NOTE_TRAVEL_TIME)
      if (diff < minDiff) {
        minDiff = diff
        closestNote = note
      }
    })

    const timingDiff = Math.abs((now - closestNote.timestamp) - NOTE_TRAVEL_TIME)

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

      // Play hit feedback sound
      const frequency = timingDiff < 50 ? 'C6' : timingDiff < 100 ? 'A5' : 'E5'
      hitSynthRef.current?.triggerAttackRelease(frequency, '16n')

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

    const NOTE_TRAVEL_TIME = 3500
    const MISS_THRESHOLD = NOTE_TRAVEL_TIME + 200
    const CLEANUP_THRESHOLD = NOTE_TRAVEL_TIME + 1000

    const interval = setInterval(() => {
      const now = performance.now()

      setState(prev => {
        const updatedNotes = prev.notes.map(note => {
          if (!note.hit && !note.missed && (now - note.timestamp) > MISS_THRESHOLD) {
            return { ...note, missed: true }
          }
          return note
        })

        const newMissCount = updatedNotes.filter(n => n.missed).length - prev.notes.filter(n => n.missed).length

        return {
          ...prev,
          notes: updatedNotes.filter(n => (now - n.timestamp) < CLEANUP_THRESHOLD),
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
