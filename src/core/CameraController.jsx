import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { gsap } from 'gsap';
import { useSimulationStore } from '../store/useSimulationStore';

function CameraController({ controlsRef }) {
  const { camera } = useThree();
  const focus = useSimulationStore((state) => state.camera.focus);
  const offset = useSimulationStore((state) => state.camera.offset);
  const transitionKey = useSimulationStore((state) => state.camera.transitionKey);

  useEffect(() => {
    const controls = controlsRef.current;
    const targetPosition = {
      x: focus[0] + offset[0],
      y: focus[1] + offset[1],
      z: focus[2] + offset[2],
    };
    const targetLookAt = {
      x: focus[0],
      y: focus[1],
      z: focus[2],
    };

    const timeline = gsap.timeline({
      defaults: { duration: 1.1, ease: 'power3.inOut' },
      onUpdate: () => {
        if (controls) {
          controls.update();
        } else {
          camera.lookAt(targetLookAt.x, targetLookAt.y, targetLookAt.z);
        }
      },
    });

    timeline.to(camera.position, targetPosition, 0);

    if (controls) {
      timeline.to(controls.target, targetLookAt, 0);
    }

    return () => {
      timeline.kill();
    };
  }, [camera, controlsRef, focus, offset, transitionKey]);

  return null;
}

export default CameraController;
