import { ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, type MutableRefObject } from 'react'
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
  return (
    <div className="scene-shell" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [0, 1.25, 6.4], fov: 30 }}
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
          />
          <Environment preset="sunset" />
        </Suspense>

        <ContactShadows
          opacity={0.16}
          scale={14}
          blur={1.8}
          far={3.3}
          position={[0, -1.33, 0]}
          color="#8b7760"
        />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.38}
          minAzimuthAngle={-0.45}
          maxAzimuthAngle={0.45}
          minPolarAngle={Math.PI / 2 - 0.16}
          maxPolarAngle={Math.PI / 2 + 0.16}
        />
      </Canvas>
    </div>
  )
}
