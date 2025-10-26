import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'

interface BeatSphereProps {
  beatActive: boolean
  combo: number
}

export function BeatSphere({ beatActive, combo }: BeatSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const targetScale = useRef(1)
  const currentScale = useRef(1)

  useFrame((state, delta) => {
    if (!meshRef.current) return

    // Pulse effect when beat is active
    targetScale.current = beatActive ? 1.5 : 1.0

    // Smooth scale interpolation
    currentScale.current += (targetScale.current - currentScale.current) * delta * 10
    meshRef.current.scale.setScalar(currentScale.current)

    // Gentle rotation
    meshRef.current.rotation.y += delta * 0.2
    meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1

    // Increase distortion with combo
    const material = meshRef.current.material as any
    if (material.distort !== undefined) {
      material.distort = 0.3 + (combo * 0.02)
    }
  })

  // Color based on combo level
  const getColor = () => {
    if (combo >= 15) return '#ff006e'
    if (combo >= 10) return '#fb5607'
    if (combo >= 5) return '#ffbe0b'
    return '#8338ec'
  }

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <MeshDistortMaterial
        color={getColor()}
        emissive={getColor()}
        emissiveIntensity={beatActive ? 1.5 : 0.3}
        distort={0.3}
        speed={2}
        roughness={0.4}
        metalness={0.8}
      />
    </mesh>
  )
}
