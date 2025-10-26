import { useRef, useMemo } from 'react'
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
  const groupRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const trailPointsRef = useRef<THREE.Points>(null)
  const textRef = useRef<THREE.Mesh>(null)
  const elapsed = currentTime - note.timestamp

  // Create trail particles
  const trailParticles = useMemo(() => {
    const count = 20
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = -i * 0.5
      sizes[i] = (count - i) / count * 2
    }

    return { positions, sizes, count }
  }, [])

  useFrame(() => {
    if (!groupRef.current) return

    // Calculate position based on time
    const progress = Math.min(elapsed / NOTE_TRAVEL_TIME, 1)
    const z = START_Z + (TARGET_Z - START_Z) * progress

    groupRef.current.position.z = z

    // Rotation based on note type
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.05
    }

    // Scale animation
    if (note.hit) {
      const hitProgress = Math.min((elapsed - NOTE_TRAVEL_TIME) / 200, 1)
      const scale = 1 + hitProgress * 4
      const fade = 1 - hitProgress
      groupRef.current.scale.setScalar(scale * fade)

      // Explosion effect
      if (glowRef.current) {
        const material = glowRef.current.material as THREE.MeshBasicMaterial
        material.opacity = fade * 0.8
      }
    } else if (note.missed) {
      const fadeProgress = Math.min((elapsed - NOTE_TRAVEL_TIME) / 300, 1)
      groupRef.current.scale.setScalar(1 - fadeProgress * 0.5)
      if (glowRef.current) {
        const material = glowRef.current.material as THREE.MeshBasicMaterial
        material.opacity = 0.2 * (1 - fadeProgress)
      }
    } else {
      // Pulse and breathe
      const pulse = 1 + Math.sin(elapsed * 0.008) * 0.1
      const grow = 1 + progress * 0.3
      groupRef.current.scale.setScalar(pulse * grow)

      // Glow intensity pulsing
      if (glowRef.current) {
        const material = glowRef.current.material as THREE.MeshBasicMaterial
        material.opacity = 0.3 + Math.sin(elapsed * 0.01) * 0.2
      }
    }

    // Update trail
    if (trailPointsRef.current && !note.hit && !note.missed) {
      const positions = trailPointsRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < trailParticles.count; i++) {
        positions[i * 3 + 2] = -i * 0.3 - elapsed * 0.01
      }
      trailPointsRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  const getColor = () => {
    if (note.hit) return new THREE.Color('#00ff88')
    if (note.missed) return new THREE.Color('#ff0044')

    switch (note.type) {
      case NoteType.TAP:
        return new THREE.Color('#ff006e')
      case NoteType.DOUBLE_TAP:
        return new THREE.Color('#ff8500')
      case NoteType.SWIPE_LEFT:
        return new THREE.Color('#00d4ff')
      case NoteType.SWIPE_RIGHT:
        return new THREE.Color('#00ff88')
      case NoteType.SWIPE_UP:
        return new THREE.Color('#ffbe0b')
      case NoteType.SWIPE_DOWN:
        return new THREE.Color('#8338ec')
      default:
        return new THREE.Color('#00d4ff')
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

  const color = getColor()

  return (
    <group ref={groupRef} position={[0, 0, START_Z]}>
      {/* Outer glow */}
      <mesh ref={glowRef}>
        <ringGeometry args={[1.2, 1.8, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Main ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[0.7, 1, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner fill */}
      <mesh position={[0, 0, -0.01]}>
        <circleGeometry args={[0.7, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.2}
        />
      </mesh>

      {/* Trail particles */}
      {!note.hit && !note.missed && (
        <points ref={trailPointsRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={trailParticles.count}
              array={trailParticles.positions}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-size"
              count={trailParticles.count}
              array={trailParticles.sizes}
              itemSize={1}
            />
          </bufferGeometry>
          <pointsMaterial
            size={1}
            color={color}
            transparent
            opacity={0.6}
            sizeAttenuation
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      )}

      {/* Text */}
      <Text
        ref={textRef}
        position={[0, 0, 0.1]}
        fontSize={0.4}
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

function TargetZone() {
  const ring1Ref = useRef<THREE.Mesh>(null)
  const ring2Ref = useRef<THREE.Mesh>(null)
  const ring3Ref = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (ring1Ref.current) ring1Ref.current.rotation.z += 0.02
    if (ring2Ref.current) ring2Ref.current.rotation.z -= 0.015
    if (ring3Ref.current) ring3Ref.current.rotation.z += 0.01
  })

  return (
    <group position={[0, 0, TARGET_Z]}>
      {/* Outer pulsing ring */}
      <mesh ref={ring1Ref}>
        <ringGeometry args={[1.8, 2.2, 32]} />
        <meshBasicMaterial
          color="#ff00ff"
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Middle ring */}
      <mesh ref={ring2Ref}>
        <ringGeometry args={[1.3, 1.6, 32]} />
        <meshBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner target ring */}
      <mesh ref={ring3Ref}>
        <ringGeometry args={[0.9, 1.1, 32]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Center dot */}
      <mesh>
        <circleGeometry args={[0.1, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  )
}

export function FallingNotes({ notes, currentTime }: FallingNotesProps) {
  return (
    <>
      <TargetZone />

      {/* Falling notes */}
      {notes.map(note => (
        <NoteCircle key={note.id} note={note} currentTime={currentTime} />
      ))}
    </>
  )
}
