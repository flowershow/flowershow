'use client';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { getRepoFullName } from '@/lib/get-repo-full-name';
import { api } from '@/trpc/react';

export default function SitesAdminTable() {
  const checkbox = useRef<HTMLInputElement>(null);
  const [checked, setChecked] = useState(false);
  const [indeterminate, setIndeterminate] = useState(false);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null,
  );

  const { data: sites } = api.site.getAll.useQuery(undefined, {
    initialData: [],
    refetchInterval: 5 * 1000,
    refetchOnWindowFocus: 'always',
  });

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
                      Repository
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Branch
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {sites
                    .sort((a, b) => a.projectName.localeCompare(b.projectName))
                    .map((site, index) => (
                      <tr
                        key={site.id}
                        className={
                          sites.includes(site) ? 'bg-gray-50' : undefined
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
                            onChange={(e) => {
                              let newSelectedSites = [...selectedSites];
                              const shiftKeyPressed = (e as any).nativeEvent
                                .shiftKey;

                              if (
                                shiftKeyPressed &&
                                lastSelectedIndex !== null
                              ) {
                                // Shift key is pressed, handle range selection
                                const start = Math.min(
                                  lastSelectedIndex,
                                  index,
                                );
                                const end = Math.max(lastSelectedIndex, index);
                                const siteIdsInRange = sites
                                  .slice(start, end + 1)
                                  .map((s) => s.id);

                                if (e.target.checked) {
                                  // Select range
                                  siteIdsInRange.forEach((siteId) => {
                                    if (!newSelectedSites.includes(siteId)) {
                                      newSelectedSites.push(siteId);
                                    }
                                  });
                                } else {
                                  // Unselect range
                                  newSelectedSites = newSelectedSites.filter(
                                    (siteId) =>
                                      !siteIdsInRange.includes(siteId),
                                  );
                                }
                                setSelectedSites(newSelectedSites);
                              } else {
                                // Regular click without shift
                                if (e.target.checked) {
                                  newSelectedSites.push(site.id);
                                } else {
                                  newSelectedSites = newSelectedSites.filter(
                                    (s) => s !== site.id,
                                  );
                                }
                                setSelectedSites(newSelectedSites);
                              }
                              // Update the last selected index
                              setLastSelectedIndex(index);
                            }}
                          />
                        </td>
                        <td
                          className={clsx(
                            'whitespace-nowrap py-4 pr-3 text-sm font-medium',
                            selectedSites.includes(site.id)
                              ? 'text-indigo-600'
                              : 'text-gray-900',
                          )}
                        >
                          {site.projectName}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {site.user.username}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {getRepoFullName(site)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {site.ghBranch}
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
