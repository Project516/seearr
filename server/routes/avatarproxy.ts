import { Router } from 'express';

const router = Router();

router.get('/:userId', async (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default router;
