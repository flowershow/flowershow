import { CollectionItem } from "@/components/CollectionItem.jsx";
import { useState } from "react";

const COLLECTIONS_LOAD_COUNT = 10;

export function CollectionsList({ collections }) {
  const [collectionsCount, setCollectionsCount] = useState(
    COLLECTIONS_LOAD_COUNT
  );

  const handleLoadMore = () => {
    setCollectionsCount((prevCount) => prevCount + COLLECTIONS_LOAD_COUNT);
  };

  return (
    <>
      <div className="md:border-zinc-100 md:pl-6 md:dark:border-zinc-700/40">
        <div className="flex flex-col space-y-16">
          {collections.slice(0, collectionsCount).map((collection) => {
            return (
              <CollectionItem
                key={collection.url_path}
                collection={collection}
              />
            );
          })}
        </div>
      </div>
      {collections.length > collectionsCount && (
        <div className="text-center pt-20">
          <button
            onClick={handleLoadMore}
            type="button"
            className="inline-flex items-center rounded border border-gray-400 px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Show more
          </button>
        </div>
      )}
    </>
  );
}
