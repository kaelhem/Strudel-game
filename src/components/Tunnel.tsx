import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function Tunnel({ combo }: { combo: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const geometry = useMemo(() => {
    return new THREE.CylinderGeometry(15, 15, 100, 64, 1, true)
  }, [])

  const shader = useMemo(() => ({
    uniforms: {
      time: { value: 0 },
      color1: { value: new THREE.Color('#ff006e') },
      color2: { value: new THREE.Color('#00d4ff') },
      color3: { value: new THREE.Color('#8338ec') },
      intensity: { value: 0.5 }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;

      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 color1;
      uniform vec3 color2;
      uniform vec3 color3;
      uniform float intensity;

      varying vec2 vUv;
      varying vec3 vPosition;

      void main() {
        // Moving stripes
        float stripe = sin(vPosition.z * 0.5 + time * 3.0) * 0.5 + 0.5;

        // Circular waves
        float angle = atan(vPosition.x, vPosition.y);
        float radial = sin(angle * 8.0 + time * 2.0) * 0.5 + 0.5;

        // Mix colors
        vec3 color = mix(color1, color2, stripe);
        color = mix(color, color3, radial * 0.5);

        // Pulse effect
        float pulse = sin(time * 4.0) * 0.3 + 0.7;
        color *= pulse * intensity;

        // Fade at edges
        float alpha = 0.3;

        gl_FragColor = vec4(color, alpha);
      }
    `
  }), [])

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime
      materialRef.current.uniforms.intensity.value = 0.5 + combo * 0.05
    }
    if (meshRef.current) {
      meshRef.current.rotation.z += 0.001
    }
  })

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[Math.PI / 2, 0, 0]}>
      <shaderMaterial
        ref={materialRef}
        args={[shader]}
        transparent
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  )
}
