import type TheMovieDb from '@server/api/themoviedb';
import type {
  TmdbMovieResult,
  TmdbTvResult,
} from '@server/api/themoviedb/interfaces';
import { MediaStatus, MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import { MediaRequest } from '@server/entity/MediaRequest';
import type { User } from '@server/entity/User';
import logger from '@server/logger';
import type { MovieResult, TvResult } from '@server/models/Search';
import { mapMovieResult, mapTvResult } from '@server/models/Search';
import { In } from 'typeorm';

// Seeds per source; each seed costs one (cached) TMDB request.
const SEEDS_PER_SOURCE = 10;
export const RECOMMENDATIONS_PAGE_SIZE = 20;
const CACHE_TTL_MS = 5 * 60 * 1000;
// "New For You" keeps titles released within this window, up to today.
const RECENT_DAYS = 180;

const DOWNLOADED = [MediaStatus.AVAILABLE, MediaStatus.PARTIALLY_AVAILABLE];

interface Seed {
  tmdbId: number;
  mediaType: MediaType;
}

interface Candidate {
  mediaType: MediaType;
  result: TmdbMovieResult | TmdbTvResult;
  score: number;
}

type Recommendation = MovieResult | TvResult;

const key = (mediaType: MediaType, tmdbId: number) => `${mediaType}-${tmdbId}`;

// Ranked lists per user and language. Pages of one slider share a list, and
// concurrent requests share one computation.
const cache = new Map<
  string,
  { expires: number; ranked: Promise<Recommendation[]> }
>();

// The user's latest requests plus the newest downloaded media, 4K included.
export const getRecommendationSeeds = async (user: User): Promise<Seed[]> => {
  const requests = await getRepository(MediaRequest).find({
    where: { requestedBy: { id: user.id } },
    relations: { media: true },
    order: { createdAt: 'DESC' },
    take: SEEDS_PER_SOURCE,
  });
  const library = await getRepository(Media).find({
    where: [{ status: In(DOWNLOADED) }, { status4k: In(DOWNLOADED) }],
    order: { mediaAddedAt: 'DESC', id: 'DESC' },
    take: SEEDS_PER_SOURCE,
  });

  const seeds = new Map<string, Seed>();
  for (const media of [...requests.map((r) => r.media), ...library]) {
    if (media?.tmdbId) {
      seeds.set(key(media.mediaType, media.tmdbId), {
        tmdbId: media.tmdbId,
        mediaType: media.mediaType,
      });
    }
  }
  return [...seeds.values()];
};

// A title with any media record, in either quality, has been requested,
// downloaded, removed or blocklisted, so it is not a recommendation.
const isUntouched = (media?: Media) =>
  !media ||
  (media.status === MediaStatus.UNKNOWN &&
    media.status4k === MediaStatus.UNKNOWN);

// Genres that recur across the candidates stand in for the user's taste. The
// boost stays below 1, so it only reorders titles with the same score.
const genreBoost = (candidates: Candidate[]) => {
  const weight = new Map<number, number>();
  for (const c of candidates) {
    for (const genre of c.result.genre_ids ?? []) {
      weight.set(genre, (weight.get(genre) ?? 0) + c.score);
    }
  }
  const max = Math.max(1, ...weight.values());
  return (c: Candidate) => {
    const genres = c.result.genre_ids ?? [];
    if (!genres.length) return 0;
    const total = genres.reduce((sum, g) => sum + (weight.get(g) ?? 0), 0);
    return (0.5 * total) / (genres.length * max);
  };
};

const releaseDate = (r: Recommendation) =>
  r.mediaType === 'movie' ? r.releaseDate : r.firstAirDate;

const isRecent = (r: Recommendation, now: number) => {
  const released = Date.parse(releaseDate(r) ?? '');
  return (
    !Number.isNaN(released) &&
    released <= now &&
    released >= now - RECENT_DAYS * 24 * 60 * 60 * 1000
  );
};

// Ranks titles by how many seeds TMDB recommends them for, then by shared
// genres, then by popularity.
const rankRecommendations = async (
  user: User,
  tmdb: TheMovieDb,
  language?: string
): Promise<Recommendation[]> => {
  const seeds = await getRecommendationSeeds(user);
  const candidates = new Map<string, Candidate>();

  const responses = await Promise.all(
    seeds.map(async (seed) => {
      try {
        const data =
          seed.mediaType === MediaType.MOVIE
            ? await tmdb.getMovieRecommendations({
                movieId: seed.tmdbId,
                language,
              })
            : await tmdb.getTvRecommendations({ tvId: seed.tmdbId, language });
        return { mediaType: seed.mediaType, results: data.results };
      } catch (e) {
        logger.debug('Failed to fetch TMDB recommendations for a seed', {
          label: 'Recommendations',
          seed,
          errorMessage: e.message,
        });
        return { mediaType: seed.mediaType, results: [] };
      }
    })
  );

  for (const { mediaType, results } of responses) {
    for (const result of results) {
      const k = key(mediaType, result.id);
      const existing = candidates.get(k);
      if (existing) {
        existing.score += 1;
      } else {
        candidates.set(k, { mediaType, result, score: 1 });
      }
    }
  }
  for (const seed of seeds) {
    candidates.delete(key(seed.mediaType, seed.tmdbId));
  }

  const media = await Media.getRelatedMedia(
    user,
    [...candidates.values()].map((c) => ({
      tmdbId: c.result.id,
      mediaType: c.mediaType,
    }))
  );
  const mediaFor = (c: Candidate) =>
    media.find((m) => m.tmdbId === c.result.id && m.mediaType === c.mediaType);

  const kept = [...candidates.values()].filter((c) => isUntouched(mediaFor(c)));
  const boost = genreBoost(kept);
  const rank = (c: Candidate) => c.score + boost(c);

  return kept
    .sort(
      (a, b) =>
        rank(b) - rank(a) ||
        (b.result.popularity ?? 0) - (a.result.popularity ?? 0)
    )
    .map((c) =>
      c.mediaType === MediaType.MOVIE
        ? mapMovieResult(c.result as TmdbMovieResult, mediaFor(c))
        : mapTvResult(c.result as TmdbTvResult, mediaFor(c))
    );
};

export const getRecommendations = async (
  user: User,
  tmdb: TheMovieDb,
  {
    page = 1,
    language,
    recent = false,
  }: { page?: number; language?: string; recent?: boolean } = {}
): Promise<{
  page: number;
  totalPages: number;
  totalResults: number;
  results: Recommendation[];
}> => {
  const cacheKey = `${user.id}:${language ?? ''}`;
  const now = Date.now();
  let entry = cache.get(cacheKey);
  if (!entry || entry.expires <= now) {
    for (const [k, e] of cache) {
      if (e.expires <= now) cache.delete(k);
    }
    entry = {
      expires: now + CACHE_TTL_MS,
      ranked: rankRecommendations(user, tmdb, language),
    };
    cache.set(cacheKey, entry);
    entry.ranked.catch(() => cache.delete(cacheKey));
  }
  const ranked = recent
    ? (await entry.ranked).filter((r) => isRecent(r, now))
    : await entry.ranked;

  const currentPage = Math.max(1, Math.floor(page));
  const start = (currentPage - 1) * RECOMMENDATIONS_PAGE_SIZE;

  return {
    page: currentPage,
    totalPages: Math.ceil(ranked.length / RECOMMENDATIONS_PAGE_SIZE),
    totalResults: ranked.length,
    results: ranked.slice(start, start + RECOMMENDATIONS_PAGE_SIZE),
  };
};

export const clearRecommendationsCache = (): void => cache.clear();
