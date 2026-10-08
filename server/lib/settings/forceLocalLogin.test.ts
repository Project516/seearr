import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import forceLocalLogin from '@server/lib/settings/migrations/seearr_force_local_login';

describe('seearr_force_local_login settings migration', () => {
  it('turns local sign-in back on', () => {
    const migrated = forceLocalLogin({ main: { localLogin: false } });
    assert.strictEqual(migrated.main.localLogin, true);
  });

  it('leaves settings without a main section alone', () => {
    assert.deepStrictEqual(forceLocalLogin({}), {});
  });
});
