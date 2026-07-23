import { AmbientAudioService } from './ambient-audio.service';

describe('AmbientAudioService', () => {
  it("reste inerte sans AudioContext (jsdom) — la garde d'environnement tient", () => {
    const service = new AmbientAudioService();
    expect(service.playing()).toBe(false);

    service.toggle();

    expect(service.playing()).toBe(false);
  });
});
