import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Note } from '../hooks/useBeatGame'

interface FallingNotesProps {
  notes: Note[]
  currentTime: number
}

const NOTE_TRAVEL_TIME = 2000 // 2 seconds to reach target
const TARGET_Z = 0
const START_Z = -10

function NoteCircle({ note, currentTime }: { note: Note; currentTime: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const elapsed = currentTime - note.timestamp

  useFrame(() => {
    if (!meshRef.current) return

    // Calculate position based on time
    const progress = Math.min(elapsed / NOTE_TRAVEL_TIME, 1)
    const z = START_Z + (TARGET_Z - START_Z) * progress

    meshRef.current.position.z = z

    // Scale animation
    if (note.hit) {
      const hitProgress = Math.min((elapsed - NOTE_TRAVEL_TIME) / 200, 1)
      const scale = 1 + hitProgress * 2
      meshRef.current.scale.setScalar(scale * (1 - hitProgress))
    } else {
      // Pulse slightly
      const pulse = 1 + Math.sin(elapsed * 0.01) * 0.1
      meshRef.current.scale.setScalar(pulse)
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
    return '#00d4ff'
  }

  return (
    <mesh ref={meshRef} position={[0, 0, START_Z]}>
      <ringGeometry args={[0.8, 1, 32]} />
      <meshStandardMaterial
        color={getColor()}
        emissive={getColor()}
        emissiveIntensity={note.hit ? 2 : 0.5}
        transparent
        opacity={1}
      />
    </mesh>
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
          emissiveIntensity={0.3}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Falling notes */}
      {notes.map(note => (
        <NoteCircle key={note.id} note={note} currentTime={currentTime} />
      ))}
    </>
  )
}
