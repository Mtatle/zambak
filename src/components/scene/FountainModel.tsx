import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import type { Group, Mesh, Object3D } from 'three'

type FountainModelProps = {
  assemblyProgressRef: MutableRefObject<number>
  finalPhaseRef: MutableRefObject<number>
  isMobile: boolean
}

type AnimatedPart = {
  object: Object3D
  assembled: THREE.Vector3
  exploded: THREE.Vector3
  assembledRotation: THREE.Euler
  explodedRotation: THREE.Euler
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

// Manual exploded placement per top-level GLB part.
// Edit these XYZ offsets to move parts exactly where you want.
// Keys are part names from your model:
// Circle002, Circle004, Line002, uje, lule_004, Line003
const MANUAL_EXPLODED_PART_OFFSETS: Record<string, [number, number, number]> = {
  Circle002: [-0.6, 0.05, 0.4],
  Circle004: [0.6, 0.2, 0.04],
  Line002: [0.34, -0.5, 0.8],
  uje: [-0.1, -0.1, -0.6],
  lule_004: [0.2, 0.2, -0.8],
  Line003: [-0.5, -0.25, -0.2],
}

// Manual exploded rotation deltas in DEGREES [x, y, z].
// Values are added on top of each part's original rotation.
const MANUAL_EXPLODED_PART_ROTATION_DEGREES: Record<
  string,
  [number, number, number]
> = {
  Circle002: [-20, 10, -10],
  Circle004: [10, -8, 15],
  Line002: [15, 12, 0],
  uje: [0, -18, 4],
  lule_004: [5, 16, -3],
  Line003: [18, -2, 2],
}

const deg = (value: number) => THREE.MathUtils.degToRad(value)

const tmpPartCenterA = new THREE.Vector3()
const tmpPartCenterB = new THREE.Vector3()

function isRenderablePart(object: Object3D) {
  const asMesh = object as Mesh
  return asMesh.isMesh || object.children.length > 0
}

export function FountainModel({
  assemblyProgressRef,
  finalPhaseRef,
  isMobile,
}: FountainModelProps) {
  const { scene } = useGLTF('/models/zambak.glb')
  const modelGroupRef = useRef<Group>(null)
  const fallbackMeshRefs = useRef<(Mesh | null)[]>([])
  const smoothedAssemblyRef = useRef(0)
  const spinOffsetRef = useRef(0)

  const modelRoot = useMemo(() => {
    const clone = scene.clone(true)
    const bounds = new THREE.Box3().setFromObject(clone)
    const center = bounds.getCenter(new THREE.Vector3())
    const size = bounds.getSize(new THREE.Vector3())
    const maxDimension = Math.max(size.x, size.y, size.z) || 1

    // Keep XY centered and anchor the object to the "ground" so it feels
    // physically placed, then apply a scale that suits the curated camera.
    clone.position.x -= center.x
    clone.position.z -= center.z
    clone.position.y -= bounds.min.y
    clone.scale.setScalar((isMobile ? 1.72 : 2.3) / maxDimension)

    clone.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh) {
        return
      }

      mesh.castShadow = true
      mesh.receiveShadow = true
    })

    return clone
  }, [scene, isMobile])

  const animatedParts = useMemo(() => {
    const directParts = modelRoot.children.filter(
      (object) => object.visible && isRenderablePart(object),
    )

    const meshParts: Object3D[] = []
    if (directParts.length < 3) {
      modelRoot.traverse((object) => {
        const mesh = object as Mesh
        if (mesh.isMesh && mesh.visible) {
          meshParts.push(mesh)
        }
      })
    }

    const partObjects = directParts.length >= 3 ? directParts : meshParts
    if (partObjects.length === 0) {
      return [] as AnimatedPart[]
    }

    const rootBounds = new THREE.Box3().setFromObject(modelRoot)
    const rootCenter = rootBounds.getCenter(new THREE.Vector3())

    const sortedParts = [...partObjects].sort((partA, partB) => {
      new THREE.Box3().setFromObject(partA).getCenter(tmpPartCenterA)
      new THREE.Box3().setFromObject(partB).getCenter(tmpPartCenterB)
      return tmpPartCenterA.y - tmpPartCenterB.y
    })

    return sortedParts.map((object, index) => {
      const assembled = object.position.clone()
      const assembledRotation = object.rotation.clone()
      const manualOffset = MANUAL_EXPLODED_PART_OFFSETS[object.name]
      const manualRotationDelta =
        MANUAL_EXPLODED_PART_ROTATION_DEGREES[object.name]

      const createExplodedRotation = (
        deltaDeg: [number, number, number],
        scale: number,
      ) =>
        new THREE.Euler(
          assembledRotation.x + deg(deltaDeg[0] * scale),
          assembledRotation.y + deg(deltaDeg[1] * scale),
          assembledRotation.z + deg(deltaDeg[2] * scale),
          assembledRotation.order,
        )

      if (manualOffset) {
        const mobileScale = isMobile ? 0.82 : 1
        const exploded = assembled.clone().add(
          new THREE.Vector3(
            manualOffset[0] * mobileScale,
            manualOffset[1] * mobileScale,
            manualOffset[2] * mobileScale,
          ),
        )

        const explodedRotation = manualRotationDelta
          ? createExplodedRotation(manualRotationDelta, mobileScale)
          : assembledRotation.clone()

        return {
          object,
          assembled,
          exploded,
          assembledRotation,
          explodedRotation,
        }
      }

      const partCenter = new THREE.Box3().setFromObject(object).getCenter(
        new THREE.Vector3(),
      )
      const rawRadial = new THREE.Vector3(
        partCenter.x - rootCenter.x,
        0,
        partCenter.z - rootCenter.z,
      )
      const radialLength = rawRadial.length()
      const radialDirection = rawRadial.clone()

      if (radialDirection.lengthSq() < 0.0001) {
        radialDirection.copy(
          fallbackDirections[index % fallbackDirections.length],
        )
      } else {
        radialDirection.normalize()
      }

      const normalizedIndex =
        sortedParts.length === 1 ? 0 : index / (sortedParts.length - 1) - 0.5
      const outlierDamping = THREE.MathUtils.clamp(1 - radialLength * 0.8, 0.4, 1)
      const spread = (0.72 + index * 0.14) * outlierDamping * (isMobile ? 0.72 : 1)
      const radialOffset = new THREE.Vector3(
        radialDirection.x * spread * 0.56,
        0,
        radialDirection.z * spread * 0.86,
      )
      const swirl = new THREE.Vector3(
        Math.sin(index * 1.3) * 0.13,
        normalizedIndex * (isMobile ? 0.3 : 0.35) - (isMobile ? 0.28 : 0.22),
        Math.cos(index * 0.96) * 0.13,
      )

      const exploded = assembled.clone().add(radialOffset).add(swirl)
      const autoRotationDelta: [number, number, number] = [
        normalizedIndex * 3.2,
        (index % 2 === 0 ? 1 : -1) * 7.5,
        normalizedIndex * -2.6,
      ]
      const explodedRotation = createExplodedRotation(
        autoRotationDelta,
        isMobile ? 0.78 : 1,
      )

      return {
        object,
        assembled,
        exploded,
        assembledRotation,
        explodedRotation,
      }
    })
  }, [modelRoot, isMobile])

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
        exploded: new THREE.Vector3(0, -2.25, 0),
      },
      {
        key: 'plinth',
        kind: 'cylinder',
        args: [0.72, 0.88, 0.36, 64],
        color: '#cab59d',
        roughness: 0.55,
        metalness: 0.06,
        assembled: new THREE.Vector3(0, -0.58, 0),
        exploded: new THREE.Vector3(1.12, 0.08, 0.58),
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
        exploded: new THREE.Vector3(-1.26, 0.38, -0.62),
      },
      {
        key: 'stem',
        kind: 'cylinder',
        args: [0.22, 0.3, 0.95, 52],
        color: '#d5c2ac',
        roughness: 0.45,
        metalness: 0.12,
        assembled: new THREE.Vector3(0, 0.24, 0),
        exploded: new THREE.Vector3(0.72, 1.42, -1.22),
      },
      {
        key: 'cup',
        kind: 'cylinder',
        args: [0.6, 0.34, 0.48, 64],
        color: '#e1d2c1',
        roughness: 0.4,
        metalness: 0.15,
        assembled: new THREE.Vector3(0, 0.92, 0),
        exploded: new THREE.Vector3(-0.88, 2.02, 0.96),
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
        exploded: new THREE.Vector3(-1.42, 2.46, 0.24),
      },
      {
        key: 'bud',
        kind: 'sphere',
        args: [0.27, 46, 46],
        color: '#f3e7d8',
        roughness: 0.3,
        metalness: 0.22,
        assembled: new THREE.Vector3(0, 1.34, 0),
        exploded: new THREE.Vector3(1.28, 2.98, -0.22),
      },
    ],
    [],
  )

  const usesFallback = animatedParts.length === 0

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
      2.3,
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
      animatedParts.forEach((part) => {
        part.object.position.lerpVectors(part.exploded, part.assembled, assemblyMix)
        const targetRotationX = THREE.MathUtils.lerp(
          part.explodedRotation.x,
          part.assembledRotation.x,
          assemblyMix,
        )
        const targetRotationY = THREE.MathUtils.lerp(
          part.explodedRotation.y,
          part.assembledRotation.y,
          assemblyMix,
        )
        const targetRotationZ = THREE.MathUtils.lerp(
          part.explodedRotation.z,
          part.assembledRotation.z,
          assemblyMix,
        )
        part.object.rotation.x = THREE.MathUtils.damp(
          part.object.rotation.x,
          targetRotationX,
          7,
          delta,
        )
        part.object.rotation.y = THREE.MathUtils.damp(
          part.object.rotation.y,
          targetRotationY,
          7,
          delta,
        )
        part.object.rotation.z = THREE.MathUtils.damp(
          part.object.rotation.z,
          targetRotationZ,
          7,
          delta,
        )
      })
    }

    const elapsed = state.clock.elapsedTime
    const floatY = Math.sin(elapsed * 0.55) * 0.042 + Math.sin(elapsed * 0.2) * 0.014
    const finalPhase = THREE.MathUtils.clamp(finalPhaseRef.current, 0, 1)

    spinOffsetRef.current += delta * (0.024 + finalPhase * 0.052)

    const orientationOffset = isMobile ? 0.62 : 0
    const targetRotationY =
      orientationOffset + spinOffsetRef.current + Math.sin(elapsed * 0.2) * 0.03
    const baseY = usesFallback ? (isMobile ? -0.42 : -0.34) : isMobile ? -1.96 : -1.5
    const baseX = usesFallback ? (isMobile ? 0.24 : 0) : isMobile ? 0.46 : 0
    group.position.y = baseY + floatY
    group.position.x = THREE.MathUtils.damp(group.position.x, baseX, 3.8, delta)
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, targetRotationY, 2.4, delta)
    group.rotation.x = THREE.MathUtils.damp(
      group.rotation.x,
      -0.055 + Math.sin(elapsed * 0.34) * 0.012,
      2.6,
      delta,
    )
  })

  return (
    <group ref={modelGroupRef}>
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
