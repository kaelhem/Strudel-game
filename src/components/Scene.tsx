import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei'
import { FallingNotes } from './FallingNotes'
import type { Note } from '../hooks/useBeatGame'

interface SceneProps {
  notes: Note[]
  currentTime: number
  combo: number
  backgroundColor: string
}

export function Scene({ notes, currentTime, combo, backgroundColor }: SceneProps) {
  return (
    <Canvas
      style={{
        width: '100%',
        height: '100%',
        background: `linear-gradient(180deg, ${backgroundColor} 0%, #000000 100%)`
      }}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
      }}
    >
      <PerspectiveCamera makeDefault position={[0, 3, 5]} fov={60} />

      <ambientLight intensity={0.3} />
      <pointLight position={[0, 5, 5]} intensity={1} color="#00d4ff" />
      <pointLight position={[0, -5, 5]} intensity={0.5} color="#ff00ff" />

      {/* Background glow effect */}
      <mesh position={[0, 0, -15]}>
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial
          color={combo > 10 ? '#ff00ff' : combo > 5 ? '#00d4ff' : '#1a1a2e'}
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Falling notes system */}
      <FallingNotes notes={notes} currentTime={currentTime} />

      {/* Floor grid */}
      <gridHelper args={[20, 20, '#333333', '#111111']} position={[0, -2, 0]} />

      <Environment preset="night" />

      {/* Disable orbit controls for gameplay */}
      <OrbitControls enabled={false} />
    </Canvas>
  )
}
