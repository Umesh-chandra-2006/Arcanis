import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Stars, OrbitControls } from "@react-three/drei";

function AnimatedScene() {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const torusRef = useRef<THREE.Mesh>(null);
  const icosahedronRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.x += 0.0001;
      groupRef.current.rotation.y += 0.0002;
    }

    if (torusRef.current) {
      torusRef.current.rotation.x += 0.005;
      torusRef.current.rotation.y += 0.007;
    }

    if (icosahedronRef.current) {
      icosahedronRef.current.rotation.x -= 0.003;
      icosahedronRef.current.rotation.y -= 0.004;
    }

    if (particlesRef.current) {
      particlesRef.current.rotation.x += 0.0001;
      particlesRef.current.rotation.y += 0.0001;
    }
  });

  const particlesCount = 500;
  const particlesGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particlesCount * 3);

  for (let i = 0; i < particlesCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 100;
    positions[i + 1] = (Math.random() - 0.5) * 100;
    positions[i + 2] = (Math.random() - 0.5) * 100;
  }

  particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  return (
    <group ref={groupRef}>
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />

      <points ref={particlesRef} geometry={particlesGeometry}>
        <pointsMaterial size={0.3} color="#a855f7" sizeAttenuation transparent opacity={0.6} />
      </points>

      <mesh ref={torusRef} position={[0, 0, 0]}>
        <torusGeometry args={[15, 5, 16, 100]} />
        <meshStandardMaterial color="#a855f7" wireframe emissive="#7c3aed" emissiveIntensity={0.5} />
      </mesh>

      <mesh ref={icosahedronRef} position={[0, 0, 0]}>
        <icosahedronGeometry args={[8, 4]} />
        <meshStandardMaterial color="#ec4899" wireframe emissive="#be185d" emissiveIntensity={0.5} />
      </mesh>

      <ambientLight intensity={0.5} />
      <pointLight position={[20, 20, 20]} intensity={1} color="#a855f7" />
      <pointLight position={[-20, -20, 20]} intensity={1} color="#ec4899" />
    </group>
  );
}

export function AnimatedBackground() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <div className="fixed inset-0 -z-10 h-screen w-screen">
      <Canvas camera={{ position: [0, 0, 40], fov: 75 }}>
        <AnimatedScene />
      </Canvas>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 via-purple-900/50 to-slate-900/50" />
    </div>
  );
}
