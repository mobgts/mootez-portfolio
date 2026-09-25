import { getAlbum } from "./photos";
import type { Album } from "./types";

export type AlbumUiState = {
  album: Album | null;
  initialSlug?: string;
  /** Album index overlay (choose a series). */
  picker: boolean;
};

type Listener = (state: AlbumUiState) => void;

let state: AlbumUiState = { album: null, picker: false };
const listeners = new Set<Listener>();

function notify() {
  for (const fn of listeners) fn(state);
}

export function getAlbumUi(): AlbumUiState {
  return state;
}

export function openAlbumPicker() {
  state = { album: null, picker: true };
  notify();
}

export function closeAlbumPicker() {
  if (!state.picker) return;
  state = { ...state, picker: false };
  notify();
}

export function openAlbum(albumId: string, initialSlug?: string) {
  const album = getAlbum(albumId);
  if (!album) return;
  state = { album, initialSlug, picker: false };
  notify();
}

export function openAlbumDirect(album: Album, initialSlug?: string) {
  state = { album, initialSlug, picker: false };
  notify();
}

export function closeAlbum() {
  if (!state.album) return;
  state = { album: null, picker: false };
  notify();
}

export function subscribeAlbumUi(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
