import { CircleXIcon } from "lucide-react";

interface Props extends React.PropsWithChildren {
  title: string;
  message: string;
  stack?: string;
}

export const ErrorMessage: React.FC<Props> = ({ title, message, stack }) => {
  return (
    <div role="alert" className="error-card not-prose">
      <CircleXIcon className="error-card-icon" aria-hidden="true" />
      <div className="error-card-body">
        <p className="error-card-title">{title}</p>
        <div className="error-card-message">{message}</div>
        {stack && <div className="error-card-stack">{stack}</div>}
      </div>
    </div>
  );
};
