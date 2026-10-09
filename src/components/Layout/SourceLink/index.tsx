import defineMessages from '@app/utils/defineMessages';
import { CodeBracketIcon } from '@heroicons/react/24/outline';
import { useIntl } from 'react-intl';

// AGPL section 13: every user must be offered the source. Forks of Seearr
// point this at their own repository.
export const SOURCE_URL = 'https://github.com/Project516/seearr';

export const sourceLinkMessages = defineMessages(
  'components.Layout.SourceLink',
  {
    sourcecode: 'Source code',
  }
);

const SourceLink = ({ className = '' }: { className?: string }) => {
  const intl = useIntl();

  return (
    <a
      href={SOURCE_URL}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-2 rounded-md text-xs font-medium text-gray-400 transition duration-150 hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${className}`}
    >
      <CodeBracketIcon className="h-4 w-4" aria-hidden="true" />
      {intl.formatMessage(sourceLinkMessages.sourcecode)}
    </a>
  );
};

export default SourceLink;
