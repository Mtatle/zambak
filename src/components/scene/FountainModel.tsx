import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import type { Group, Mesh } from 'three'

type FountainModelProps = {
  assemblyProgressRef: MutableRefObject<number>
  finalPhaseRef: MutableRefObject<number>
}

type MeshPart = {
  mesh: Mesh
  assembled: THREE.Vector3
  exploded: THREE.Vector3
}

type FallbackPartBase = {
  key: string
  color: string
  roughness: number
  metalness: number
  rotation?: [number, number, number]
  assembled: THREE.Vector3
  exploded: THREE.Vector3
}

type CylinderFallbackPart = FallbackPartBase & {
  kind: 'cylinder'
  args: [number, number, number, number]
}

type TorusFallbackPart = FallbackPartBase & {
  kind: 'torus'
  args: [number, number, number, number]
}

type SphereFallbackPart = FallbackPartBase & {
  kind: 'sphere'
  args: [number, number, number]
}

type FallbackPart = CylinderFallbackPart | TorusFallbackPart | SphereFallbackPart

const fallbackDirections = [
  new THREE.Vector3(1, 0.16, 0),
  new THREE.Vector3(-1, 0.18, 0.25),
  new THREE.Vector3(0.6, 0.24, 1),
  new THREE.Vector3(-0.55, 0.2, -1),
  new THREE.Vector3(0.25, 0.34, -0.8),
  new THREE.Vector3(-0.3, 0.3, 0.9),
].map((vector) => vector.normalize())

export function FountainModel({
  assemblyProgressRef,
  finalPhaseRef,
}: FountainModelProps) {
  const { scene } = useGLTF('/models/zambak.glb')
  const modelGroupRef = useRef<Group>(null)
  const fallbackMeshRefs = useRef<(Mesh | null)[]>([])
  const smoothedAssemblyRef = useRef(0)
  const spinOffsetRef = useRef(0)

  const modelRoot = useMemo(() => {
    const clone = scene.clone(true)
    const box = new THREE.Box3().setFromObject(clone)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDimension = Math.max(size.x, size.y, size.z) || 1

    clone.position.sub(center)
    clone.scale.setScalar(2.6 / maxDimension)

    return clone
  }, [scene])

  const meshParts = useMemo(() => {
    const parts: MeshPart[] = []
    let meshIndex = 0

    // Mesh names may vary by export. Traverse all visible meshes and build
    // a best-effort exploded layout from each mesh's local position.
    modelRoot.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh || !mesh.visible) {
        return
      }

      mesh.castShadow = true
      mesh.receiveShadow = true

      const assembled = mesh.position.clone()
      const direction =
        assembled.lengthSq() > 0.0001
          ? assembled.clone().normalize()
          : fallbackDirections[meshIndex % fallbackDirections.length].clone()

      const stackLayer = (meshIndex % 5) - 2
      const spread =
        0.24 +
        (meshIndex % 3) * 0.04 +
        Math.floor(meshIndex / fallbackDirections.length) * 0.06

      const exploded = assembled
        .clone()
        .add(direction.multiplyScalar(spread))
        .add(new THREE.Vector3(0, stackLayer * 0.09, 0))

      parts.push({ mesh, assembled, exploded })
      meshIndex += 1
    })

    return parts
  }, [modelRoot])

  const fallbackParts = useMemo<FallbackPart[]>(
    () => [
      {
        key: 'base',
        kind: 'cylinder',
        args: [1.2, 1.35, 0.44, 64],
        color: '#b8a087',
        roughness: 0.62,
        metalness: 0.08,
        assembled: new THREE.Vector3(0, -1.02, 0),
        exploded: new THREE.Vector3(0, -1.62, 0),
      },
      {
        key: 'plinth',
        kind: 'cylinder',
        args: [0.72, 0.88, 0.36, 64],
        color: '#cab59d',
        roughness: 0.55,
        metalness: 0.06,
        assembled: new THREE.Vector3(0, -0.58, 0),
        exploded: new THREE.Vector3(0.52, -0.2, 0.24),
      },
      {
        key: 'ring',
        kind: 'torus',
        args: [0.92, 0.07, 28, 150],
        color: '#a08a72',
        roughness: 0.48,
        metalness: 0.16,
        rotation: [Math.PI / 2, 0, 0],
        assembled: new THREE.Vector3(0, -0.34, 0),
        exploded: new THREE.Vector3(-0.56, 0.12, -0.24),
      },
      {
        key: 'stem',
        kind: 'cylinder',
        args: [0.22, 0.3, 0.95, 52],
        color: '#d5c2ac',
        roughness: 0.45,
        metalness: 0.12,
        assembled: new THREE.Vector3(0, 0.24, 0),
        exploded: new THREE.Vector3(0.28, 0.88, -0.52),
      },
      {
        key: 'cup',
        kind: 'cylinder',
        args: [0.6, 0.34, 0.48, 64],
        color: '#e1d2c1',
        roughness: 0.4,
        metalness: 0.15,
        assembled: new THREE.Vector3(0, 0.92, 0),
        exploded: new THREE.Vector3(-0.34, 1.4, 0.38),
      },
      {
        key: 'petal-ring',
        kind: 'torus',
        args: [0.34, 0.05, 22, 120],
        color: '#b69f86',
        roughness: 0.42,
        metalness: 0.2,
        rotation: [Math.PI / 2, 0, 0],
        assembled: new THREE.Vector3(0, 1.16, 0),
        exploded: new THREE.Vector3(-0.62, 1.5, 0.12),
      },
      {
        key: 'bud',
        kind: 'sphere',
        args: [0.27, 46, 46],
        color: '#f3e7d8',
        roughness: 0.3,
        metalness: 0.22,
        assembled: new THREE.Vector3(0, 1.34, 0),
        exploded: new THREE.Vector3(0.66, 1.86, -0.08),
      },
    ],
    [],
  )

  const usesFallback = meshParts.length === 0

  useEffect(() => {
    if (!usesFallback) {
      return
    }

    console.warn(
      '[Zambak] Loaded GLB contains no visible meshes. Rendering fallback proxy fountain. ' +
        'Replace /public/models/zambak.glb with a real mesh-exported GLB.',
    )
  }, [usesFallback])

  useFrame((state, delta) => {
    const group = modelGroupRef.current
    if (!group) {
      return
    }

    smoothedAssemblyRef.current = THREE.MathUtils.damp(
      smoothedAssemblyRef.current,
      assemblyProgressRef.current,
      3.7,
      delta,
    )

    const assemblyMix = THREE.MathUtils.smootherstep(
      smoothedAssemblyRef.current,
      0,
      1,
    )

    if (usesFallback) {
      fallbackParts.forEach((part, index) => {
        const mesh = fallbackMeshRefs.current[index]
        if (!mesh) {
          return
        }

        mesh.position.lerpVectors(part.exploded, part.assembled, assemblyMix)
      })
    } else {
      meshParts.forEach((part) => {
        part.mesh.position.lerpVectors(part.exploded, part.assembled, assemblyMix)
      })
    }

    const elapsed = state.clock.elapsedTime
    const floatY = Math.sin(elapsed * 0.55) * 0.055 + Math.sin(elapsed * 0.2) * 0.02
    const finalPhase = THREE.MathUtils.clamp(finalPhaseRef.current, 0, 1)

    spinOffsetRef.current += delta * (0.03 + finalPhase * 0.06)

    const targetRotationY = spinOffsetRef.current + Math.sin(elapsed * 0.22) * 0.04
    group.position.y = 0.08 + floatY
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, targetRotationY, 2.5, delta)
    group.rotation.x = THREE.MathUtils.damp(
      group.rotation.x,
      -0.06 + Math.sin(elapsed * 0.35) * 0.014,
      2.8,
      delta,
    )
  })

  return (
    <group ref={modelGroupRef} position={[0, -0.78, 0]}>
      {usesFallback ? (
        <group>
          {fallbackParts.map((part, index) => (
            <mesh
              key={part.key}
              ref={(node) => {
                fallbackMeshRefs.current[index] = node
              }}
              castShadow
              receiveShadow
              rotation={part.rotation ?? [0, 0, 0]}
            >
              {part.kind === 'cylinder' && <cylinderGeometry args={part.args} />}
              {part.kind === 'torus' && <torusGeometry args={part.args} />}
              {part.kind === 'sphere' && <sphereGeometry args={part.args} />}
              <meshStandardMaterial
                color={part.color}
                roughness={part.roughness}
                metalness={part.metalness}
              />
            </mesh>
          ))}
        </group>
      ) : (
        <primitive object={modelRoot} />
      )}
    </group>
  )
}

useGLTF.preload('/models/zambak.glb')
