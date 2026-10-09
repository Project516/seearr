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
import type { MovieResult, TvResult } from '@server/models/Search';
import { mapMovieResult, mapTvResult } from '@server/models/Search';
import { In } from 'typeorm';

// Seeds per source; each seed costs one (cached) TMDB request.
const SEEDS_PER_SOURCE = 10;
export const RECOMMENDATIONS_PAGE_SIZE = 20;

interface Seed {
  tmdbId: number;
  mediaType: MediaType;
}

interface Candidate {
  mediaType: MediaType;
  result: TmdbMovieResult | TmdbTvResult;
  score: number;
}

const key = (mediaType: MediaType, tmdbId: number) => `${mediaType}-${tmdbId}`;

// The user's latest requests plus the newest downloaded media.
export const getRecommendationSeeds = async (user: User): Promise<Seed[]> => {
  const requests = await getRepository(MediaRequest).find({
    where: { requestedBy: { id: user.id } },
    relations: { media: true },
    order: { createdAt: 'DESC' },
    take: SEEDS_PER_SOURCE,
  });
  const library = await getRepository(Media).find({
    where: {
      status: In([MediaStatus.AVAILABLE, MediaStatus.PARTIALLY_AVAILABLE]),
    },
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

// Ranks titles by how many seeds TMDB recommends them for, then by
// popularity, and drops anything already requested, downloaded or blocklisted.
export const getRecommendations = async (
  user: User,
  tmdb: TheMovieDb,
  { page = 1, language }: { page?: number; language?: string } = {}
): Promise<{
  page: number;
  totalPages: number;
  totalResults: number;
  results: (MovieResult | TvResult)[];
}> => {
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
      } catch {
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

  const ranked = [...candidates.values()]
    .filter((c) => {
      const status = mediaFor(c)?.status;
      return (
        status === undefined ||
        status === MediaStatus.UNKNOWN ||
        status === MediaStatus.DELETED
      );
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.result.popularity ?? 0) - (a.result.popularity ?? 0)
    );

  const currentPage = Math.max(1, Math.floor(page));
  const start = (currentPage - 1) * RECOMMENDATIONS_PAGE_SIZE;

  return {
    page: currentPage,
    totalPages: Math.ceil(ranked.length / RECOMMENDATIONS_PAGE_SIZE),
    totalResults: ranked.length,
    results: ranked
      .slice(start, start + RECOMMENDATIONS_PAGE_SIZE)
      .map((c) =>
        c.mediaType === MediaType.MOVIE
          ? mapMovieResult(c.result as TmdbMovieResult, mediaFor(c))
          : mapTvResult(c.result as TmdbTvResult, mediaFor(c))
      ),
  };
};
