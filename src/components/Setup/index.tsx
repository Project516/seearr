import AppDataWarning from '@app/components/AppDataWarning';
import Button from '@app/components/Common/Button';
import ImageFader from '@app/components/Common/ImageFader';
import PageTitle from '@app/components/Common/PageTitle';
import LanguagePicker from '@app/components/Layout/LanguagePicker';
import SettingsServices from '@app/components/Settings/SettingsServices';
import SetupSteps from '@app/components/Setup/SetupSteps';
import useLocale from '@app/hooks/useLocale';
import useSettings from '@app/hooks/useSettings';
import useToasts from '@app/hooks/useToasts';
import defineMessages from '@app/utils/defineMessages';
import axios from 'axios';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import useSWR, { mutate } from 'swr';

const messages = defineMessages('components.Setup', {
  welcome: 'Welcome to Seearr',
  subtitle: 'Get started by configuring your *arr services',
  setup: 'Setup',
  finish: 'Finish Setup',
  finishing: 'Finishing…',
  configureservices: 'Configure Services',
});

const Setup = () => {
  const intl = useIntl();
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();
  const { locale } = useLocale();
  const settings = useSettings();
  const toasts = useToasts();

  const finishSetup = async () => {
    setIsUpdating(true);
    try {
      const response = await axios.post<{ initialized: boolean }>(
        '/api/v1/settings/initialize'
      );

      setIsUpdating(false);
      if (response.data.initialized) {
        await axios.post('/api/v1/settings/main', { locale });
        mutate('/api/v1/settings/public');
        router.push('/');
      }
    } catch {
      setIsUpdating(false);
      toasts.addToast('Failed to complete setup.', {
        autoDismiss: true,
        appearance: 'error',
      });
    }
  };

  const { data: backdrops } = useSWR<string[]>('/api/v1/backdrops', {
    refreshInterval: 0,
    refreshWhenHidden: false,
    revalidateOnFocus: false,
  });

  if (settings.currentSettings.initialized) return <></>;

  return (
    <div className="relative flex min-h-screen flex-col justify-center bg-gray-900 py-12">
      <PageTitle title={intl.formatMessage(messages.setup)} />
      <ImageFader
        backgroundImages={
          backdrops?.map(
            (backdrop) => `https://image.tmdb.org/t/p/original${backdrop}`
          ) ?? []
        }
      />
      <div className="absolute right-4 top-4 z-50">
        <LanguagePicker />
      </div>
      <div className="relative z-40 px-4 sm:mx-auto sm:w-full sm:max-w-4xl">
        <div className="relative mb-10 h-48 max-w-full sm:mx-auto sm:h-64 sm:max-w-md">
          <Image src="/logo_stacked.svg" alt="Logo" fill />
        </div>
        <AppDataWarning />
        <nav className="relative z-50">
          <ul
            className="divide-y divide-gray-600 rounded-md border border-gray-600 bg-gray-800/50 md:flex md:divide-y-0"
            style={{ backdropFilter: 'blur(5px)' }}
          >
            <SetupSteps
              stepNumber={1}
              description={intl.formatMessage(messages.welcome)}
              active={true}
              completed={false}
            />
            <SetupSteps
              stepNumber={2}
              description={intl.formatMessage(messages.configureservices)}
              active={false}
              isLastStep
            />
          </ul>
        </nav>
        <div className="mt-10 w-full rounded-md border border-gray-600 bg-gray-800/50 p-4 text-white">
          <div className="p-2">
            <div className="mb-4 text-center">
              <div className="mb-2 text-xl font-bold">
                {intl.formatMessage(messages.welcome)}
              </div>
              <div className="text-sm text-gray-400">
                {intl.formatMessage(messages.subtitle)}
              </div>
            </div>
            <SettingsServices />
            <div className="actions">
              <div className="flex justify-end">
                <span className="ml-3 inline-flex rounded-md shadow-sm">
                  <Button
                    buttonType="primary"
                    onClick={() => finishSetup()}
                    disabled={isUpdating}
                  >
                    {isUpdating
                      ? intl.formatMessage(messages.finishing)
                      : intl.formatMessage(messages.finish)}
                  </Button>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setup;
