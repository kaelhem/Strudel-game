import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { FallingNotes } from './FallingNotes'
import { Tunnel } from './Tunnel'
import { Particles } from './Particles'
import type { Note } from '../hooks/useBeatGame'

interface SceneProps {
  notes: Note[]
  currentTime: number
  combo: number
  backgroundColor: string
}

export function Scene({ notes, currentTime, combo }: SceneProps) {
  return (
    <Canvas
      style={{
        width: '100%',
        height: '100%',
        background: '#000'
      }}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
      }}
    >
      <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={75} />

      {/* Ambient lighting */}
      <ambientLight intensity={0.2} />

      {/* Dynamic point lights based on combo */}
      <pointLight
        position={[5, 5, 2]}
        intensity={1 + combo * 0.1}
        color="#ff006e"
        distance={20}
      />
      <pointLight
        position={[-5, -5, 2]}
        intensity={1 + combo * 0.1}
        color="#00d4ff"
        distance={20}
      />
      <pointLight
        position={[0, 0, -10]}
        intensity={0.5 + combo * 0.05}
        color="#8338ec"
        distance={30}
      />

      {/* Fog for depth */}
      <fog attach="fog" args={['#000', 10, 50]} />

      {/* Tunnel background */}
      <Tunnel combo={combo} />

      {/* Particle system */}
      <Particles count={800} combo={combo} />

      {/* Game notes and target */}
      <FallingNotes notes={notes} currentTime={currentTime} />
    </Canvas>
  )
}
