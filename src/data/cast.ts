/**
 * The avatars adapted so far. Each one started as a third-party game character and was
 * edited in Blender to suit a learning product: costume and weapon pieces removed, bare
 * skin covered, colours moved onto the ASCENT palette — always on top of the original
 * hand-painted textures, never replacing them.
 */
export type Avatar = {
  key: string;
  name: string;
  track: string;
  model: string;
  face: string;
  before: string;
  after: string;
  /** what was changed, in the order it was done */
  edits: string[];
};

export const CAST: Avatar[] = [
  {
    key: 'clinician',
    name: 'The Clinician',
    track: 'Healthcare track',
    model: '/models/clinician.glb',
    face: '/img/cast/clinician-face.webp',
    before: '/img/cast/clinician-before.webp',
    after: '/img/cast/clinician-after.webp',
    edits: [
      'Lab coat, scrubs, stethoscope and staff badge kept as they are',
      'Navy scrubs repainted graphite',
      'Red lanyard repainted burnt orange',
    ],
  },
  {
    key: 'strategist',
    name: 'The Strategist',
    track: 'Consulting track',
    model: '/models/strategist.glb',
    face: '/img/cast/strategist-face.webp',
    before: '/img/cast/strategist-before.webp',
    after: '/img/cast/strategist-after.webp',
    edits: [
      'Cape, floating blades and belt batons removed',
      'Crescent brooch, pendant and chains removed',
      'Bare chest and arms covered with a fitted charcoal shirt',
      'Blue gems neutralised to silver',
    ],
  },
  {
    key: 'analyst',
    name: 'The Analyst',
    track: 'Data track',
    model: '/models/analyst.glb',
    face: '/img/cast/analyst-face.webp',
    before: '/img/cast/analyst-before.webp',
    after: '/img/cast/analyst-after.webp',
    edits: [
      'Both swords removed from the back',
      'All skin below the neck covered with a charcoal base layer',
      'Chest reduced on the model itself',
      'Hot pink repainted brand green',
    ],
  },
];

export const SOURCE_COUNT = 17;

export function avatarByKey(key: string | null | undefined): Avatar {
  return CAST.find((a) => a.key === key) ?? CAST[0]!;
}
