import { ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import {
  Suspense,
  useEffect,
  useState,
  type MutableRefObject,
} from 'react'
import * as THREE from 'three'
import { FountainModel } from './FountainModel'

type SceneCanvasProps = {
  assemblyProgressRef: MutableRefObject<number>
  finalPhaseRef: MutableRefObject<number>
}

export function SceneCanvas({
  assemblyProgressRef,
  finalPhaseRef,
}: SceneCanvasProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 900px)')
    const update = () => setIsMobile(mediaQuery.matches)
    update()

    mediaQuery.addEventListener('change', update)
    return () => {
      mediaQuery.removeEventListener('change', update)
    }
  }, [])

  const cameraPosition = isMobile ? [0.5, 0.46, 8.2] : [0, 0.58, 6.7]
  const controlsTarget = isMobile ? [0.46, -1.04, 0] : [0, -0.62, 0]
  const shadowScale = isMobile ? 10.4 : 14
  const shadowY = isMobile ? -2.06 : -1.58

  return (
    <div className="scene-shell" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: cameraPosition as [number, number, number], fov: isMobile ? 34 : 31 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.68} color="#f4ede4" />

        <directionalLight
          castShadow
          intensity={1.1}
          color="#fff6ec"
          position={[4.5, 6, 4]}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.00008}
        />

        <directionalLight
          intensity={0.35}
          color="#d9c5ad"
          position={[-3.5, 2.3, -3]}
        />

        <Suspense fallback={null}>
          <FountainModel
            assemblyProgressRef={assemblyProgressRef}
            finalPhaseRef={finalPhaseRef}
            isMobile={isMobile}
          />
          <Environment preset="sunset" />
        </Suspense>

        <ContactShadows
          opacity={0.16}
          scale={shadowScale}
          blur={1.8}
          far={3.3}
          position={[0, shadowY, 0]}
          color="#8b7760"
        />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.38}
          target={controlsTarget as [number, number, number]}
          minPolarAngle={Math.PI / 2 - 0.16}
          maxPolarAngle={Math.PI / 2 + 0.16}
        />
      </Canvas>
    </div>
  )
}
