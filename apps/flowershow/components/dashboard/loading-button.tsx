import clsx from 'clsx';
import LoadingDots from '@/components/icons/loading-dots';

type LoadingButtonProps = React.PropsWithChildren & {
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  variant?: 'filled' | 'outlined';
};

export function LoadingButton({
  loading,
  disabled,
  children,
  variant = 'filled',
  ...props
}: LoadingButtonProps) {
  return (
    <button
      className={clsx(
        'relative flex h-10 items-center justify-center rounded-md border px-4 text-sm transition-all focus:outline-none',
        loading || disabled
          ? 'cursor-not-allowed border-stone-200 dark:border-zinc-700 bg-stone-100 dark:bg-zinc-800 text-stone-400 dark:text-zinc-500   '
          : variant === 'filled'
            ? 'border-black bg-black text-white hover:bg-white hover:text-black dark:border-white dark:bg-white dark:text-black dark:hover:bg-zinc-200     '
            : 'border-black text-black dark:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-800   ',
      )}
      disabled={loading || disabled}
      {...props}
    >
      <div
        className={clsx(
          'flex items-center justify-center transition-opacity',
          loading ? 'opacity-0' : 'opacity-100',
        )}
      >
        {children}
      </div>
      <div
        className={clsx(
          'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity',
          loading ? 'opacity-100' : 'opacity-0',
        )}
      >
        <LoadingDots color="black" />
      </div>
    </button>
  );
}
