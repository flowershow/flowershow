import { XCircleIcon } from "@heroicons/react/20/solid";

interface Props extends React.PropsWithChildren {
  title: string;
  message: string;
  stack?: string;
}

export const ErrorMessage: React.FC<Props> = ({ title, message, stack }) => {
  return (
    <div className="mx-auto max-w-4xl overflow-scroll rounded-md bg-red-50 p-4 text-left">
      <div className="flex">
        <div className="flex-shrink-0">
          <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
        </div>
        <div className="mx-3">
          <p className="my-0 text-sm font-medium text-red-800">{title}</p>
          <div className="mt-2 text-sm text-red-700">{message}</div>
          {stack && (
            <div className="mt-2 rounded-md bg-white p-4 text-sm">{stack}</div>
          )}
        </div>
      </div>
    </div>
  );
};
