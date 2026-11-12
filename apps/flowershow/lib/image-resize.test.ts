import { describe, expect, it } from 'vitest';
import { planImageResize } from './image-resize';

describe('planImageResize', () => {
  it('keeps the whole logo and its aspect ratio', () => {
    expect(planImageResize('logo', 1000, 1000)).toEqual({
      sx: 0,
      sy: 0,
      sw: 1000,
      sh: 1000,
      width: 512,
      height: 512,
    });
    expect(planImageResize('logo', 2000, 500)).toMatchObject({
      sw: 2000,
      sh: 500,
      width: 512,
      height: 128,
    });
    expect(planImageResize('logo', 300, 900)).toMatchObject({
      width: 171,
      height: 512,
    });
  });

  it('never upscales a small logo', () => {
    expect(planImageResize('logo', 100, 40)).toMatchObject({
      width: 100,
      height: 40,
    });
  });

  it('crops social images and favicons to their fixed shape, centred', () => {
    expect(planImageResize('image', 2400, 1260)).toEqual({
      sx: 0,
      sy: 0,
      sw: 2400,
      sh: 1260,
      width: 1200,
      height: 630,
    });
    expect(planImageResize('favicon', 400, 200)).toEqual({
      sx: 100,
      sy: 0,
      sw: 200,
      sh: 200,
      width: 128,
      height: 128,
    });
  });
});
