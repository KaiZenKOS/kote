import { Canvas, useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { useRef } from 'react'
import type { Group } from 'three'

function Pin({ position, color }: { position: [number, number, number], color: string }) {
  return <Float speed={1.8} rotationIntensity={0.12} floatIntensity={0.55} floatingRange={[-0.12, 0.16]}><group position={position} rotation={[0.12, 0, -0.1]}>
    <mesh position={[0, .42, 0]} castShadow><sphereGeometry args={[.29, 28, 28]}/><meshStandardMaterial color={color} roughness={.35}/></mesh>
    <mesh position={[0, .13, 0]} rotation={[Math.PI, 0, 0]} castShadow><coneGeometry args={[.29, .58, 28]}/><meshStandardMaterial color={color} roughness={.35}/></mesh>
    <mesh position={[0, .43, .25]}><sphereGeometry args={[.082, 20, 20]}/><meshBasicMaterial color="#fff6e5"/></mesh>
  </group></Float>
}

function MarketBlock({ position, color, scale = 1 }: { position: [number, number, number], color: string, scale?: number }) {
  return <group position={position} scale={scale}><mesh castShadow receiveShadow><boxGeometry args={[1.12, .62, .9]}/><meshStandardMaterial color={color} roughness={.7}/></mesh><mesh position={[0, .39, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[.83, .58, 4]}/><meshStandardMaterial color="#f6c657" roughness={.55}/></mesh></group>
}

function Scene() {
  const world = useRef<Group>(null)
  useFrame(({ clock, pointer }) => { if (!world.current) return; world.current.rotation.y = pointer.x * .17 + Math.sin(clock.elapsedTime * .22) * .035; world.current.rotation.x = -0.14 - pointer.y * .09; world.current.position.y = Math.sin(clock.elapsedTime * .5) * .05 })
  return <group ref={world} rotation={[-.14, -.33, 0]}>
    <mesh position={[.25, -1.3, -.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[3.35, 64]}/><meshStandardMaterial color="#f7edcf" roughness={.95}/></mesh>
    <mesh position={[.25, -1.27, -.14]} rotation={[-Math.PI / 2, 0, .48]}><ringGeometry args={[2.15, 2.22, 64]}/><meshBasicMaterial color="#1c4ca2" transparent opacity={.55}/></mesh>
    <MarketBlock position={[-.93, -.78, .1]} color="#ec5422" scale={1.12}/><MarketBlock position={[.55, -.74, -.15]} color="#1c4ca2" scale={.96}/><MarketBlock position={[1.3, -.64, .42]} color="#2b6b54" scale={.66}/>
    <mesh position={[-.08, -.92, .55]} rotation={[0, .22, .1]} castShadow><cylinderGeometry args={[.23, .23, .98, 20]}/><meshStandardMaterial color="#2b6b54" roughness={.6}/></mesh>
    <mesh position={[-.08, -.27, .55]} castShadow><sphereGeometry args={[.58, 28, 28]}/><meshStandardMaterial color="#f6c657" roughness={.55}/></mesh>
    <Pin position={[-1.53, .08, .2]} color="#ec5422"/><Pin position={[.52, .46, .45]} color="#1c4ca2"/><Pin position={[1.56, -.02, .08]} color="#2b6b54"/>
    <Float speed={1.2} rotationIntensity={.2} floatIntensity={.45}><mesh position={[-.15, 1.55, -.3]} rotation={[.1, .1, .24]}><torusGeometry args={[.54, .055, 16, 60]}/><meshStandardMaterial color="#f6c657" emissive="#e2a62c" emissiveIntensity={.25}/></mesh></Float>
  </group>
}

export default function KoteScene() { return <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 0, 7.6], fov: 43 }} gl={{ antialias: true, alpha: true }}><ambientLight intensity={2.1}/><directionalLight position={[3, 5, 4]} intensity={3.2} castShadow shadow-mapSize={[1024, 1024]}/><pointLight position={[-4, 1, 3]} color="#f6c657" intensity={7}/><Scene /></Canvas> }
