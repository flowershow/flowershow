import { Fragment } from "react";
import { Transition } from "@headlessui/react";

import { XMarkIcon } from "./icons/xmark-icon";

export function FloatingBanner({ show, onClose, children }) {
  return (
    <Transition
      show={show}
      as={Fragment}
      enter="transition ease-out duration-100"
      enterFrom="transform opacity-0 scale-95"
      enterTo="transform opacity-100 scale-100"
      leave="transition ease-in duration-75"
      leaveFrom="transform opacity-100 scale-100"
      leaveTo="transform opacity-0 scale-95"
    >
      <div className="pointer-events-none fixed inset-x-0 bottom-0 sm:flex sm:justify-center sm:px-6 sm:pb-5 lg:px-8">
        <div className="pointer-events-auto flex items-center justify-between gap-x-6 rounded-md bg-white px-6 py-2.5 text-primary shadow-lg ring-1 ring-black ring-opacity-5 sm:rounded-md sm:py-3 sm:pl-4 sm:pr-3.5">
          <p className="text-sm leading-6">{children}</p>
          <button
            onClick={onClose}
            type="button"
            className="-m-1.5 flex-none p-1.5"
          >
            <span className="sr-only">Dismiss</span>
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </Transition>
  );
}
