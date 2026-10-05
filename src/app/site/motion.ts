import { useReducedMotion, type MotionProps } from "framer-motion";

export const deskTransition = {
  duration: 0.45,
  ease: [0.22, 1, 0.36, 1] as const,
};

export function useDeskMotion() {
  const reduced = useReducedMotion();
  return {
    reduced,
    reveal: (delay = 0): MotionProps => ({
      initial: { y: reduced ? 0 : 14 },
      whileInView: { y: 0 },
      viewport: { once: true, amount: 0.12 },
      transition: { ...deskTransition, duration: reduced ? 0 : 0.45, delay },
    }),
    interact: {
      whileHover: reduced ? undefined : { y: -2 },
      whileTap: reduced ? undefined : { scale: 0.98 },
      transition: { ...deskTransition, duration: 0.2 },
    } satisfies MotionProps,
  };
}
