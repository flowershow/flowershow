import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const NAV_ITEMS = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'];

// Mirrors the first sections of the real settings page.
const SECTIONS = [
  { id: 'general', cards: ['a', 'b', 'c', 'd'] },
  { id: 'appearance', cards: ['a', 'b', 'c'] },
  { id: 'navigation', cards: ['a', 'b', 'c'] },
];

export default function Loading() {
  return (
    <SkeletonTheme baseColor="#f5f5f4" highlightColor="#e7e5e4">
      <div className="sm:grid sm:grid-cols-12 sm:space-x-6">
        <div className="col-span-2 hidden self-start sm:col-span-3 sm:block lg:col-span-2">
          <div className="flex flex-col space-y-3">
            {NAV_ITEMS.map((id) => (
              <Skeleton key={id} height={20} borderRadius={6} />
            ))}
          </div>
        </div>

        <div className="col-span-10 flex flex-col space-y-12 sm:col-span-9 lg:col-span-10">
          {SECTIONS.map((section, sectionIndex) => (
            <div key={section.id} className="flex flex-col space-y-12">
              {sectionIndex > 0 && (
                <hr className="border-stone-200 dark:border-zinc-700" />
              )}
              <div className="flex flex-col space-y-6">
                <Skeleton width={120} height={28} borderRadius={6} />
                {section.cards.map((card) => (
                  <div
                    key={card}
                    className="flex flex-col space-y-4 rounded-lg border border-stone-200 p-6 dark:border-zinc-700"
                  >
                    <Skeleton width={160} height={24} borderRadius={6} />
                    <Skeleton width="70%" height={16} borderRadius={6} />
                    <Skeleton height={36} borderRadius={6} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonTheme>
  );
}
