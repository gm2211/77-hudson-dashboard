export interface Service {
  id: number;
  name: string;
  status: 'Operational' | 'Maintenance' | 'Outage';
  notes: string;
  lastChecked: string;
  sortOrder: number;
  markedForDeletion?: boolean;
}

export interface Event {
  id: number;
  title: string;
  subtitle: string;
  details: string[];
  imageUrl: string;
  accentColor: string;
  sortOrder: number;
  markedForDeletion?: boolean;
}

export interface Advisory {
  id: number;
  label: string;
  message: string;
  active: boolean;
  markedForDeletion?: boolean;
}

export interface BuildingConfig {
  id: number;
  buildingNumber: string;
  buildingName: string;
  subtitle: string;
  scrollSpeed: number;
  tickerSpeed: number;
}

export interface Snapshot {
  id: number;
  version: number;
  publishedAt: string;
}

export interface SnapshotData {
  version: number;
  publishedAt: string;
  services: Service[];
  events: Event[];
  advisories: Advisory[];
  config: BuildingConfig | null;
}

export interface SnapshotDiff {
  services: { added: Service[]; removed: Service[]; changed: { from: Service; to: Service }[] };
  events: { added: Event[]; removed: Event[]; changed: { from: Event; to: Event }[] };
  advisories: { added: Advisory[]; removed: Advisory[]; changed: { from: Advisory; to: Advisory }[] };
  config: { changed: { field: string; from: any; to: any }[] };
}
