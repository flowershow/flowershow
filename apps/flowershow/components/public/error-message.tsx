import { CircleXIcon } from 'lucide-react';

interface Props extends React.PropsWithChildren {
  title: string;
  message: string;
  stack?: string;
  link?: { href: string; label: string };
}

const ErrorMessage: React.FC<Props> = ({ title, message, stack, link }) => {
  return (
    <div role="alert" className="error-card not-prose">
      <CircleXIcon className="error-card-icon" aria-hidden="true" />
      <div className="error-card-body">
        <p className="error-card-title">{title}</p>
        <div className="error-card-message">{message}</div>
        {link && (
          <a
            className="error-card-link"
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            🧑‍🔧 {link.label}
          </a>
        )}
        {stack && <div className="error-card-stack">{stack}</div>}
      </div>
    </div>
  );
};

export default ErrorMessage;
