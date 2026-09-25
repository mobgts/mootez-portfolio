"use client";

import { useSyncExternalStore } from "react";
import {
  closeAlbum,
  closeAlbumPicker,
  getAlbumUi,
  openAlbum,
  subscribeAlbumUi,
} from "@/content/albumUi";
import { AlbumOverlay } from "./AlbumOverlay";
import { AlbumPicker } from "./AlbumPicker";

export function AlbumHost() {
  const ui = useSyncExternalStore(subscribeAlbumUi, getAlbumUi, getAlbumUi);

  if (ui.album) {
    return (
      <AlbumOverlay
        album={ui.album}
        initialSlug={ui.initialSlug}
        onClose={closeAlbum}
      />
    );
  }

  if (ui.picker) {
    return (
      <AlbumPicker onSelect={openAlbum} onClose={closeAlbumPicker} />
    );
  }

  return null;
}
