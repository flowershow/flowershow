import { XIcon } from "@heroicons/react/solid";
import { useState } from "react";
import { Transition } from "@headlessui/react";

export default function Banner() {
  const [isShowing, setShow] = useState(true);
  return (
    <Transition
      show={isShowing}
      enter="transition-opacity duration-75"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition-opacity duration-150"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className="relative isolate flex items-center gap-x-6 overflow-hidden bg-zinc-900 text-white px-6 py-2.5 sm:px-3.5 sm:before:flex-1">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-sm leading-6 text-white">
            Discover 🌀 PortalJS - the JavaScript framework for data portals.
          </p>
          <a
            href="https://portaljs.org"
            className="flex-none rounded-full bg-orange-400 px-3.5 py-1 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
            Learn more <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
        <div className="flex flex-1 justify-end">
          <button
            onClick={() => setShow(false)}
            type="button"
            className="-m-3 p-3 focus-visible:outline-offset-[-4px]"
          >
            <span className="sr-only">Dismiss</span>
            <XIcon className="h-5 w-5 text-white" aria-hidden="true" />
          </button>
        </div>
      </div>
    </Transition>
  );
}
