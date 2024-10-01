"use client";
import { useModal } from "@/components/modal/provider";
import RequestDataModal from "@/components/modal/request-data";

export function DataRequestBanner() {
  const modal = useModal();

  return (
    <div className="fixed inset-x-0 bottom-0 flex items-center justify-center gap-x-4 bg-gray-900 px-6 py-1.5 sm:px-3.5">
      <p className="text-sm leading-6 text-white">
        <button onClick={() => modal?.show(<RequestDataModal />)}>
          <strong className="font-semibold">
            Not finding the right data? We can get it for you!
          </strong>
          <svg
            viewBox="0 0 2 2"
            aria-hidden="true"
            className="mx-2 inline h-0.5 w-0.5 fill-current"
          >
            <circle r={1} cx={1} cy={1} />
          </svg>
          Request data now&nbsp;<span aria-hidden="true">&rarr;</span>
        </button>
      </p>
    </div>
  );
}
