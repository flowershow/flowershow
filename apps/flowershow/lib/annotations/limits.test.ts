import { ANNOTATION_LIMITS as CONTRACT_LIMITS } from '@flowershow/api-contract';
import { describe, expect, it } from 'vitest';
import { ANNOTATION_LIMITS } from './limits';

describe('client annotation limits', () => {
  it('equal the API contract limits, key for key', () => {
    expect(ANNOTATION_LIMITS).toEqual(CONTRACT_LIMITS);
  });
});
