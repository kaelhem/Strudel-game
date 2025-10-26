import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import type { Note } from '../hooks/useBeatGame'
import { NoteType } from '../hooks/useBeatGame'

interface FallingNotesProps {
  notes: Note[]
  currentTime: number
}

const NOTE_TRAVEL_TIME = 3500 // 3.5 seconds to reach target (slower, more playable)
const TARGET_Z = 0
const START_Z = -15 // Start further away for longer travel

function NoteCircle({ note, currentTime }: { note: Note; currentTime: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const textRef = useRef<THREE.Mesh>(null)
  const elapsed = currentTime - note.timestamp

  useFrame(() => {
    if (!meshRef.current) return

    // Calculate position based on time
    const progress = Math.min(elapsed / NOTE_TRAVEL_TIME, 1)
    const z = START_Z + (TARGET_Z - START_Z) * progress

    meshRef.current.position.z = z
    if (textRef.current) textRef.current.position.z = z + 0.1

    // Scale animation
    if (note.hit) {
      const hitProgress = Math.min((elapsed - NOTE_TRAVEL_TIME) / 200, 1)
      const scale = 1 + hitProgress * 3
      meshRef.current.scale.setScalar(scale * (1 - hitProgress))
      if (textRef.current) textRef.current.scale.setScalar(scale * (1 - hitProgress))
    } else {
      // Pulse slightly
      const pulse = 1 + Math.sin(elapsed * 0.01) * 0.1
      meshRef.current.scale.setScalar(pulse)
      if (textRef.current) textRef.current.scale.setScalar(pulse)
    }

    // Opacity
    if (note.hit || note.missed) {
      const fadeProgress = Math.min((elapsed - NOTE_TRAVEL_TIME) / 300, 1)
      const material = meshRef.current.material as THREE.MeshStandardMaterial
      material.opacity = 1 - fadeProgress
    }
  })

  const getColor = () => {
    if (note.hit) return '#00ff00'
    if (note.missed) return '#ff0000'

    switch (note.type) {
      case NoteType.TAP:
        return '#ff006e'
      case NoteType.DOUBLE_TAP:
        return '#ff8500'
      case NoteType.SWIPE_LEFT:
        return '#00d4ff'
      case NoteType.SWIPE_RIGHT:
        return '#00ff88'
      case NoteType.SWIPE_UP:
        return '#ffbe0b'
      case NoteType.SWIPE_DOWN:
        return '#8338ec'
      default:
        return '#00d4ff'
    }
  }

  const getIcon = () => {
    switch (note.type) {
      case NoteType.TAP:
        return 'TAP'
      case NoteType.DOUBLE_TAP:
        return 'x2'
      case NoteType.SWIPE_LEFT:
        return '<'
      case NoteType.SWIPE_RIGHT:
        return '>'
      case NoteType.SWIPE_UP:
        return '^'
      case NoteType.SWIPE_DOWN:
        return 'v'
      default:
        return 'TAP'
    }
  }

  return (
    <group>
      <mesh ref={meshRef} position={[0, 0, START_Z]}>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshStandardMaterial
          color={getColor()}
          emissive={getColor()}
          emissiveIntensity={note.hit ? 2 : note.missed ? 0.2 : 0.8}
          transparent
          opacity={1}
        />
      </mesh>
      <Text
        ref={textRef}
        position={[0, 0, START_Z + 0.1]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {getIcon()}
      </Text>
    </group>
  )
}

export function FallingNotes({ notes, currentTime }: FallingNotesProps) {
  return (
    <>
      {/* Target zone */}
      <mesh position={[0, 0, TARGET_Z]}>
        <ringGeometry args={[1.2, 1.5, 32]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Falling notes */}
      {notes.map(note => (
        <NoteCircle key={note.id} note={note} currentTime={currentTime} />
      ))}
    </>
  )
}
