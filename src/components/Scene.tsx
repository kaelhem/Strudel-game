import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { BeatSphere } from './BeatSphere'

interface SceneProps {
  beatActive: boolean
  combo: number
  backgroundColor: string
}

export function Scene({ beatActive, combo, backgroundColor }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 50 }}
      style={{
        width: '100%',
        height: '100%',
        background: `linear-gradient(135deg, ${backgroundColor} 0%, #0f0f1e 100%)`
      }}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
      }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8338ec" />

      <BeatSphere beatActive={beatActive} combo={combo} />

      {/* Subtle environment for reflections */}
      <Environment preset="night" />

      {/* Allow gentle rotation on desktop (disabled on mobile for performance) */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={false}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 2}
      />
    </Canvas>
  )
}
