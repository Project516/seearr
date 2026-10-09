import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

import { MediaStatus, MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import { getSettings } from '@server/lib/settings';
import { checkUser, isAuthenticated } from '@server/middleware/auth';
import { setupTestDb } from '@server/test/db';
import type { Express } from 'express';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import authRoutes from './auth';
import mediaRoutes from './media';

let app: Express;

before(() => {
  app = express();
  app.use(express.json());
  app.use(
    session({ secret: 'test-secret', resave: false, saveUninitialized: false })
  );
  app.use(checkUser);
  app.use('/auth', authRoutes);
  app.use('/media', isAuthenticated(), mediaRoutes);
});

setupTestDb();

async function adminAgent() {
  getSettings().main.localLogin = true;
  const agent = request.agent(app);
  const res = await agent
    .post('/auth/local')
    .send({ email: 'admin@seerr.dev', password: 'test1234' });
  assert.strictEqual(res.status, 200);
  return agent;
}

async function seed(mediaType: MediaType, tmdbId: number, status: MediaStatus) {
  await getRepository(Media).save(
    new Media({ mediaType, tmdbId, status, status4k: MediaStatus.UNKNOWN })
  );
}

describe('GET /media mediaType filter', () => {
  it('returns only the requested media type', async () => {
    await seed(MediaType.MOVIE, 101, MediaStatus.AVAILABLE);
    await seed(MediaType.TV, 202, MediaStatus.PARTIALLY_AVAILABLE);
    await seed(MediaType.MOVIE, 303, MediaStatus.PENDING);
    const agent = await adminAgent();

    const movies = await agent.get(
      '/media?filter=allavailable&mediaType=movie'
    );
    assert.strictEqual(movies.status, 200);
    assert.deepStrictEqual(
      movies.body.results.map((m: Media) => m.tmdbId),
      [101]
    );

    const tv = await agent.get('/media?filter=allavailable&mediaType=tv');
    assert.deepStrictEqual(
      tv.body.results.map((m: Media) => m.tmdbId),
      [202]
    );

    const all = await agent.get('/media?filter=allavailable');
    assert.strictEqual(all.body.pageInfo.results, 2);
  });

  it('ignores an unknown media type', async () => {
    await seed(MediaType.MOVIE, 404, MediaStatus.AVAILABLE);
    const agent = await adminAgent();

    const res = await agent.get('/media?filter=allavailable&mediaType=music');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.pageInfo.results, 1);
  });
});
