import { toast } from "sonner";
import { create } from "zustand";

import { getBackendScript } from "../../backend/loader.ts";

import type { ClassMapResult, ClassToken, TreeNode } from "../types.ts";

function buildClassMapper(jsonStr: string): (className: string) => ClassMapResult {
  try {
    const rawMap: unknown = JSON.parse(jsonStr || "{}");
    if (!rawMap || typeof rawMap !== "object") throw new Error("Invalid format");

    const flatMap: Record<string, string> = {};
    const pathMap: Record<string, string> = {};

    const traverse = (obj: Record<string, unknown>, path: string[] = []) => {
      for (const [key, val] of Object.entries(obj)) {
        if (val && typeof val === "object" && !Array.isArray(val)) {
          traverse(val as Record<string, unknown>, [...path, key]);
        } else {
          const dotPath = [...path, key].join(".");
          flatMap[String(val)] = [...path, key].map((s) => s.replaceAll("_", "-")).join("__");
          pathMap[String(val)] = dotPath;
        }
      }
    };
    traverse(rawMap as Record<string, unknown>);

    return (className: string): ClassMapResult => {
      if (!className) return { displayStr: "", tokens: [] };
      const tokens = String(className)
        .split(/\s+/)
        .filter(Boolean)
        .map((p) => {
          if (flatMap[p]) {
            return {
              original: p,
              mapped: `MAP__${flatMap[p]}`,
              isMapped: true as const,
              path: pathMap[p]
            };
          }
          return { original: p, mapped: p, isMapped: false as const };
        });
      return { displayStr: tokens.map((t) => t.mapped).join(" "), tokens };
    };
  } catch {
    return (className: string): ClassMapResult => {
      const tokens = String(className || "")
        .split(/\s+/)
        .filter(Boolean)
        .map((p) => ({ original: p, mapped: p, isMapped: false as const }));
      return { displayStr: className || "", tokens };
    };
  }
}

interface DevtoolsState {
  domData: TreeNode | null;
  jsonStr: string;
  classMapper: (className: string) => ClassMapResult;
  selectedId: number | null;
  searchQuery: string;
  searchResults: number[];
  searchIndex: number;
  showSettings: boolean;
  editingNodeId: number | null;
  editingTokenIndex: number;
}

interface DevtoolsActions {
  refreshDOM: () => void;
  injectBackend: () => Promise<boolean>;
  highlightNode: (nodeId: number) => void;
  clearHighlight: () => void;
  loadClassmap: () => void;
  setClassmapJson: (json: string) => void;
  saveClassmap: (json: string) => void;
  addMapping: (obfuscatedClass: string, path: string) => void;
  removeMapping: (obfuscatedClass: string) => void;
  exportClassmap: () => void;
  setSelectedId: (id: number | null) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: number[]) => void;
  setSearchIndex: (idx: number) => void;
  toggleSettings: () => void;
  setEditing: (nodeId: number, tokenIndex: number) => void;
  clearEditing: () => void;
}

export type DevtoolsStore = DevtoolsState & DevtoolsActions;

export const useStore = create<DevtoolsStore>((set, get) => ({
  domData: null,
  jsonStr: "",
  classMapper: buildClassMapper(""),
  selectedId: null,
  searchQuery: "",
  searchResults: [],
  searchIndex: 0,
  showSettings: false,
  editingNodeId: null,
  editingTokenIndex: 0,

  refreshDOM: () => {
    chrome.devtools.inspectedWindow.eval(
      "window.__EXT_DEVTOOLS__ ? window.__EXT_DEVTOOLS__.getDOM() : null",
      (result, isException) => {
        if (isException || !result) return;
        set({ domData: result as unknown as TreeNode });
      }
    );
  },

  injectBackend: async () => {
    try {
      const script = await getBackendScript();
      return new Promise<boolean>((resolve) => {
        chrome.devtools.inspectedWindow.eval(script, (_result, isException) => {
          if (isException) {
            toast.error("Failed to inject backend script");
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    } catch {
      toast.error("Failed to load backend script");
      return false;
    }
  },

  highlightNode: (nodeId: number) => {
    chrome.devtools.inspectedWindow.eval(
      `window.__EXT_DEVTOOLS__ && window.__EXT_DEVTOOLS__.highlightNode(${Number(nodeId)})`
    );
  },

  clearHighlight: () => {
    chrome.devtools.inspectedWindow.eval(
      "window.__EXT_DEVTOOLS__ && window.__EXT_DEVTOOLS__.clearHighlight()"
    );
  },

  loadClassmap: () => {
    chrome.storage.local.get(["classmapJson"], (res: Record<string, unknown>) => {
      if (res.classmapJson) {
        const json = res.classmapJson as string;
        set({ jsonStr: json, classMapper: buildClassMapper(json) });
      }
    });
  },

  setClassmapJson: (json: string) => {
    set({ jsonStr: json, classMapper: buildClassMapper(json) });
  },

  saveClassmap: (json: string) => {
    chrome.storage.local.set({ classmapJson: json }, () => {
      set({ jsonStr: json, classMapper: buildClassMapper(json), showSettings: false });
      get().refreshDOM();
      toast.success("Class mappings updated");
    });
  },

  addMapping: (obfuscatedClass: string, path: string) => {
    try {
      const rawMap: unknown = JSON.parse(get().jsonStr || "{}");
      if (!rawMap || typeof rawMap !== "object") return;

      const removeExisting = (obj: Record<string, unknown>): boolean => {
        for (const key of Object.keys(obj)) {
          if (obj[key] === obfuscatedClass) {
            delete obj[key];
            return true;
          }
          if (obj[key] && typeof obj[key] === "object" && !Array.isArray(obj[key])) {
            if (removeExisting(obj[key] as Record<string, unknown>)) {
              if (Object.keys(obj[key] as object).length === 0) delete obj[key];
              return true;
            }
          }
        }
        return false;
      };
      removeExisting(rawMap as Record<string, unknown>);

      const parts = path.split(".");
      let current = rawMap as Record<string, unknown>;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (
          !part ||
          !current[part] ||
          typeof current[part] !== "object" ||
          Array.isArray(current[part])
        ) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }
      const lastPart = parts[parts.length - 1];
      if (lastPart) current[lastPart] = obfuscatedClass;

      const newJson = JSON.stringify(rawMap, null, 2);
      chrome.storage.local.set({ classmapJson: newJson }, () => {
        set({ jsonStr: newJson, classMapper: buildClassMapper(newJson) });
        get().refreshDOM();
        toast.success("Class mapping added");
      });
    } catch {
      console.error("Failed to add mapping:", obfuscatedClass, path);
      toast.error("Failed to add mapping");
    }
  },

  removeMapping: (obfuscatedClass: string) => {
    try {
      const rawMap: unknown = JSON.parse(get().jsonStr || "{}");
      if (!rawMap || typeof rawMap !== "object") return;

      const removeFrom = (obj: Record<string, unknown>): boolean => {
        for (const key of Object.keys(obj)) {
          if (obj[key] === obfuscatedClass) {
            delete obj[key];
            return true;
          }
          if (obj[key] && typeof obj[key] === "object" && !Array.isArray(obj[key])) {
            if (removeFrom(obj[key] as Record<string, unknown>)) {
              if (Object.keys(obj[key] as object).length === 0) delete obj[key];
              return true;
            }
          }
        }
        return false;
      };
      removeFrom(rawMap as Record<string, unknown>);

      const newJson = JSON.stringify(rawMap, null, 2);
      chrome.storage.local.set({ classmapJson: newJson }, () => {
        set({ jsonStr: newJson, classMapper: buildClassMapper(newJson) });
        get().refreshDOM();
        toast.success("Class mapping removed");
      });
    } catch {
      console.error("Failed to remove mapping:", obfuscatedClass);
      toast.error("Failed to remove mapping");
    }
  },

  exportClassmap: () => {
    const json = get().jsonStr || "{}";
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "classmap.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Classmap exported");
  },

  setSelectedId: (id: number | null) => set({ selectedId: id }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setSearchResults: (results: number[]) => set({ searchResults: results }),
  setSearchIndex: (idx: number) => set({ searchIndex: idx }),
  toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),

  setEditing: (nodeId: number, tokenIndex: number) =>
    set({ editingNodeId: nodeId, editingTokenIndex: tokenIndex }),
  clearEditing: () => set({ editingNodeId: null })
}));

export function getUnmappedTokens(
  domData: TreeNode | null,
  classMapper: (className: string) => ClassMapResult
): ClassToken[] {
  if (!domData) return [];
  const seen = new Set<string>();
  const tokens: ClassToken[] = [];

  const walk = (node: TreeNode) => {
    if (node.attrs?.class) {
      const result = classMapper(node.attrs.class);
      for (const token of result.tokens) {
        if (!token.isMapped && !seen.has(token.original)) {
          seen.add(token.original);
          tokens.push(token);
        }
      }
    }
    node.children?.forEach(walk);
  };
  walk(domData);

  return tokens.sort((a, b) => a.original.localeCompare(b.original));
}
