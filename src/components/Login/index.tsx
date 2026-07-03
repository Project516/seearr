import ImageFader from '@app/components/Common/ImageFader';
import PageTitle from '@app/components/Common/PageTitle';
import LanguagePicker from '@app/components/Layout/LanguagePicker';
import LocalLogin from '@app/components/Login/LocalLogin';
import useSettings from '@app/hooks/useSettings';
import { useUser } from '@app/hooks/useUser';
import defineMessages from '@app/utils/defineMessages';
import { useRouter } from 'next/dist/client/router';
import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import { CSSTransition, SwitchTransition } from 'react-transition-group';
import useSWR from 'swr';

const messages = defineMessages('components.Login', {
  signin: 'Sign In',
});

const Login = () => {
  const intl = useIntl();
  const router = useRouter();
  const settings = useSettings();
  const { user, revalidate } = useUser();

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const { data: backdrops } = useSWR<string[]>('/api/v1/backdrops', {
    refreshInterval: 0,
    refreshWhenHidden: false,
    revalidateOnFocus: false,
  });

  const localLoginRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative flex min-h-screen flex-col bg-gray-900 py-14">
      <PageTitle title={intl.formatMessage(messages.signin)} />
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
      <div className="relative z-40 mt-10 flex flex-col items-center px-4 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="relative h-48 w-full max-w-full">
          <Image src="/logo_stacked.svg" alt="Logo" fill />
        </div>
      </div>
      <div className="relative z-50 mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div
          className="bg-gray-800/50 shadow sm:rounded-lg"
          style={{ backdropFilter: 'blur(5px)' }}
        >
          <div className="px-10 py-8">
            <SwitchTransition mode="out-in">
              <CSSTransition
                key="local"
                nodeRef={localLoginRef}
                timeout={{ enter: 300, exit: 150 }}
                onEntered={() => {
                  document
                    .querySelector<HTMLInputElement>('#email, #username')
                    ?.focus();
                }}
                classNames={{
                  enter: 'opacity-0',
                  enterActive: 'transition-opacity duration-300 opacity-100',
                  exit: 'opacity-100',
                  exitActive: 'transition-opacity duration-150 opacity-0',
                }}
              >
                <div ref={localLoginRef} className="button-container">
                  {settings.currentSettings.localLogin && (
                    <LocalLogin revalidate={revalidate} />
                  )}
                </div>
              </CSSTransition>
            </SwitchTransition>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
