import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import type { RadarrMovie } from '@server/api/servarr/radarr';
import RadarrAPI from '@server/api/servarr/radarr';
import type { SonarrSeries } from '@server/api/servarr/sonarr';
import SonarrAPI from '@server/api/servarr/sonarr';
import TheMovieDb from '@server/api/themoviedb';
import type {
  TmdbTvDetails,
  TmdbTvSeasonResult,
} from '@server/api/themoviedb/interfaces';
import {
  MediaRequestStatus,
  MediaStatus,
  MediaType,
} from '@server/constants/media';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import MediaRequest from '@server/entity/MediaRequest';
import { User } from '@server/entity/User';
import availabilitySync from '@server/lib/availabilitySync';
import type { RadarrSettings } from '@server/lib/settings';
import { getSettings } from '@server/lib/settings';
import { setupTestDb } from '@server/test/db';

// --- Mock SonarrAPI ---
// --- Mock SonarrAPI ---
let getSeriesByIdImpl: (id: number) => Promise<SonarrSeries> = async () => {
  throw new Error('404');
};

Object.defineProperty(SonarrAPI.prototype, 'getSeriesById', {
  get() {
    return async (id: number) => getSeriesByIdImpl(id);
  },
  set() {},
  configurable: true,
});

// --- Mock RadarrAPI ---
let getMovieImpl: (id: number) => Promise<RadarrMovie> = async () => {
  throw new Error('404');
};

Object.defineProperty(RadarrAPI.prototype, 'getMovie', {
  get() {
    return async ({ id }: { id: number }) => getMovieImpl(id);
  },
  set() {},
  configurable: true,
});

// --- Mock TheMovieDb ---
let getTvShowImpl: (args: {
  tvId: number;
  language?: string;
}) => Promise<TmdbTvDetails> = async () => fakeTmdbShow(1);
let getShowByTvdbIdImpl: (args: {
  tvdbId: number;
  language?: string;
}) => Promise<TmdbTvDetails> = async () => fakeTmdbShow(1);

Object.defineProperty(TheMovieDb.prototype, 'getTvShow', {
  get() {
    return async (args: { tvId: number; language?: string }) =>
      getTvShowImpl(args);
  },
  set() {},
  configurable: true,
});

Object.defineProperty(TheMovieDb.prototype, 'getShowByTvdbId', {
  get() {
    return async (args: { tvdbId: number; language?: string }) =>
      getShowByTvdbIdImpl(args);
  },
  set() {},
  configurable: true,
});

// --- Helpers ---

function fakeTmdbShow(
  tmdbId: number,
  seasons: TmdbTvSeasonResult[] = [
    {
      id: 1,
      air_date: '2024-01-01',
      episode_count: 10,
      name: 'Season 1',
      overview: '',
      season_number: 1,
    },
  ]
): TmdbTvDetails {
  return {
    id: tmdbId,
    content_ratings: { results: [] },
    created_by: [],
    episode_run_time: [],
    first_air_date: '2024-01-01',
    genres: [],
    homepage: '',
    in_production: false,
    languages: ['en'],
    last_air_date: '2024-01-01',
    name: 'Test Show',
    networks: [],
    number_of_episodes: 10,
    number_of_seasons: seasons.length,
    origin_country: ['US'],
    original_language: 'en',
    original_name: 'Test Show',
    overview: '',
    popularity: 0,
    production_companies: [],
    production_countries: [],
    spoken_languages: [],
    seasons,
    status: 'Ended',
    type: 'Scripted',
    vote_average: 0,
    vote_count: 0,
    aggregate_credits: { cast: [] },
    credits: { crew: [] },
    external_ids: {},
    keywords: { results: [] },
    videos: { results: [] },
  };
}

setupTestDb();

function configureRadarr(overrides: Partial<RadarrSettings>[] = [{}]): void {
  const settings = getSettings();
  settings.radarr = overrides.map((o, i) => ({
    id: i,
    name: `Radarr ${i}`,
    hostname: 'localhost',
    port: 7878,
    apiKey: 'test-key',
    baseUrl: '',
    useSsl: false,
    activeProfileId: 1,
    activeProfileName: 'Default',
    activeDirectory: '/movies',
    minimumAvailability: 'released',
    tags: [],
    is4k: false,
    isDefault: i === 0,
    syncEnabled: true,
    preventSearch: false,
    tagRequests: false,
    overrideRule: [],
    externalUrl: '',
    ...o,
  })) as RadarrSettings[];
  settings.sonarr = [];
}

describe('AvailabilitySync', () => {
  beforeEach(async () => {
    getSeriesByIdImpl = async () => {
      throw new Error('404');
    };
    getMovieImpl = async () => {
      throw new Error('404');
    };
    getTvShowImpl = async ({ tvId }) =>
      fakeTmdbShow(
        tvId,
        Array.from({ length: 4 }, (_, i) => ({
          id: i + 1,
          air_date: '2024-01-01',
          episode_count: 10,
          name: `Season ${i + 1}`,
          overview: '',
          season_number: i + 1,
        }))
      );
    getShowByTvdbIdImpl = async ({ tvdbId }) =>
      fakeTmdbShow(
        tvdbId,
        Array.from({ length: 4 }, (_, i) => ({
          id: i + 1,
          air_date: '2024-01-01',
          episode_count: 10,
          name: `Season ${i + 1}`,
          overview: '',
          season_number: i + 1,
        }))
      );

    const userRepository = getRepository(User);
    const existingAdmin = await userRepository.findOne({ where: { id: 1 } });
    if (!existingAdmin) {
      const admin = new User();
      admin.id = 1;
      admin.plexToken = 'test-plex-token';
      admin.email = 'admin@test.com';
      admin.permissions = 2;
      admin.username = 'admin';
      await userRepository.save(admin);
    }
  });

  describe('movie availability - Radarr', () => {
    it('should mark a deleted movie as DELETED when a second standard Radarr instance has a colliding externalServiceId', async () => {
      configureRadarr([{ syncEnabled: true }, { syncEnabled: true }]);

      const mediaRepository = getRepository(Media);

      const media = new Media();
      media.tmdbId = 5000;
      media.mediaType = MediaType.MOVIE;
      media.status = MediaStatus.AVAILABLE;
      media.ratingKey = 'gone-from-plex-rk';
      media.externalServiceId = 300;
      media.serviceId = 0;

      await mediaRepository.save(media);

      // Probed once per standard instance with the same id (300): origin 404s
      // (deleted); the other instance has a different movie at 300.
      let radarrCall = 0;
      getMovieImpl = async (id: number) => {
        if (id !== 300) {
          throw new Error('404');
        }
        radarrCall += 1;
        if (radarrCall === 1) {
          throw new Error('404');
        }
        return {
          id: 300,
          tmdbId: 999999,
          title: 'Unrelated Colliding Movie',
          hasFile: true,
        } as unknown as RadarrMovie;
      };

      await availabilitySync.run();

      const updated = await mediaRepository.findOneOrFail({
        where: { tmdbId: 5000 },
      });

      assert.strictEqual(
        updated.status,
        MediaStatus.DELETED,
        'Movie deleted from its origin instance and Plex must not be kept alive by a colliding externalServiceId on another standard instance'
      );
    });
  });

  describe('movie deletion metadata handling', () => {
    it('should keep service metadata when deleting a 4K movie with an approved 4K request in flight', async () => {
      configureRadarr([{ is4k: true, syncEnabled: true }]);

      const mediaRepository = getRepository(Media);

      const media = new Media();
      media.tmdbId = 687167;
      media.mediaType = MediaType.MOVIE;
      media.status = MediaStatus.UNKNOWN;
      media.status4k = MediaStatus.AVAILABLE;
      media.ratingKey4k = 'req-in-flight-rk';
      media.serviceId4k = 0;
      media.externalServiceId4k = 512;
      media.externalServiceSlug4k = 'test-movie';
      await mediaRepository.save(media);

      // Insert through a query builder with listeners disabled so
      // MediaRequestSubscriber.afterInsert does not try to reach Radarr.
      await getRepository(MediaRequest)
        .createQueryBuilder()
        .insert()
        .into(MediaRequest)
        .values({
          status: MediaRequestStatus.APPROVED,
          media: { id: media.id },
          requestedBy: { id: 1 },
          type: MediaType.MOVIE,
          is4k: true,
        })
        .callListeners(false)
        .execute();

      await availabilitySync.run();

      const updated = await mediaRepository.findOneOrFail({
        where: { tmdbId: 687167 },
      });

      assert.strictEqual(updated.status4k, MediaStatus.DELETED);
      assert.strictEqual(
        updated.externalServiceId4k,
        512,
        'externalServiceId4k must be kept while an approved 4K request is in flight'
      );
      assert.strictEqual(updated.serviceId4k, 0);
      assert.strictEqual(updated.externalServiceSlug4k, 'test-movie');
      assert.strictEqual(
        updated.ratingKey4k,
        'req-in-flight-rk',
        'ratingKey4k must be kept while an approved 4K request is in flight'
      );
    });

    it('should null service metadata when deleting a 4K movie with no open request', async () => {
      configureRadarr([{ is4k: true, syncEnabled: true }]);

      const mediaRepository = getRepository(Media);

      const media = new Media();
      media.tmdbId = 687168;
      media.mediaType = MediaType.MOVIE;
      media.status = MediaStatus.UNKNOWN;
      media.status4k = MediaStatus.AVAILABLE;
      media.ratingKey4k = 'no-request-rk';
      media.serviceId4k = 0;
      media.externalServiceId4k = 640;
      media.externalServiceSlug4k = 'another-movie';
      await mediaRepository.save(media);

      await availabilitySync.run();

      const updated = await mediaRepository.findOneOrFail({
        where: { tmdbId: 687168 },
      });

      assert.strictEqual(updated.status4k, MediaStatus.DELETED);
      assert.strictEqual(updated.externalServiceId4k, null);
      assert.strictEqual(updated.serviceId4k, null);
      assert.strictEqual(updated.externalServiceSlug4k, null);
      assert.strictEqual(updated.ratingKey4k, null);
    });
  });

  describe('movie availability - scan-disabled servers', () => {
    it('should count a configured but scan-disabled 4K Radarr server as existence evidence', async () => {
      configureRadarr([
        { syncEnabled: true },
        { is4k: true, syncEnabled: false, port: 7879 },
      ]);

      const mediaRepository = getRepository(Media);

      const media = new Media();
      media.tmdbId = 687169;
      media.mediaType = MediaType.MOVIE;
      media.status = MediaStatus.UNKNOWN;
      media.status4k = MediaStatus.AVAILABLE;
      media.ratingKey4k = 'not-in-plex-rk';
      media.serviceId4k = 1;
      media.externalServiceId4k = 700;
      await mediaRepository.save(media);

      getMovieImpl = async (id: number) => {
        if (id !== 700) {
          throw new Error('404');
        }
        return {
          id: 700,
          tmdbId: 687169,
          title: 'Test Movie',
          hasFile: true,
        } as unknown as RadarrMovie;
      };

      await availabilitySync.run();

      const updated = await mediaRepository.findOneOrFail({
        where: { tmdbId: 687169 },
      });

      assert.strictEqual(
        updated.status4k,
        MediaStatus.AVAILABLE,
        'A movie present on a configured 4K Radarr server must be kept even when that server has scanning disabled'
      );
    });
  });
});
