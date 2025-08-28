"use client";

import Modal from "./modal";
import { ReactNode, createContext, useContext, useState } from "react";

interface ModalContextProps {
  show: (content: ReactNode, closableOnClickOutside?: boolean) => void;
  hide: () => void;
}

const ModalContext = createContext<ModalContextProps | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modalContent, setModalContent] = useState<ReactNode | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [closableOnClickOutside, setClosableOnClickOutside] = useState(true);

  const show = (content: ReactNode, closableOnClickOutside: boolean = true) => {
    setClosableOnClickOutside(closableOnClickOutside);
    setModalContent(content);
    setShowModal(true);
  };

  const hide = () => {
    setShowModal(false);
    setTimeout(() => {
      setModalContent(null);
    }, 300); // Adjust this timeout as per your transition duration
  };

  return (
    <ModalContext.Provider value={{ show, hide }}>
      {children}
      {showModal && (
        <Modal
          showModal={showModal}
          setShowModal={setShowModal}
          closeOnClickOutside={closableOnClickOutside}
        >
          {modalContent}
        </Modal>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  return useContext(ModalContext);
}
