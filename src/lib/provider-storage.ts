import type { ProviderConfig } from "./types";

const STORAGE_KEY = "actlysis-providers";

/**
 * Reads user-configured providers from localStorage.
 *
 * Returns an empty array if localStorage is unavailable (e.g. SSR context)
 * or the stored value cannot be parsed.
 */
export function loadCustomProviders(): ProviderConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ProviderConfig[];
  } catch {
    return [];
  }
}

/**
 * Persists the full list of user-configured providers to localStorage.
 *
 * Args:
 *   providers: Array of ProviderConfig objects to persist.
 */
export function saveCustomProviders(providers: ProviderConfig[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
}

/**
 * Appends a new provider to the stored list.
 *
 * Args:
 *   p: The ProviderConfig to add. Its id must be unique.
 */
export function addCustomProvider(p: ProviderConfig): void {
  const current = loadCustomProviders();
  saveCustomProviders([...current, p]);
}

/**
 * Removes a provider from the stored list by its id.
 *
 * Args:
 *   id: The unique identifier of the provider to remove.
 */
export function removeCustomProvider(id: string): void {
  const current = loadCustomProviders();
  saveCustomProviders(current.filter((p) => p.id !== id));
}

/**
 * Replaces an existing provider entry with the updated config.
 *
 * Matches by id. If no matching id is found the list is unchanged.
 *
 * Args:
 *   p: Updated ProviderConfig. Must carry the same id as the entry to replace.
 */
export function updateCustomProvider(p: ProviderConfig): void {
  const current = loadCustomProviders();
  saveCustomProviders(current.map((existing) => (existing.id === p.id ? p : existing)));
}
