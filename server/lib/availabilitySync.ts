import RadarrAPI, { type RadarrMovie } from '@server/api/servarr/radarr';
import type { SonarrSeason, SonarrSeries } from '@server/api/servarr/sonarr';
import SonarrAPI from '@server/api/servarr/sonarr';
import TheMovieDb from '@server/api/themoviedb';
import type { TmdbTvDetails } from '@server/api/themoviedb/interfaces';
import { MediaRequestStatus, MediaStatus } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import MediaRequest from '@server/entity/MediaRequest';
import type Season from '@server/entity/Season';
import type { RadarrSettings, SonarrSettings } from '@server/lib/settings';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';

class AvailabilitySync {
  public running = false;

  private sonarrSeasonsCache: Record<string, SonarrSeason[]>;
  private radarrServers: RadarrSettings[];
  private sonarrServers: SonarrSettings[];

  readonly tmdb = new TheMovieDb();

  async run() {
    const settings = getSettings();
    this.running = true;
    this.sonarrSeasonsCache = {};
    this.radarrServers = settings.radarr;
    this.sonarrServers = settings.sonarr;

    try {
      logger.info(`Starting availability sync...`, {
        label: 'AvailabilitySync',
      });
      const pageSize = 50;

      for await (const media of this.loadAvailableMediaPaginated(pageSize)) {
        if (!this.running) {
          throw new Error('Job aborted');
        }

        if (media.mediaType === 'movie') {
          let movieExists = false;
          let movieExists4k = false;

          const existsInRadarr = await this.mediaExistsInRadarr(media, false);
          const existsInRadarr4k = await this.mediaExistsInRadarr(media, true);

          if (existsInRadarr) {
            movieExists = true;
            logger.debug(
              `The non-4K movie [TMDB ID ${media.tmdbId}] still exists. Preventing removal.`,
              {
                label: 'AvailabilitySync',
              }
            );
          }

          if (existsInRadarr4k) {
            movieExists4k = true;
            logger.debug(
              `The 4K movie [TMDB ID ${media.tmdbId}] still exists. Preventing removal.`,
              {
                label: 'AvailabilitySync',
              }
            );
          }

          if (!movieExists && media.status === MediaStatus.AVAILABLE) {
            await this.mediaUpdater(media, false);
          }

          if (!movieExists4k && media.status4k === MediaStatus.AVAILABLE) {
            await this.mediaUpdater(media, true);
          }
        }

        if (media.mediaType === 'tv') {
          let showExists = false;
          let showExists4k = false;

          const { existsInSonarr, seasonsMap: sonarrSeasonsMap } =
            await this.mediaExistsInSonarr(media, false);
          const {
            existsInSonarr: existsInSonarr4k,
            seasonsMap: sonarrSeasonsMap4k,
          } = await this.mediaExistsInSonarr(media, true);

          if (existsInSonarr) {
            showExists = true;
            logger.debug(
              `The non-4K show [TMDB ID ${media.tmdbId}] still exists. Preventing removal.`,
              {
                label: 'AvailabilitySync',
              }
            );
          }

          if (existsInSonarr4k) {
            showExists4k = true;
            logger.debug(
              `The 4K show [TMDB ID ${media.tmdbId}] still exists. Preventing removal.`,
              {
                label: 'AvailabilitySync',
              }
            );
          }

          const filteredSeasonsMap: Map<number, boolean> = new Map();
          media.seasons
            .filter(
              (season) =>
                season.status === MediaStatus.AVAILABLE ||
                season.status === MediaStatus.PARTIALLY_AVAILABLE
            )
            .forEach((season) =>
              filteredSeasonsMap.set(season.seasonNumber, false)
            );

          const filteredSeasonsMap4k: Map<number, boolean> = new Map();
          media.seasons
            .filter(
              (season) =>
                season.status4k === MediaStatus.AVAILABLE ||
                season.status4k === MediaStatus.PARTIALLY_AVAILABLE
            )
            .forEach((season) =>
              filteredSeasonsMap4k.set(season.seasonNumber, false)
            );

          const finalSeasons = new Map([
            ...filteredSeasonsMap,
            ...sonarrSeasonsMap,
          ]);
          const finalSeasons4k = new Map([
            ...filteredSeasonsMap4k,
            ...sonarrSeasonsMap4k,
          ]);

          let tvShow: TmdbTvDetails | undefined;
          try {
            if (media.tmdbId) {
              tvShow = await this.tmdb.getTvShow({
                tvId: Number(media.tmdbId),
              });
            } else if (media.tvdbId) {
              tvShow = await this.tmdb.getShowByTvdbId({
                tvdbId: Number(media.tvdbId),
              });
            }
          } catch (e) {
            logger.debug(
              `Failed to fetch TMDB data for show [TMDB ID ${media.tmdbId}]. Skipping season enrichment.`,
              { label: 'AvailabilitySync', errorMessage: e.message }
            );
          }

          if (tvShow) {
            media.seasons.forEach((season) => {
              // Specials don't count towards availability (baseScanner skips them too)
              // TODO: doesn't respect enableSpecialEpisodes; needs a shared predicate with baseScanner.ts
              if (season.seasonNumber === 0) {
                return;
              }
              if (
                !finalSeasons.has(season.seasonNumber) &&
                tvShow.seasons.find(
                  (s) => s.season_number === season.seasonNumber
                )?.episode_count
              ) {
                finalSeasons.set(season.seasonNumber, false);
              }
              if (
                !finalSeasons4k.has(season.seasonNumber) &&
                tvShow.seasons.find(
                  (s) => s.season_number === season.seasonNumber
                )?.episode_count
              ) {
                finalSeasons4k.set(season.seasonNumber, false);
              }
            });
          }

          if (
            !showExists &&
            (media.status === MediaStatus.AVAILABLE ||
              media.status === MediaStatus.PARTIALLY_AVAILABLE ||
              media.seasons.some(
                (season) => season.status === MediaStatus.AVAILABLE
              ) ||
              media.seasons.some(
                (season) => season.status === MediaStatus.PARTIALLY_AVAILABLE
              ))
          ) {
            await this.mediaUpdater(media, false);
          }

          if (
            !showExists4k &&
            (media.status4k === MediaStatus.AVAILABLE ||
              media.status4k === MediaStatus.PARTIALLY_AVAILABLE ||
              media.seasons.some(
                (season) => season.status4k === MediaStatus.AVAILABLE
              ) ||
              media.seasons.some(
                (season) => season.status4k === MediaStatus.PARTIALLY_AVAILABLE
              ))
          ) {
            await this.mediaUpdater(media, true);
          }

          if ([...finalSeasons.values()].includes(false)) {
            await this.seasonUpdater(media, finalSeasons, false);
          }

          if ([...finalSeasons4k.values()].includes(false)) {
            await this.seasonUpdater(media, finalSeasons4k, true);
          }
        }
      }
    } catch (ex) {
      logger.error('Failed to complete availability sync.', {
        errorMessage: ex.message,
        label: 'AvailabilitySync',
      });
    } finally {
      logger.info(`Availability sync complete.`, {
        label: 'AvailabilitySync',
      });
      this.running = false;
    }
  }

  public cancel() {
    this.running = false;
  }

  private async *loadAvailableMediaPaginated(pageSize: number) {
    let offset = 0;
    const mediaRepository = getRepository(Media);
    const whereOptions = [
      { status: MediaStatus.AVAILABLE },
      { status: MediaStatus.PARTIALLY_AVAILABLE },
      { status4k: MediaStatus.AVAILABLE },
      { status4k: MediaStatus.PARTIALLY_AVAILABLE },
      { seasons: { status: MediaStatus.AVAILABLE } },
      { seasons: { status: MediaStatus.PARTIALLY_AVAILABLE } },
      { seasons: { status4k: MediaStatus.AVAILABLE } },
      { seasons: { status4k: MediaStatus.PARTIALLY_AVAILABLE } },
    ];

    let mediaPage: Media[];

    do {
      yield* (mediaPage = await mediaRepository.find({
        where: whereOptions,
        skip: offset,
        take: pageSize,
      }));
      offset += pageSize;
    } while (mediaPage.length > 0);
  }

  private async mediaUpdater(media: Media, is4k: boolean): Promise<void> {
    const mediaRepository = getRepository(Media);

    try {
      // Check if an approved request for this version is still in flight
      // to see if we need to keep the external metadata
      let isMediaProcessing = false;

      const requestRepository = getRepository(MediaRequest);

      const request = await requestRepository
        .createQueryBuilder('request')
        .leftJoinAndSelect('request.media', 'media')
        .where('(media.id = :id)', {
          id: media.id,
        })
        .andWhere(
          '(request.is4k = :is4k AND request.status = :requestStatus)',
          {
            requestStatus: MediaRequestStatus.APPROVED,
            is4k: is4k,
          }
        )
        .getOne();

      if (request) {
        isMediaProcessing = true;
      }

      media[is4k ? 'status4k' : 'status'] = MediaStatus.DELETED;
      media[is4k ? 'serviceId4k' : 'serviceId'] = isMediaProcessing
        ? media[is4k ? 'serviceId4k' : 'serviceId']
        : null;
      media[is4k ? 'externalServiceId4k' : 'externalServiceId'] =
        isMediaProcessing
          ? media[is4k ? 'externalServiceId4k' : 'externalServiceId']
          : null;
      media[is4k ? 'externalServiceSlug4k' : 'externalServiceSlug'] =
        isMediaProcessing
          ? media[is4k ? 'externalServiceSlug4k' : 'externalServiceSlug']
          : null;
      media[is4k ? 'ratingKey4k' : 'ratingKey'] = isMediaProcessing
        ? media[is4k ? 'ratingKey4k' : 'ratingKey']
        : null;

      logger.debug(
        `The ${is4k ? '4K' : 'non-4K'} ${
          media.mediaType === 'movie' ? 'movie' : 'show'
        } [TMDB ID ${media.tmdbId}] was not found in any ${
          media.mediaType === 'movie' ? 'Radarr' : 'Sonarr'
        } and plex instance. Status will be changed to deleted.`,
        { label: 'AvailabilitySync' }
      );

      await mediaRepository.save(media);
    } catch (ex) {
      logger.debug(
        `Failure updating the ${is4k ? '4K' : 'non-4K'} ${
          media.mediaType === 'tv' ? 'show' : 'movie'
        } [TMDB ID ${media.tmdbId}].`,
        {
          errorMessage: ex.message,
          label: 'AvailabilitySync',
        }
      );
    }
  }

  private async seasonUpdater(
    media: Media,
    seasons: Map<number, boolean>,
    is4k: boolean
  ): Promise<void> {
    const mediaRepository = getRepository(Media);

    const seasonsPendingRemoval = new Map(
      [...seasons].filter(([, exists]) => !exists)
    );
    const seasonKeys = [...seasonsPendingRemoval.keys()];
    // Specials can still be marked DELETED below, but shouldn't demote the show
    const nonSpecialSeasonKeys = seasonKeys.filter((key) => key !== 0);

    try {
      for (const mediaSeason of media.seasons) {
        if (
          seasonsPendingRemoval.has(mediaSeason.seasonNumber) &&
          (mediaSeason[is4k ? 'status4k' : 'status'] ===
            MediaStatus.AVAILABLE ||
            mediaSeason[is4k ? 'status4k' : 'status'] ===
              MediaStatus.PARTIALLY_AVAILABLE)
        ) {
          mediaSeason[is4k ? 'status4k' : 'status'] = MediaStatus.DELETED;
        }
      }

      if (
        nonSpecialSeasonKeys.length > 0 &&
        media[is4k ? 'status4k' : 'status'] === MediaStatus.AVAILABLE
      ) {
        media[is4k ? 'status4k' : 'status'] = MediaStatus.PARTIALLY_AVAILABLE;
        logger.debug(
          `Marking the ${
            is4k ? '4K' : 'non-4K'
          } show [TMDB ID ${media.tmdbId}] as PARTIALLY_AVAILABLE because season(s) [${nonSpecialSeasonKeys}] was not found in any Sonarr instance.`,
          { label: 'AvailabilitySync' }
        );
      }

      media.lastSeasonChange = new Date();
      await mediaRepository.save(media);
    } catch (ex) {
      logger.debug(
        `Failure updating the ${
          is4k ? '4K' : 'non-4K'
        } season(s) [${seasonKeys}], TMDB ID ${media.tmdbId}.`,
        {
          errorMessage: ex.message,
          label: 'AvailabilitySync',
        }
      );
    }
  }

  private async mediaExistsInRadarr(
    media: Media,
    is4k: boolean
  ): Promise<boolean> {
    let existsInRadarr = false;

    const hasSameServerInBothModes = this.radarrServers.some((a) =>
      this.radarrServers.some(
        (b) =>
          a.is4k !== b.is4k && a.hostname === b.hostname && a.port === b.port
      )
    );

    // Check for availability in all of the available radarr servers
    // If any find the media, we will assume the media exists
    for (const server of this.radarrServers.filter(
      (server) => server.is4k === is4k
    )) {
      const radarrAPI = new RadarrAPI({
        apiKey: server.apiKey,
        url: RadarrAPI.buildUrl(server, '/api/v3'),
      });

      try {
        let radarr: RadarrMovie | undefined;

        if (media.externalServiceId && !is4k) {
          radarr = await radarrAPI.getMovie({
            id: media.externalServiceId,
          });
        }

        if (media.externalServiceId4k && is4k) {
          radarr = await radarrAPI.getMovie({
            id: media.externalServiceId4k,
          });
        }

        if (radarr && radarr.tmdbId !== media.tmdbId) {
          continue;
        }

        if (radarr && radarr.hasFile) {
          const resolution =
            radarr?.movieFile?.mediaInfo?.resolution?.split('x');
          const is4kMovie =
            resolution?.length === 2 && Number(resolution[0]) >= 2000;

          if (hasSameServerInBothModes && resolution?.length === 2) {
            // Same server in both modes then use resolution to distinguish
            existsInRadarr = is4k ? is4kMovie : !is4kMovie;
          } else {
            // One server type and if file exists, count it
            existsInRadarr = true;
          }
        }
      } catch (ex) {
        if (!ex.message.includes('404')) {
          existsInRadarr = true;
          logger.debug(
            `Failure retrieving the ${is4k ? '4K' : 'non-4K'} movie [TMDB ID ${
              media.tmdbId
            }] from Radarr.`,
            {
              errorMessage: ex.message,
              label: 'AvailabilitySync',
            }
          );
        }
      }

      if (existsInRadarr) break;
    }

    return existsInRadarr;
  }

  private async mediaExistsInSonarr(
    media: Media,
    is4k: boolean
  ): Promise<{ existsInSonarr: boolean; seasonsMap: Map<number, boolean> }> {
    let existsInSonarr = false;
    let preventSeasonSearch = false;

    // Check for availability in all of the available sonarr servers
    // If any find the media, we will assume the media exists
    for (const server of this.sonarrServers.filter((server) => {
      return server.is4k === is4k;
    })) {
      const sonarrAPI = new SonarrAPI({
        apiKey: server.apiKey,
        url: SonarrAPI.buildUrl(server, '/api/v3'),
      });

      try {
        let sonarr: SonarrSeries | undefined;

        if (media.externalServiceId && !is4k) {
          sonarr = await sonarrAPI.getSeriesById(media.externalServiceId);
        }

        if (media.externalServiceId4k && is4k) {
          sonarr = await sonarrAPI.getSeriesById(media.externalServiceId4k);
        }

        if (sonarr && media.tvdbId != null && sonarr.tvdbId !== media.tvdbId) {
          continue;
        }

        if (sonarr) {
          const externalServiceId = is4k
            ? media.externalServiceId4k
            : media.externalServiceId;
          this.sonarrSeasonsCache[`${server.id}-${externalServiceId}`] =
            sonarr.seasons;

          if (sonarr.statistics.episodeFileCount > 0) {
            existsInSonarr = true;
          }
        }
      } catch (ex) {
        if (!ex.message.includes('404')) {
          existsInSonarr = true;
          preventSeasonSearch = true;
          logger.debug(
            `Failure retrieving the ${is4k ? '4K' : 'non-4K'} show [TMDB ID ${
              media.tmdbId
            }] from Sonarr.`,
            {
              errorMessage: ex.message,
              label: 'AvailabilitySync',
            }
          );
        }
      }
    }

    // Here we check each season for availability
    // If the API returns an error other than a 404,
    // we will have to prevent the season check from happening
    const seasonsMap: Map<number, boolean> = new Map();

    if (!preventSeasonSearch) {
      const filteredSeasons = media.seasons.filter(
        (season) =>
          season[is4k ? 'status4k' : 'status'] === MediaStatus.AVAILABLE ||
          season[is4k ? 'status4k' : 'status'] ===
            MediaStatus.PARTIALLY_AVAILABLE
      );

      for (const season of filteredSeasons) {
        const seasonExists = await this.seasonExistsInSonarr(
          media,
          season,
          is4k
        );

        if (seasonExists) {
          seasonsMap.set(season.seasonNumber, true);
        }
      }
    }

    return { existsInSonarr, seasonsMap };
  }

  private async seasonExistsInSonarr(
    media: Media,
    season: Season,
    is4k: boolean
  ): Promise<boolean> {
    let seasonExists = false;

    // Check each sonarr instance to see if the media still exists
    // If found, we will assume the media exists and prevent removal
    // We can use the cache we built when we fetched the series with mediaExistsInSonarr
    for (const server of this.sonarrServers.filter(
      (server) => server.is4k === is4k
    )) {
      let sonarrSeasons: SonarrSeason[] | undefined;

      if (media.externalServiceId && !is4k) {
        sonarrSeasons =
          this.sonarrSeasonsCache[`${server.id}-${media.externalServiceId}`];
      }

      if (media.externalServiceId4k && is4k) {
        sonarrSeasons =
          this.sonarrSeasonsCache[`${server.id}-${media.externalServiceId4k}`];
      }

      const seasonIsAvailable = sonarrSeasons?.find(
        ({ seasonNumber, statistics }) =>
          season.seasonNumber === seasonNumber &&
          statistics?.episodeFileCount &&
          statistics?.episodeFileCount > 0
      );

      if (seasonIsAvailable && sonarrSeasons) {
        seasonExists = true;
      }
    }

    return seasonExists;
  }
}

const availabilitySync = new AvailabilitySync();

export default availabilitySync;
