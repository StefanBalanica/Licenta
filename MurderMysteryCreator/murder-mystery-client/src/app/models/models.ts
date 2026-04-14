export interface User {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface Game {
  gameId: number;
  userId: number;
  title: string;
  description?: string;
  story?: string;
  solution?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  characterCount: number;
  evidenceCount: number;
  deviceCount: number;
}

export interface GameSummary {
  gameId: number;
  title: string;
  description?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  characterCount: number;
  evidenceCount: number;
  deviceCount: number;
}

export interface Character {
  characterId: number;
  gameId: number;
  name: string;
  role?: string;
  description?: string;
  backstory?: string;
  motive?: string;
  alibi?: string;
  createdAt: string;
}

export interface DigitalDevice {
  deviceId: number;
  gameId: number;
  deviceType: string;
  ownerName: string;
  uniqueUrl: string;
  qrCodeUrl?: string;
  createdAt: string;
}
