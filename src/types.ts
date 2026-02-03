export interface Service {
  id: number;
  name: string;
  status: 'Operational' | 'Maintenance' | 'Outage';
  lastChecked: string;
  sortOrder: number;
}

export interface Event {
  id: number;
  title: string;
  subtitle: string;
  details: string[];
  imageUrl: string;
  accentColor: string;
  sortOrder: number;
}

export interface Advisory {
  id: number;
  label: string;
  message: string;
  active: boolean;
}

export interface BuildingConfig {
  id: number;
  buildingNumber: string;
  buildingName: string;
  subtitle: string;
  scrollSpeed: number;
  tickerSpeed: number;
}
