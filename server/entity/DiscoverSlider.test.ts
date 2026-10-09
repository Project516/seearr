import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { defaultSliders, DiscoverSliderType } from '@server/constants/discover';
import { getRepository } from '@server/datasource';
import DiscoverSlider from '@server/entity/DiscoverSlider';
import { setupTestDb } from '@server/test/db';

setupTestDb();

const orderedTypes = async () =>
  (await getRepository(DiscoverSlider).find({ order: { order: 'ASC' } })).map(
    (s) => s.type
  );

describe('DiscoverSlider.bootstrapSliders', () => {
  it('creates the default sliders in order on a new install', async () => {
    await DiscoverSlider.bootstrapSliders();

    assert.deepEqual(
      await orderedTypes(),
      defaultSliders.map((s) => s.type)
    );
  });

  it('places sliders added by an update without sharing an order', async () => {
    const repo = getRepository(DiscoverSlider);
    const added = [
      DiscoverSliderType.RECOMMENDED_FOR_YOU,
      DiscoverSliderType.NEW_FOR_YOU,
    ];
    const existing = defaultSliders.filter((s) => !added.includes(s.type!));
    await repo.save(
      existing.map((s, i) => new DiscoverSlider({ ...s, order: i }))
    );

    await DiscoverSlider.bootstrapSliders();

    const orders = (await repo.find()).map((s) => s.order);
    assert.equal(new Set(orders).size, orders.length);
    assert.deepEqual(
      await orderedTypes(),
      defaultSliders.map((s) => s.type)
    );
  });
});
