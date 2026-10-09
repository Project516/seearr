import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import TheMovieDb from '@server/api/themoviedb';
import type { TmdbMovieDetails } from '@server/api/themoviedb/interfaces';
import {
  MediaRequestStatus,
  MediaStatus,
  MediaType,
} from '@server/constants/media';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import { MediaRequest } from '@server/entity/MediaRequest';
import { User } from '@server/entity/User';
import {
  clearRecommendationsCache,
  getRecommendations,
} from '@server/lib/recommendations';
import { setupTestDb } from '@server/test/db';

setupTestDb();

// Saving an approved request runs hooks that look the movie up on TMDB.
Object.defineProperty(TheMovieDb.prototype, 'getMovie', {
  get() {
    return async ({ movieId }: { movieId: number }) =>
      ({
        id: movieId,
        title: `Movie ${movieId}`,
        genres: [],
        external_ids: {},
        release_dates: { results: [] },
        credits: { cast: [], crew: [] },
        keywords: { keywords: [] },
        production_companies: [],
        production_countries: [],
        spoken_languages: [],
        videos: { results: [] },
      }) as unknown as TmdbMovieDetails;
  },
  set() {},
  configurable: true,
});

const movie = (
  id: number,
  popularity = 1,
  genre_ids: number[] = [],
  release_date = '2020-01-01'
) => ({
  id,
  media_type: 'movie',
  title: `Movie ${id}`,
  popularity,
  genre_ids,
  release_date,
});

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

// A TMDB stub that recommends the given titles for every seed.
const tmdbReturning = (results: ReturnType<typeof movie>[]) =>
  ({
    getMovieRecommendations: async () => ({
      page: 1,
      total_pages: 1,
      total_results: results.length,
      results,
    }),
  }) as unknown as TheMovieDb;

async function seedLibraryMovie(tmdbId: number) {
  await getRepository(Media).save(
    new Media({
      tmdbId,
      mediaType: MediaType.MOVIE,
      status: MediaStatus.AVAILABLE,
      status4k: MediaStatus.UNKNOWN,
    })
  );
  return getRepository(User).findOneOrFail({ where: { id: 1 } });
}

// TMDB recommendations per seed tmdbId.
let tmdbCalls = 0;
const recommendationsFor: Record<number, ReturnType<typeof movie>[]> = {
  10: [
    movie(500, 5),
    movie(600, 50),
    movie(700),
    movie(20),
    movie(900),
    movie(950),
  ],
  20: [movie(500, 5), movie(800)],
};
const tmdb = {
  getMovieRecommendations: async ({ movieId }: { movieId: number }) => {
    tmdbCalls++;
    const results = recommendationsFor[movieId] ?? [];
    return {
      page: 1,
      total_pages: 1,
      total_results: results.length,
      results,
    };
  },
  getTvRecommendations: async () => {
    throw new Error('TMDB unavailable');
  },
} as unknown as TheMovieDb;

async function seed() {
  const user = await getRepository(User).findOneOrFail({ where: { id: 1 } });
  const save = (tmdbId: number, mediaType: MediaType, status: MediaStatus) =>
    getRepository(Media).save(
      new Media({ tmdbId, mediaType, status, status4k: MediaStatus.UNKNOWN })
    );

  const requested = await save(10, MediaType.MOVIE, MediaStatus.PROCESSING);
  await getRepository(MediaRequest).save(
    new MediaRequest({
      type: MediaType.MOVIE,
      media: requested,
      requestedBy: user,
      modifiedBy: user,
      status: MediaRequestStatus.APPROVED,
      is4k: false,
    })
  );
  await save(20, MediaType.MOVIE, MediaStatus.AVAILABLE);
  await save(30, MediaType.TV, MediaStatus.AVAILABLE);
  // Blocklisted, requested in 4K only, and downloaded then removed.
  await save(700, MediaType.MOVIE, MediaStatus.BLOCKLISTED);
  await getRepository(Media).save(
    new Media({
      tmdbId: 900,
      mediaType: MediaType.MOVIE,
      status: MediaStatus.UNKNOWN,
      status4k: MediaStatus.PENDING,
    })
  );
  await save(950, MediaType.MOVIE, MediaStatus.DELETED);
  return user;
}

describe('getRecommendations', () => {
  beforeEach(() => {
    clearRecommendationsCache();
    tmdbCalls = 0;
  });

  it('ranks by how many seeds recommend a title, then popularity', async () => {
    const user = await seed();

    const res = await getRecommendations(user, tmdb);

    assert.deepStrictEqual(
      res.results.map((r) => r.id),
      [500, 600, 800]
    );
    assert.strictEqual(res.totalResults, 3);
    assert.strictEqual(res.totalPages, 1);
  });

  it('reuses the ranked list for later pages', async () => {
    const user = await seed();

    await getRecommendations(user, tmdb);
    const callsAfterFirst = tmdbCalls;
    const page2 = await getRecommendations(user, tmdb, { page: 2 });

    assert.strictEqual(tmdbCalls, callsAfterFirst);
    assert.deepStrictEqual(page2.results, []);
  });

  it('breaks score ties by genres that recur across candidates', async () => {
    const user = await seedLibraryMovie(40);

    const res = await getRecommendations(
      user,
      tmdbReturning([
        movie(1001, 100, [9]),
        movie(1002, 2, [5]),
        movie(1003, 1, [5]),
      ])
    );

    assert.deepStrictEqual(
      res.results.map((r) => r.id),
      [1002, 1003, 1001]
    );
  });

  it('limits New For You to titles released recently', async () => {
    const user = await seedLibraryMovie(40);

    const res = await getRecommendations(
      user,
      tmdbReturning([
        movie(2001, 1, [], daysAgo(10)),
        movie(2002, 1, [], daysAgo(400)),
        movie(2003, 1, [], daysAgo(-30)),
        movie(2004, 1, [], ''),
      ]),
      { recent: true }
    );

    assert.deepStrictEqual(
      res.results.map((r) => r.id),
      [2001]
    );
  });

  it('returns an empty page for a user with nothing to go on', async () => {
    const user = await getRepository(User).findOneOrFail({ where: { id: 1 } });

    const res = await getRecommendations(user, tmdb);

    assert.deepStrictEqual(res.results, []);
    assert.strictEqual(res.totalPages, 0);
  });
});
