export const KEEP_CHANNELS = ['réseaux-sociaux', 'général'];

export const TARGET_STRUCTURE = [
  {
    name: 'GÉNÉRAL',
    type: 'category',
    channels: [
      { name: 'annonces', type: 'text' },
      { name: 'liens-outils', type: 'text' },
      { name: 'credentials', type: 'text' },
      { name: 'planning-posts', type: 'text' },
      { name: 'Vocal', type: 'voice' },
    ],
  },
  {
    name: 'ANALYTICS',
    type: 'category',
    channels: [
      { name: 'stats-réseaux', type: 'text' },
      { name: 'top-contenu', type: 'text' },
    ],
  },
  {
    name: 'PROJETS',
    type: 'category',
    channels: [
      { name: 'créer-un-projet', type: 'text' },
    ],
  },
  {
    name: 'ARCHIVES',
    type: 'category',
    channels: [],
  },
];
