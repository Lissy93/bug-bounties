import { writable } from "svelte/store";

const STORAGE_KEY = "bookmarked-programs";

function loadBookmarks(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persist(slugs: Set<string>) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...slugs]));
  } catch {}
}

function createBookmarkStore() {
  const { subscribe, set, update } = writable<Set<string>>(loadBookmarks());

  // Cross-tab sync
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) {
        set(loadBookmarks());
      }
    });
  }

  return {
    subscribe,
    toggle(slug: string) {
      update((current) => {
        const next = new Set(current);
        if (next.has(slug)) {
          next.delete(slug);
        } else {
          next.add(slug);
        }
        persist(next);
        return next;
      });
    },
  };
}

export const bookmarks = createBookmarkStore();
