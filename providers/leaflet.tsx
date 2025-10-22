import { useEffect, useRef, ReactNode, Dispatch, SetStateAction } from "react";
import { AnimatePresence, motion, useAnimate } from "motion/react";

type DragInfo = {
  offset: { y: number };
  velocity: { y: number };
};

export default function Leaflet({
  setShow,
  children,
}: {
  setShow: Dispatch<SetStateAction<boolean>>;
  children: ReactNode;
}) {
  const [scope, animate] = useAnimate();
  const heightRef = useRef(0);

  const transitionProps = {
    type: "spring",
    stiffness: 500,
    damping: 30,
  } as const;

  useEffect(() => {
    // Cache current height once mounted (avoids layout thrash on drag end)
    heightRef.current =
      (scope.current?.getBoundingClientRect().height as number) || 0;

    // Enter animation
    animate(scope.current, { y: 20 }, transitionProps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDragEnd(_: any, info: DragInfo) {
    const offset = info.offset.y;
    const velocity = info.velocity.y;
    const height = heightRef.current || 0;

    if (offset > height / 2 || velocity > 800) {
      await animate(scope.current, { y: "100%" }, transitionProps);
      setShow(false);
    } else {
      animate(scope.current, { y: 0 }, transitionProps);
    }
  }

  return (
    <AnimatePresence>
      {/* Sheet */}
      <motion.div
        ref={scope}
        key="leaflet"
        className="group fixed inset-x-0 bottom-0 z-40 w-screen cursor-grab bg-white pb-5 active:cursor-grabbing sm:hidden"
        initial={{ y: "100%" }}
        exit={{ y: "100%" }}
        drag="y"
        dragDirectionLock
        onDragEnd={handleDragEnd}
        dragElastic={{ top: 0, bottom: 1 }}
        dragConstraints={{ top: 0, bottom: 0 }}
        // whileDrag keeps it above the backdrop when dragging quickly
        style={{ willChange: "transform" }}
        transition={transitionProps}
      >
        <div className="rounded-t-4xl -mb-1 flex h-7 w-full items-center justify-center border-t border-gray-200">
          <div className="-mr-1 h-1 w-6 rounded-full bg-gray-300 transition-all group-active:rotate-12" />
          <div className="h-1 w-6 rounded-full bg-gray-300 transition-all group-active:-rotate-12" />
        </div>
        {children}
      </motion.div>

      {/* Backdrop */}
      <motion.div
        key="leaflet-backdrop"
        className="fixed inset-0 z-30 bg-gray-100 bg-opacity-10 backdrop-blur"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setShow(false)}
      />
    </AnimatePresence>
  );
}
