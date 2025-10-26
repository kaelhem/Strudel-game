import { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'

const GAME_DURATION = 60000 // 60 seconds per level
const TAP_TOLERANCE = 200 // ±200ms for perfect hit (more forgiving)
const BASE_BPM = 110 // Good rhythm tempo

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
  const musicPartsRef = useRef<Tone.Part[]>([])

  // Audio instruments
  const synthRef = useRef<Tone.PolySynth | null>(null)
  const bassRef = useRef<Tone.MonoSynth | null>(null)
  const kickRef = useRef<Tone.MembraneSynth | null>(null)
  const snareRef = useRef<Tone.NoiseSynth | null>(null)
  const hihatRef = useRef<Tone.MetalSynth | null>(null)
  const hitSynthRef = useRef<Tone.Synth | null>(null)

  // Create music sequences based on style
  const createMusicSequences = useCallback((style: MusicStyle) => {
    const sequences: any = { drums: [], bass: [], melody: [] }

    switch (style) {
      case 'techno':
        // 4-on-floor kick
        sequences.drums = [[0, 'kick'], [1, 'hihat'], [2, 'kick'], [2, 'snare'], [3, 'hihat']]
        // Pulsing bass
        sequences.bass = [[0, 'C2'], [2, 'G1'], [2.5, 'C2']]
        // Arpeggiated melody
        sequences.melody = [[0, 'C4'], [0.5, 'E4'], [1, 'G4'], [1.5, 'C5'], [2, 'G4'], [2.5, 'E4'], [3, 'C4'], [3.5, 'G3']]
        break

      case 'hiphop':
        // Hip-hop beat
        sequences.drums = [[0, 'kick'], [1, 'snare'], [1.5, 'hihat'], [2, 'kick'], [2.5, 'kick'], [3, 'snare'], [3.75, 'hihat']]
        // Low bass
        sequences.bass = [[0, 'C2'], [2, 'F1'], [2.5, 'G1']]
        // Sparse melody
        sequences.melody = [[0, 'C4'], [1.5, 'Eb4'], [2.5, 'F4'], [3, 'G4']]
        break

      case 'ambient':
        // Sparse drums
        sequences.drums = [[0, 'kick']]
        // Slow evolving bass
        sequences.bass = [[0, 'A1'], [1, 'C2'], [2, 'E2'], [3, 'G2']]
        // Ethereal melody
        sequences.melody = [[0, 'E4'], [1, 'G4'], [2, 'A4'], [3, 'C5']]
        break

      case 'funk':
        // Funky syncopated drums
        sequences.drums = [[0, 'kick'], [0.75, 'hihat'], [1, 'snare'], [1.5, 'hihat'], [2, 'kick'], [2.5, 'kick'], [3, 'snare'], [3.75, 'hihat']]
        // Funky bass
        sequences.bass = [[0, 'C2'], [0.5, 'C2'], [1, 'D2'], [2, 'F2'], [2.75, 'G2']]
        // Staccato melody
        sequences.melody = [[0, 'C4'], [0.5, 'D4'], [1, 'F4'], [2, 'G4'], [2.5, 'F4']]
        break

      case 'dnb':
        // Fast breakbeat
        sequences.drums = [[0, 'kick'], [0.5, 'snare'], [0.75, 'hihat'], [1, 'snare'], [1.25, 'hihat'], [1.5, 'kick'], [2, 'snare'], [2.5, 'hihat'], [3, 'snare'], [3.75, 'hihat']]
        // Wobbling bass
        sequences.bass = [[0, 'D2'], [0.5, 'F2'], [1, 'A2'], [1.5, 'D2'], [2, 'C2']]
        // Fast melody
        sequences.melody = [[0, 'D4'], [0.25, 'F4'], [0.5, 'A4'], [1, 'C5'], [1.5, 'A4'], [2, 'F4']]
        break
    }

    return sequences
  }, [])

  // Initialize audio
  const initAudio = useCallback(async () => {
    if (audioInitializedRef.current) return

    try {
      console.log('🔊 Initializing Tone.js...')
      await Tone.start()

      // Set master volume
      Tone.getDestination().volume.value = -6

      // Reverb and delay for ambience
      const reverb = new Tone.Reverb({ decay: 2.5, wet: 0.3 }).toDestination()
      const delay = new Tone.FeedbackDelay({ delayTime: 0.25, feedback: 0.3, wet: 0.2 }).connect(reverb)

      // Melody synth with effects
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.8 }
      }).connect(delay)
      synthRef.current.volume.value = -8

      // Bass synth
      bassRef.current = new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.8 },
        filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.5, baseFrequency: 200, octaves: 3 }
      }).toDestination()
      bassRef.current.volume.value = -8

      // Kick
      kickRef.current = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 10,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
      }).toDestination()
      kickRef.current.volume.value = 0

      // Snare
      snareRef.current = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
      }).toDestination()
      snareRef.current.volume.value = -6

      // Hi-hat
      hihatRef.current = new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5
      }).toDestination()
      hihatRef.current.volume.value = -10

      // Hit feedback synth
      hitSynthRef.current = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.15 }
      }).toDestination()
      hitSynthRef.current.volume.value = 3

      audioInitializedRef.current = true
      console.log('✅ Audio initialized!')
    } catch (error) {
      console.error('❌ Failed to initialize audio:', error)
    }
  }, [])

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

    // Start music sequences
    const sequences = createMusicSequences(musicStyle)
    console.log('🎵 Starting music:', musicStyle)

    // Drum part
    const drumPart = new Tone.Part((time, value) => {
      if (value === 'kick') kickRef.current?.triggerAttackRelease('C1', '8n', time)
      if (value === 'snare') snareRef.current?.triggerAttackRelease('16n', time)
      if (value === 'hihat') hihatRef.current?.triggerAttackRelease(400, '32n', time)
    }, sequences.drums).start(0)
    drumPart.loop = true
    drumPart.loopEnd = '1m'

    // Bass part
    const bassPart = new Tone.Part((time, note) => {
      bassRef.current?.triggerAttackRelease(note, '8n', time)
    }, sequences.bass).start(0)
    bassPart.loop = true
    bassPart.loopEnd = '1m'

    // Melody part
    const melodyPart = new Tone.Part((time, note) => {
      synthRef.current?.triggerAttackRelease(note, '16n', time)
    }, sequences.melody).start(0)
    melodyPart.loop = true
    melodyPart.loopEnd = '1m'

    musicPartsRef.current = [drumPart, bassPart, melodyPart]

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

        // Stop music parts
        musicPartsRef.current.forEach(part => {
          part.stop()
          part.dispose()
        })
        musicPartsRef.current = []

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
  }, [initAudio, createMusicSequences, getRandomMusicStyle, getNoteTypesForLevel])

  // Stop the game
  const stopGame = useCallback(() => {
    if (loopRef.current) {
      loopRef.current.stop()
      loopRef.current.dispose()
      loopRef.current = null
    }

    Tone.Transport.stop()

    // Stop music parts
    musicPartsRef.current.forEach(part => {
      part.stop()
      part.dispose()
    })
    musicPartsRef.current = []

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
