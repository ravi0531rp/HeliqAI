import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Float, OrbitControls, Stars } from '@react-three/drei';
import PathwayScene from '../components/PathwayScene';
import CameraController from './CameraController';
import ReactionAnimator from '../animations/ReactionAnimator';

import { useSimulationStore } from '../store/useSimulationStore';

function SceneManager() {
  const controlsRef = useRef(null);

  return (
    <div className="canvas-shell">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [4.8, 5.8, 16.8], fov: 44 }}
        gl={{ antialias: true }}
        onPointerMissed={() => useSimulationStore.getState().clearSelection()}
      >
        <color attach="background" args={['#050d15']} />
        <fog attach="fog" args={['#050d15', 18, 38]} />
        <ambientLight intensity={0.55} color="#8cb0c7" />
        <directionalLight
          castShadow
          position={[8, 12, 10]}
          intensity={1.45}
          color="#c9f9f0"
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <spotLight
          position={[-10, 8, 5]}
          angle={0.4}
          penumbra={0.7}
          intensity={28}
          color="#ffb370"
        />
        <Stars radius={70} depth={30} count={2400} factor={2.5} saturation={0} fade speed={0.6} />
        <Suspense fallback={null}>
          <Float floatIntensity={0.2} speed={1.2}>
            <PathwayScene />
          </Float>
          <Environment preset="city" />
        </Suspense>
        <ContactShadows
          position={[0, -3.6, 0]}
          opacity={0.5}
          scale={34}
          blur={2.8}
          far={14}
        />
        <ReactionAnimator />
        <CameraController controlsRef={controlsRef} />
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enablePan
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.7}
          zoomSpeed={0.9}
          panSpeed={0.75}
          screenSpacePanning
          minDistance={5.5}
          maxDistance={28}
          minPolarAngle={0.05}
          maxPolarAngle={Math.PI - 0.05}
        />
      </Canvas>
    </div>
  );
}

export default SceneManager;
