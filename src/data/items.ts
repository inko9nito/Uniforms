export type Section = 'girls' | 'boys';

export interface Item {
  id: string;
  section: Section;
  name: string;
  size: string;
  note?: string;
  unitPrice: number;
  lotPrice: number;
}

export const ITEMS: Item[] = [
  // Girls
  { id: 'g1', section: 'girls', name: 'Navy polo', size: 'YS', unitPrice: 5, lotPrice: 30 },
  { id: 'g2', section: 'girls', name: 'Navy polo', size: 'YS', unitPrice: 5, lotPrice: 30 },
  { id: 'g3', section: 'girls', name: 'Gray polo', size: 'YS', unitPrice: 5, lotPrice: 30 },
  { id: 'g4', section: 'girls', name: 'Gray polo', size: 'YS', unitPrice: 5, lotPrice: 30 },
  { id: 'g5', section: 'girls', name: 'White polo', size: 'YS', note: 'Small marker blemish', unitPrice: 5, lotPrice: 30 },
  { id: 'g6', section: 'girls', name: 'Pleat skort', size: '8R', unitPrice: 5, lotPrice: 30 },
  { id: 'g7', section: 'girls', name: 'Twill walking shorts', size: '8R', note: 'Brand new with tags', unitPrice: 5, lotPrice: 30 },
  // Boys
  { id: 'b1', section: 'boys', name: 'Navy polo', size: 'YM', unitPrice: 5, lotPrice: 30 },
  { id: 'b2', section: 'boys', name: 'Navy polo (performance)', size: 'YM', unitPrice: 5, lotPrice: 30 },
  { id: 'b3', section: 'boys', name: 'Navy polo (performance)', size: 'YM', unitPrice: 5, lotPrice: 30 },
  { id: 'b4', section: 'boys', name: 'Gray polo', size: 'YM', unitPrice: 5, lotPrice: 30 },
  { id: 'b5', section: 'boys', name: 'Gray polo', size: 'YM', note: 'Marker blemish', unitPrice: 5, lotPrice: 30 },
  { id: 'b6', section: 'boys', name: 'White polo', size: 'YM', unitPrice: 5, lotPrice: 30 },
  { id: 'b7', section: 'boys', name: 'Spirit shirt', size: 'YL', unitPrice: 5, lotPrice: 30 },
  { id: 'b8', section: 'boys', name: 'Navy twill pants', size: '12R', unitPrice: 5, lotPrice: 30 },
];

export const LOT_PRICE = 30;
export const UNIT_PRICE = 5;
