import { at, euclid, midiToHz, seq } from './notation';

describe('notation', () => {
  it('répartit les jetons de seq() sur la grille de 16', () => {
    const bass = seq('0 0:.45 0 12:.75 0 0:.45 0 12:.75');
    expect(bass.map((e) => e.step)).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
    expect(bass[1].vel).toBeCloseTo(0.45);
    expect(bass[3].offset).toBe(12);
  });

  it('ignore les silences et refuse les grilles non divisibles', () => {
    expect(seq('x ~ x ~').map((e) => e.step)).toEqual([0, 8]);
    expect(() => seq('x x x')).toThrow();
  });

  it('génère les rythmes euclidiens attendus', () => {
    expect(euclid(3, 8).map((e) => e.step)).toEqual([0, 6, 12]); // x..x..x.
    expect(euclid(4, 8).map((e) => e.step)).toEqual([0, 4, 8, 12]); // four-on-the-floor
    expect(euclid(5, 16)).toHaveLength(5);
    expect(() => euclid(3, 12)).toThrow();
  });

  it('retrouve un événement par pas et convertit le MIDI', () => {
    const kick = euclid(3, 8, 0.9);
    expect(at(kick, 6)?.vel).toBe(0.9);
    expect(at(kick, 5)).toBeUndefined();
    expect(midiToHz(69)).toBe(440);
    expect(midiToHz(33)).toBeCloseTo(55, 1);
  });
});
