export interface RoomType {
  id: string;
  type: 'Single (1-in-1)' | 'Double (2-in-1)' | 'Quad (4-in-1)';
  pricePerStudent: number;
  availableRooms: number;
}

export interface Hostel {
  id: string;
  name: string;
  description: string;
  location: string;
  address: string;
  googleMapsLink?: string;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  images: string[];
  roomTypes: RoomType[];
  totalRooms: number;
  startingPrice: number;
  availableRooms: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FilterOptions {
  location: string;
  minPrice: number;
  maxPrice: number;
  roomTypes: string[];
  searchQuery: string;
}