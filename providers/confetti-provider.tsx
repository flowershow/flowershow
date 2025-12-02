"use client";

import { createContext, useContext, useState } from "react";
import Lottie from "lottie-react";
import confettiAnimation from "./confetti.json";

type ConfettiContextType = {
  showConfetti: () => void;
};

const ConfettiContext = createContext<ConfettiContextType | null>(null);

export function ConfettiProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);

  const options = {
    animationData: confettiAnimation,
    autoplay: true,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid meet",
    },
  };

  const showConfetti = () => {
    setIsVisible(true);
    setTimeout(() => {
      setIsVisible(false);
    }, 2000);
  };

  return (
    <ConfettiContext.Provider value={{ showConfetti }}>
      {children}
      {isVisible && (
        <div
          className="pointer-events-none fixed inset-0 z-[100]"
          style={{ width: "100vw", height: "100vh" }}
        >
          <div className="flex h-full w-full items-center justify-center">
            <div className="w-full max-w-[1200px]">
              <Lottie {...options} />
            </div>
          </div>
        </div>
      )}
    </ConfettiContext.Provider>
  );
}

export function useConfetti() {
  const context = useContext(ConfettiContext);
  if (!context) {
    throw new Error("useConfetti must be used within a ConfettiProvider");
  }
  return context;
}
