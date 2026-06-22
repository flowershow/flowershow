import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export default function Loading() {
  return (
    <SkeletonTheme baseColor="#f5f5f4" highlightColor="#e7e5e4">
      <div className="h-full flex flex-col space-y-6">
        <div className="flex justify-end pt-6">
          <Skeleton width={120} height={32} borderRadius={6} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {['a', 'b', 'c', 'd', 'e', 'f'].map((id) => (
            <div
              key={id}
              className="relative rounded-lg border border-stone-200 pb-10 shadow-md"
            >
              <div className="p-4">
                <Skeleton width="60%" height={28} borderRadius={6} />
              </div>
              <div className="absolute bottom-4 px-4">
                <Skeleton width={140} height={28} borderRadius={6} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonTheme>
  );
}
