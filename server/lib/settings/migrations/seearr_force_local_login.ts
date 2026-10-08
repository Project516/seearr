import type { AllSettings } from '@server/lib/settings';

// Local sign-in is Seearr's only sign-in method. Settings carried over from
// Seerr may have it turned off, which would leave no way to sign in.
const forceLocalLogin = (settings: any): AllSettings => {
  if (settings.main) {
    settings.main.localLogin = true;
  }
  return settings;
};

export default forceLocalLogin;
