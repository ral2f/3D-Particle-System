export interface Preset {
  id: string;
  name: string;
  template: string;
  color: string;
  count: number;
  size: number;
  category: 'romantic' | 'party' | 'nature' | 'cosmic' | 'abstract';
}

export const presets: Preset[] = [
  {
    id: 'romantic-hearts',
    name: 'Romantic Hearts',
    template: 'hearts',
    color: '#ff1744',
    count: 15000,
    size: 8,
    category: 'romantic'
  },
  {
    id: 'wedding-flowers',
    name: 'Wedding Flowers',
    template: 'flowers',
    color: '#f8bbd0',
    count: 18000,
    size: 6,
    category: 'romantic'
  },
  {
    id: 'cosmic-galaxy',
    name: 'Cosmic Galaxy',
    template: 'galaxy',
    color: '#7c4dff',
    count: 20000,
    size: 4,
    category: 'cosmic'
  },
  {
    id: 'life-dna',
    name: 'Life DNA',
    template: 'dna',
    color: '#00e676',
    count: 12000,
    size: 7,
    category: 'abstract'
  },
  {
    id: 'party-fireworks',
    name: 'Party Fireworks',
    template: 'fireworks',
    color: '#ffd600',
    count: 16000,
    size: 10,
    category: 'party'
  },
  {
    id: 'butterfly-garden',
    name: 'Butterfly Garden',
    template: 'butterfly',
    color: '#ff6e40',
    count: 14000,
    size: 6,
    category: 'nature'
  },
  {
    id: 'ocean-wave',
    name: 'Ocean Wave',
    template: 'wave',
    color: '#00b8d4',
    count: 22000,
    size: 5,
    category: 'nature'
  },
  {
    id: 'tornado-vortex',
    name: 'Tornado Vortex',
    template: 'vortex',
    color: '#78909c',
    count: 17000,
    size: 5,
    category: 'abstract'
  },
  {
    id: 'northern-lights',
    name: 'Northern Lights',
    template: 'aurora',
    color: '#1de9b6',
    count: 19000,
    size: 6,
    category: 'cosmic'
  },
  {
    id: 'sunset-galaxy',
    name: 'Sunset Galaxy',
    template: 'galaxy',
    color: '#ff5722',
    count: 18000,
    size: 5,
    category: 'cosmic'
  }
];
