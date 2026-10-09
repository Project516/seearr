import { getRecommendations } from '@server/lib/recommendations';
import logger from '@server/logger';
import { createTmdbWithRegionLanguage } from '@server/routes/discover';
import { Router } from 'express';

const recommendedRoutes = Router();

recommendedRoutes.get('/', async (req, res, next) => {
  if (!req.user) {
    return next({ status: 401, message: 'Unauthorized' });
  }

  try {
    const results = await getRecommendations(
      req.user,
      createTmdbWithRegionLanguage(req.user),
      {
        page: Number(req.query.page) || 1,
        language: (req.query.language as string) ?? req.locale,
      }
    );
    return res.status(200).json(results);
  } catch (e) {
    logger.debug('Something went wrong retrieving recommendations', {
      label: 'API',
      errorMessage: e.message,
    });
    return next({
      status: 500,
      message: 'Unable to retrieve recommendations.',
    });
  }
});

export default recommendedRoutes;
