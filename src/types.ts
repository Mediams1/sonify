export interface User {
  id: number;
  username: string;
  email: string;
  is_verified: boolean;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  genre: string;
  release_date: string;
  duration: number;
  preview_url: string;
  artwork_url: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
}

export const GENRES = [
  "Reggaeton",
  "Salsa",
  "Bachata",
  "Latin Trap",
  "Regional Mexicano",
  "Latin Pop",
  "Merengue",
  "Rock en Español",
  "Bossa Nova",
  "Tango"
];
