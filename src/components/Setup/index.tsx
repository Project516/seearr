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
import { useCallback, useState } from 'react';
import { useIntl } from 'react-intl';
import useSWR, { mutate } from 'swr';

const messages = defineMessages('components.Setup', {
  welcome: 'Welcome to Seearr',
  subtitle: 'Get started by creating your admin account',
  setup: 'Setup',
  finish: 'Finish Setup',
  finishing: 'Finishing…',
  continue: 'Continue',
  createAccount: 'Create Admin Account',
  email: 'Email Address',
  password: 'Password',
  confirmPassword: 'Confirm Password',
  validationemailrequired: 'You must provide a valid email address',
  validationpasswordrequired: 'You must provide a password',
  validationpasswordmatch: 'Passwords must match',
  validationpasswordlength: 'Password must be at least 8 characters',
  createaccount: 'Create Account',
  creatingaccount: 'Creating Account…',
  accountCreated: 'Account created! Now configure your services.',
  configureservices: 'Configure Services',
});

const Setup = () => {
  const intl = useIntl();
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [accountCreated, setAccountCreated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [createError, setCreateError] = useState('');
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

  const createAccount = useCallback(async () => {
    setCreateError('');

    if (!email || !password) {
      setCreateError(intl.formatMessage(messages.validationemailrequired));
      return;
    }

    if (password.length < 8) {
      setCreateError(intl.formatMessage(messages.validationpasswordlength));
      return;
    }

    if (password !== confirmPassword) {
      setCreateError(intl.formatMessage(messages.validationpasswordmatch));
      return;
    }

    try {
      // Create the first admin user via setup endpoint
      await axios.post('/api/v1/auth/setup', {
        email,
        password,
      });

      // Wait for session to be established
      await mutate('/api/v1/auth/me');

      setAccountCreated(true);
      setCurrentStep(2);
    } catch (e) {
      setCreateError(
        axios.isAxiosError(e)
          ? e.response?.data?.error || 'Failed to create account'
          : 'Failed to create account'
      );
    }
  }, [email, password, confirmPassword, intl, messages]);

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
              description={intl.formatMessage(messages.createAccount)}
              active={currentStep === 1}
              completed={currentStep > 1}
            />
            <SetupSteps
              stepNumber={2}
              description={intl.formatMessage(messages.configureservices)}
              active={currentStep === 2}
              isLastStep
            />
          </ul>
        </nav>
        <div className="mt-10 w-full rounded-md border border-gray-600 bg-gray-800/50 p-4 text-white">
          {currentStep === 1 && (
            <div className="flex flex-col items-center p-4">
              <div className="mb-2 text-xl font-bold">
                {intl.formatMessage(messages.welcome)}
              </div>
              <div className="mb-6 text-sm text-gray-400">
                {intl.formatMessage(messages.subtitle)}
              </div>
              <div className="w-full max-w-sm">
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium text-gray-300">
                    {intl.formatMessage(messages.email)}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="admin@example.com"
                  />
                </div>
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium text-gray-300">
                    {intl.formatMessage(messages.password)}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium text-gray-300">
                    {intl.formatMessage(messages.confirmPassword)}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>
                {createError && (
                  <div className="mb-4 rounded-md bg-red-600 p-3 text-sm text-white">
                    {createError}
                  </div>
                )}
                <Button
                  buttonType="primary"
                  onClick={createAccount}
                  className="w-full"
                >
                  {intl.formatMessage(messages.createaccount)}
                </Button>
              </div>
            </div>
          )}
          {currentStep === 2 && (
            <div className="p-2">
              {accountCreated && (
                <div className="mb-4 rounded-md bg-green-600/20 p-3 text-sm text-green-400">
                  {intl.formatMessage(messages.accountCreated)}
                </div>
              )}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default Setup;
