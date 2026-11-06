import type { StateCreator, SetState, GetState, StoreApi } from "./index";

export interface StateStorage {
  getItem: (name: string) => string | null | Promise<string | null>;
  setItem: (name: string, value: string) => void | Promise<void>;
  removeItem: (name: string) => void | Promise<void>;
}

export interface PersistStorage<S> {
  getItem: (
    name: string
  ) => { state: S; version?: number } | null | Promise<{ state: S; version?: number } | null>;
  setItem: (
    name: string,
    value: { state: S; version?: number }
  ) => void | Promise<void>;
  removeItem: (name: string) => void | Promise<void>;
}

export interface PersistOptions<T, PersistedState = Partial<T>> {
  name: string;
  storage?: PersistStorage<PersistedState>;
  partialize?: (state: T) => PersistedState;
  version?: number;
}

export function createJSONStorage<S>(
  getStorage: () => StateStorage
): PersistStorage<S> {
  return {
    getItem: async (name: string) => {
      const storage = getStorage();
      const str = await storage.getItem(name);
      if (!str) return null;
      try {
        return JSON.parse(str) as { state: S; version?: number };
      } catch {
        return null;
      }
    },
    setItem: async (name: string, newValue: { state: S; version?: number }) => {
      const storage = getStorage();
      await storage.setItem(name, JSON.stringify(newValue));
    },
    removeItem: async (name: string) => {
      const storage = getStorage();
      await storage.removeItem(name);
    },
  };
}

export function persist<T extends object, PersistedState = Partial<T>>(
  config: StateCreator<T>,
  options: PersistOptions<T, PersistedState>
): StateCreator<T> {
  return (set: SetState<T>, get: GetState<T>, api: StoreApi<T>) => {
    const partialize =
      options.partialize || ((s: T) => s as unknown as PersistedState);

    const saveStorage = () => {
      if (!options.storage || typeof window === "undefined") return;
      const stateToSave = partialize(get());
      void options.storage.setItem(options.name, {
        state: stateToSave,
        version: options.version || 0,
      });
    };

    const savedSet: SetState<T> = (partial, replace) => {
      set(partial, replace);
      saveStorage();
    };

    const initialState = config(savedSet, get, api);

    if (typeof window !== "undefined" && options.storage) {
      Promise.resolve(options.storage.getItem(options.name))
        .then((persisted) => {
          if (persisted && persisted.state) {
            set(
              (current) => Object.assign({}, current, persisted.state),
              false
            );
          }
        })
        .catch(() => {
          // Ignore storage read errors in offline fallback
        });
    }

    return initialState;
  };
}

