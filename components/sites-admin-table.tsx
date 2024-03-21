"use client";
import { useEffect, useRef, useState } from "react";
import { Prisma } from "@prisma/client";
import { toast } from "sonner";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

type Site = Prisma.SiteGetPayload<{
  include: { user: true };
}>;

export default async function SitesAdminTable({
  sites,
  onSync,
}: {
  sites: Site[];
  onSync: (siteId: string) => void;
}) {
  const checkbox = useRef<HTMLInputElement>(null);
  const [checked, setChecked] = useState(false);
  const [indeterminate, setIndeterminate] = useState(false);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);

  async function syncSelectedSites() {
    toast.promise(Promise.all(selectedSites.map((siteId) => onSync(siteId))), {
      loading: "Syncing sites...",
      success: "Sites synced successfully",
      error: "Failed to sync sites",
    });
  }

  useEffect(() => {
    const isIndeterminate =
      selectedSites.length > 0 && selectedSites.length < sites.length;
    setChecked(selectedSites.length === sites.length);
    setIndeterminate(isIndeterminate);
    if (checkbox.current) {
      checkbox.current.indeterminate = isIndeterminate;
    }
  }, [selectedSites]);

  function toggleAll() {
    setSelectedSites(
      checked || indeterminate ? [] : sites.map((site) => site.id),
    );
    setChecked(!checked && !indeterminate);
    setIndeterminate(false);
  }

  return (
    <div className="max-h-screen overflow-y-scroll px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">
            Sites
          </h1>
        </div>
      </div>
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="relative">
              {selectedSites.length > 0 && (
                <div className="absolute left-14 top-0 flex h-12 items-center space-x-3 bg-white sm:left-12">
                  <button
                    type="button"
                    className="inline-flex items-center rounded bg-white px-2 py-1 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white"
                    onClick={() => syncSelectedSites()}
                  >
                    Bulk sync
                  </button>
                </div>
              )}
              <table className="min-w-full table-fixed divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th scope="col" className="relative px-7 sm:w-12 sm:px-6">
                      <input
                        type="checkbox"
                        className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                        ref={checkbox}
                        checked={checked}
                        onChange={toggleAll}
                      />
                    </th>
                    <th
                      scope="col"
                      className="min-w-[12rem] py-3.5 pr-3 text-left text-sm font-semibold text-gray-900"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Owner
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Synced at
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Repository
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Branch
                    </th>
                    <th
                      scope="col"
                      className="relative py-3.5 pl-3 pr-4 sm:pr-3"
                    >
                      <span className="sr-only">Edit</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {sites.map((site) => (
                    <tr
                      key={site.id}
                      className={
                        sites.includes(site) ? "bg-gray-50" : undefined
                      }
                    >
                      <td className="relative px-7 sm:w-12 sm:px-6">
                        {sites.includes(site) && (
                          <div className="absolute inset-y-0 left-0 w-0.5 bg-indigo-600" />
                        )}
                        <input
                          type="checkbox"
                          className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                          value={site.id}
                          checked={selectedSites.includes(site.id)}
                          onChange={(e) =>
                            setSelectedSites(
                              e.target.checked
                                ? [...selectedSites, site.id]
                                : selectedSites.filter((s) => s !== site.id),
                            )
                          }
                        />
                      </td>
                      <td
                        className={classNames(
                          "whitespace-nowrap py-4 pr-3 text-sm font-medium",
                          selectedSites.includes(site.id)
                            ? "text-indigo-600"
                            : "text-gray-900",
                        )}
                      >
                        {site.projectName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {site.user!.gh_username}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {site.syncedAt ? (
                          <time
                            dateTime={new Date(site.syncedAt).toLocaleString()}
                          >
                            {new Date(site.syncedAt).toLocaleString()}
                          </time>
                        ) : (
                          "Not synced"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {site.gh_repository}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {site.gh_branch}
                      </td>
                      <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-3">
                        <button
                          className="text-indigo-600 hover:text-indigo-900"
                          type="button"
                          onClick={() => onSync(site.id)}
                        >
                          Sync<span className="sr-only"></span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
