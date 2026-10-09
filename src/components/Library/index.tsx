import Header from '@app/components/Common/Header';
import PageTitle from '@app/components/Common/PageTitle';
import TitleCard from '@app/components/TitleCard';
import TmdbTitleCard from '@app/components/TitleCard/TmdbTitleCard';
import { useUpdateQueryParams } from '@app/hooks/useUpdateQueryParams';
import useVerticalScroll from '@app/hooks/useVerticalScroll';
import ErrorPage from '@app/pages/_error';
import defineMessages from '@app/utils/defineMessages';
import { BarsArrowDownIcon, FunnelIcon } from '@heroicons/react/24/solid';
import type { MediaResultsResponse } from '@server/interfaces/api/mediaInterfaces';
import { useRouter } from 'next/router';
import { useIntl } from 'react-intl';
import useSWRInfinite from 'swr/infinite';

const messages = defineMessages('components.Library', {
  library: 'Library',
  allMedia: 'Movies & Series',
  movies: 'Movies',
  series: 'Series',
  mediaType: 'Media type',
  sortBy: 'Sort by',
  sortAdded: 'Recently Added',
  sortUpdated: 'Recently Updated',
  titleCount: '{count, plural, one {# title} other {# titles}}',
  empty: 'Nothing here yet',
  emptyDescription:
    'Titles show up once Radarr or Sonarr has downloaded them and the Radarr and Sonarr scan jobs have run.',
});

const PAGE_SIZE = 20;

const Library = () => {
  const intl = useIntl();
  const router = useRouter();
  const updateQueryParams = useUpdateQueryParams(router.query);

  const mediaType =
    router.query.type === 'movie' || router.query.type === 'tv'
      ? router.query.type
      : undefined;
  const sort = router.query.sort === 'modified' ? 'modified' : 'mediaAdded';

  const { data, error, size, setSize, isValidating } =
    useSWRInfinite<MediaResultsResponse>(
      (pageIndex, previousPage: MediaResultsResponse | null) => {
        if (previousPage && pageIndex >= previousPage.pageInfo.pages) {
          return null;
        }
        const params = new URLSearchParams({
          filter: 'allavailable',
          take: String(PAGE_SIZE),
          skip: String(pageIndex * PAGE_SIZE),
          sort,
        });
        if (mediaType) params.set('mediaType', mediaType);
        return `/api/v1/media?${params.toString()}`;
      },
      { initialSize: 1, revalidateFirstPage: false }
    );

  const media = data?.flatMap((page) => page.results) ?? [];
  const totalResults = data?.[0]?.pageInfo.results ?? 0;
  const isLoadingInitialData = !data && !error;
  const isLoadingMore =
    isLoadingInitialData || (size > 0 && !!data && !data[size - 1]);
  const isEmpty = !isLoadingInitialData && totalResults === 0;
  const isReachingEnd = isEmpty || (!!data && media.length >= totalResults);

  useVerticalScroll(
    () => setSize(size + 1),
    !isLoadingMore && !isValidating && !isReachingEnd
  );

  if (error && !data?.length) {
    return <ErrorPage statusCode={500} />;
  }

  const title = intl.formatMessage(messages.library);

  return (
    <>
      <PageTitle title={title} />
      <div className="mb-4 flex flex-col justify-between lg:flex-row lg:items-end">
        <Header
          subtext={
            !isLoadingInitialData && !isEmpty
              ? intl.formatMessage(messages.titleCount, {
                  count: totalResults,
                })
              : undefined
          }
        >
          {title}
        </Header>
        <div className="mt-2 flex flex-grow flex-col sm:flex-row lg:flex-grow-0">
          <div className="mb-2 flex flex-grow sm:mb-0 sm:mr-2 lg:flex-grow-0">
            <span className="inline-flex cursor-default items-center rounded-l-md border border-r-0 border-gray-500 bg-gray-800 px-3 text-gray-100 sm:text-sm">
              <FunnelIcon className="h-6 w-6" />
            </span>
            <select
              id="type"
              name="type"
              aria-label={intl.formatMessage(messages.mediaType)}
              className="rounded-r-only"
              value={mediaType ?? 'all'}
              onChange={(e) =>
                updateQueryParams(
                  'type',
                  e.target.value === 'all' ? undefined : e.target.value
                )
              }
            >
              <option value="all">
                {intl.formatMessage(messages.allMedia)}
              </option>
              <option value="movie">
                {intl.formatMessage(messages.movies)}
              </option>
              <option value="tv">{intl.formatMessage(messages.series)}</option>
            </select>
          </div>
          <div className="mb-2 flex flex-grow sm:mb-0 lg:flex-grow-0">
            <span className="inline-flex cursor-default items-center rounded-l-md border border-r-0 border-gray-500 bg-gray-800 px-3 text-gray-100 sm:text-sm">
              <BarsArrowDownIcon className="h-6 w-6" />
            </span>
            <select
              id="sort"
              name="sort"
              aria-label={intl.formatMessage(messages.sortBy)}
              className="rounded-r-only"
              value={sort}
              onChange={(e) =>
                updateQueryParams(
                  'sort',
                  e.target.value === 'mediaAdded' ? undefined : e.target.value
                )
              }
            >
              <option value="mediaAdded">
                {intl.formatMessage(messages.sortAdded)}
              </option>
              <option value="modified">
                {intl.formatMessage(messages.sortUpdated)}
              </option>
            </select>
          </div>
        </div>
      </div>
      {isEmpty ? (
        <div className="mt-24 flex flex-col items-center text-center">
          <p className="text-2xl font-semibold text-gray-300">
            {intl.formatMessage(messages.empty)}
          </p>
          <p className="mt-2 max-w-md text-gray-400">
            {intl.formatMessage(messages.emptyDescription)}
          </p>
        </div>
      ) : (
        <ul className="cards-vertical" data-testid="library-grid">
          {media.map((item) => (
            <li key={`library-${item.id}`}>
              <TmdbTitleCard
                id={item.id}
                tmdbId={item.tmdbId}
                tvdbId={item.tvdbId}
                type={item.mediaType}
                canExpand
              />
            </li>
          ))}
          {isLoadingMore &&
            !isReachingEnd &&
            [...Array(PAGE_SIZE)].map((_item, i) => (
              <li key={`placeholder-${i}`}>
                <TitleCard.Placeholder canExpand />
              </li>
            ))}
        </ul>
      )}
    </>
  );
};

export default Library;
