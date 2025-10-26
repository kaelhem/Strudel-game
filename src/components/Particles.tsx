import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function Particles({ count = 1000, combo }: { count?: number; combo: number }) {
  const pointsRef = useRef<THREE.Points>(null)

  const [positions, colors, sizes] = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // Random position in a tunnel
      const angle = Math.random() * Math.PI * 2
      const radius = 10 + Math.random() * 5
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = Math.sin(angle) * radius
      positions[i * 3 + 2] = -Math.random() * 50

      // Random colors (cyan, magenta, yellow)
      const colorChoice = Math.random()
      if (colorChoice < 0.33) {
        colors[i * 3] = 0
        colors[i * 3 + 1] = 0.8
        colors[i * 3 + 2] = 1
      } else if (colorChoice < 0.66) {
        colors[i * 3] = 1
        colors[i * 3 + 1] = 0
        colors[i * 3 + 2] = 0.4
      } else {
        colors[i * 3] = 0.5
        colors[i * 3 + 1] = 0.2
        colors[i * 3 + 2] = 0.9
      }

      sizes[i] = Math.random() * 3 + 1
    }

    return [positions, colors, sizes]
  }, [count])

  useFrame((state) => {
    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array

      for (let i = 0; i < count; i++) {
        // Move particles forward
        positions[i * 3 + 2] += 0.5 + combo * 0.1

        // Reset if too close
        if (positions[i * 3 + 2] > 5) {
          positions[i * 3 + 2] = -50
        }

        // Add some wobble
        positions[i * 3] += Math.sin(state.clock.elapsedTime + i * 0.1) * 0.02
        positions[i * 3 + 1] += Math.cos(state.clock.elapsedTime + i * 0.1) * 0.02
      }

      pointsRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={2}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}
