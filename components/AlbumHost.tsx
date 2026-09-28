"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  closeAlbum,
  closeAlbumPicker,
  getAlbumUi,
  openAlbum,
  subscribeAlbumUi,
  type AlbumUiState,
} from "@/content/albumUi";
import { AlbumOverlay } from "./AlbumOverlay";

const EXIT_MS = 420;

function dismiss() {
  closeAlbum();
  closeAlbumPicker();
}

export function AlbumHost() {
  const ui = useSyncExternalStore(subscribeAlbumUi, getAlbumUi, getAlbumUi);
  const open = Boolean(ui.album || ui.picker);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const lastUi = useRef<AlbumUiState>(ui);

  if (open) lastUi.current = ui;

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setVisible(true));
      });
      return () => window.cancelAnimationFrame(id);
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const root = document.documentElement;
    if (visible) root.classList.add("album-open");
    else root.classList.remove("album-open");
    return () => root.classList.remove("album-open");
  }, [visible]);

  if (!mounted) return null;

  const shown = open ? ui : lastUi.current;

  return (
    <AlbumOverlay
      album={shown.album}
      initialSlug={shown.initialSlug}
      open={visible}
      onClose={dismiss}
      onSelectAlbum={openAlbum}
    />
  );
}
