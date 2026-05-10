import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useSimulationStore } from '../store/useSimulationStore';

function ReactionAnimator() {
  const currentStepIndex = useSimulationStore((state) => state.currentStepIndex);
  const replayToken = useSimulationStore((state) => state.animation.replayToken);
  const paused = useSimulationStore((state) => state.animation.paused);
  const setAnimation = useSimulationStore((state) => state.setAnimation);
  const timelineRef = useRef(null);

  useEffect(() => {
    const values = {
      bind: 0,
      reaction: 0,
      release: 0,
      pulse: 0,
      glow: 0,
    };

    timelineRef.current?.kill();
    setAnimation({
      bind: 0,
      reaction: 0,
      release: 0,
      pulse: 0,
      glow: 0,
      playing: true,
      paused: false,
    });

    const sync = () => setAnimation({ ...values });

    const timeline = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      onComplete: () => {
        setAnimation({ playing: false, ...values });
      },
    });
    timelineRef.current = timeline;

    timeline
      .to(values, {
        bind: 1,
        duration: 0.9,
        onUpdate: sync,
      })
      .to(
        values,
        {
          reaction: 1,
          pulse: 1,
          glow: 1,
          duration: 1.1,
          onUpdate: sync,
        },
        '>-0.05',
      )
      .to(values, {
        release: 1,
        duration: 1,
        onUpdate: sync,
      })
      .to(values, {
        pulse: 0.36,
        glow: 0.45,
        duration: 0.4,
        onUpdate: sync,
      });

    return () => {
      timeline.kill();
      timelineRef.current = null;
    };
  }, [currentStepIndex, replayToken, setAnimation]);

  useEffect(() => {
    if (!timelineRef.current) {
      return;
    }

    if (paused) {
      timelineRef.current.pause();
    } else {
      timelineRef.current.resume();
    }
  }, [paused]);

  return null;
}

export default ReactionAnimator;
