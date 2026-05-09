import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BACKEND_SCRIPT } from "../backend/backend";
import { RefreshCw, SettingsIcon, XIcon } from "./components/Icons";
import { Settings } from "./components/Settings";
import { type ClassMapResult, type TreeNode, TreeViewNode } from "./components/TreeView";

export const App = () => {
  const tabId = chrome.devtools.inspectedWindow.tabId;

  const [domData, setDomData] = useState<TreeNode | null>(null);
  const [jsonStr, setJsonStr] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);

  const selectedIdRef = useRef(selectedId);
  const nextSearchRef = useRef<() => void>(() => {});
  const prevSearchRef = useRef<() => void>(() => {});
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = useCallback(({ text, x, y }: { text: string; x: number; y: number }) => {
    const el = tooltipRef.current;
    if (!el) return;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.showPopover();
  }, []);

  const hideTooltip = useCallback(() => {
    tooltipRef.current?.hidePopover();
  }, []);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const refreshDOM = useCallback(() => {
    chrome.devtools.inspectedWindow.eval(
      "window.__EXT_DEVTOOLS__ ? window.__EXT_DEVTOOLS__.getDOM() : null",
      (result, isException) => {
        if (isException || !result) return;
        setDomData(result as unknown as TreeNode);
      },
    );
  }, []);

  const injectBackend = useCallback((callback?: () => void) => {
    chrome.devtools.inspectedWindow.eval(BACKEND_SCRIPT, (_res, isException) => {
      if (!isException) callback?.();
    });
  }, []);

  const highlightNode = useCallback((nodeId: number) => {
    chrome.devtools.inspectedWindow.eval(
      `window.__EXT_DEVTOOLS__ && window.__EXT_DEVTOOLS__.highlightNode(${nodeId})`,
      () => {},
    );
  }, []);

  const clearHighlight = useCallback(() => {
    chrome.devtools.inspectedWindow.eval(
      "window.__EXT_DEVTOOLS__ && window.__EXT_DEVTOOLS__.clearHighlight()",
      () => {},
    );
  }, []);

  const loadClassmap = useCallback(() => {
    chrome.storage.local.get(["classmapJson"], (res) => {
      if (res.classmapJson) setJsonStr(res.classmapJson as string);
    });
  }, []);

  const saveClassmap = useCallback(
    (json: string) => {
      chrome.storage.local.set({ classmapJson: json }, () => {
        setJsonStr(json);
        setShowSettings(false);
        refreshDOM();
      });
    },
    [refreshDOM],
  );

  const classMapper = useMemo(() => {
    try {
      const rawMap = JSON.parse(jsonStr || "{}");
      if (!rawMap || typeof rawMap !== "object") throw new Error("Invalid format");

      const flatMap: Record<string, string> = {};
      const traverse = (obj: Record<string, unknown>, path: string[] = []) => {
        for (const [key, val] of Object.entries(obj)) {
          if (val && typeof val === "object" && !Array.isArray(val)) {
            traverse(val as Record<string, unknown>, [...path, key]);
          } else {
            flatMap[String(val)] = [...path, key].map((s) => s.replaceAll("_", "-")).join("__");
          }
        }
      };
      traverse(rawMap);

      return (className: string): ClassMapResult => {
        if (!className || typeof className !== "string") {
          return { displayStr: className || "", tokens: [] };
        }
        const tokens = className
          .split(/\s+/)
          .filter(Boolean)
          .map((p) => {
            if (flatMap[p]) {
              return { original: p, mapped: `MAP__${flatMap[p]}`, isMapped: true };
            }
            return { original: p, mapped: p, isMapped: false };
          });
        return { displayStr: tokens.map((t) => t.mapped).join(" "), tokens };
      };
    } catch {
      return (className: string): ClassMapResult => {
        const tokens = (className || "")
          .split(/\s+/)
          .filter(Boolean)
          .map((p) => ({ original: p, mapped: p, isMapped: false }));
        return { displayStr: className || "", tokens };
      };
    }
  }, [jsonStr]);

  const nextSearch = useCallback(() => {
    if (searchResults.length === 0) return;
    setSearchIndex((idx) => {
      const nextIdx = (idx + 1) % searchResults.length;
      setSelectedId(searchResults[nextIdx]);
      return nextIdx;
    });
  }, [searchResults]);

  const prevSearch = useCallback(() => {
    if (searchResults.length === 0) return;
    setSearchIndex((idx) => {
      const nextIdx = (idx - 1 + searchResults.length) % searchResults.length;
      setSelectedId(searchResults[nextIdx]);
      return nextIdx;
    });
  }, [searchResults]);

  useEffect(() => {
    nextSearchRef.current = nextSearch;
    prevSearchRef.current = prevSearch;
  }, [nextSearch, prevSearch]);

  useEffect(() => {
    if (!tabId) return;

    injectBackend(() => refreshDOM());

    const intervalId = setInterval(() => {
      chrome.devtools.inspectedWindow.eval(
        "window.__EXT_DEVTOOLS__ && window.__EXT_DEVTOOLS__.checkMutations()",
        (hasMutations, isException) => {
          if (hasMutations && !isException) refreshDOM();
        },
      );
    }, 500);

    const onNavigated = () => injectBackend(() => refreshDOM());
    chrome.devtools.network.onNavigated.addListener(onNavigated);

    return () => {
      clearInterval(intervalId);
      chrome.devtools.network.onNavigated.removeListener(onNavigated);
    };
  }, [tabId, injectBackend, refreshDOM]);

  useEffect(() => {
    if (!chrome.devtools?.panels?.elements) return;

    const handleSelection = () => {
      chrome.devtools.inspectedWindow.eval(
        "window.__EXT_DEVTOOLS__ ? window.__EXT_DEVTOOLS__.getId($0) : null",
        (id, isException) => {
          if (!isException && typeof id === "number") setSelectedId(id);
        },
      );
    };

    chrome.devtools.panels.elements.onSelectionChanged.addListener(handleSelection);
    handleSelection();

    return () => {
      chrome.devtools.panels.elements.onSelectionChanged.removeListener(handleSelection);
    };
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.source !== "devtools-command") return;
      const { action, query } = event.data;
      if (action === "performSearch") setSearchQuery(query || "");
      if (action === "nextSearchResult") nextSearchRef.current();
      if (action === "previousSearchResult") prevSearchRef.current();
      if (action === "cancelSearch") {
        setSearchQuery("");
        setSearchResults([]);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    loadClassmap();
  }, [loadClassmap]);

  useEffect(() => {
    if (!searchQuery || !domData) {
      setSearchResults([]);
      return;
    }
    const matches: number[] = [];
    const lowerQuery = searchQuery.toLowerCase();

    const walk = (node: TreeNode) => {
      let isMatch = false;

      if (node.type === "text" && node.val?.toLowerCase().includes(lowerQuery)) isMatch = true;
      if (node.type === "comment" && node.val?.toLowerCase().includes(lowerQuery)) isMatch = true;
      if (node.type === "doctype" && node.name?.toLowerCase().includes(lowerQuery)) isMatch = true;
      if (node.type === "pseudo" && node.pseudoType?.toLowerCase().includes(lowerQuery))
        isMatch = true;
      if (node.tag?.toLowerCase().includes(lowerQuery)) isMatch = true;

      if (node.attrs) {
        for (const [k, v] of Object.entries(node.attrs)) {
          const val = k === "class" ? classMapper(v).displayStr : v;
          if (String(val).toLowerCase().includes(lowerQuery)) {
            isMatch = true;
            break;
          }
        }
      }

      if (isMatch) matches.push(node.id);
      if (node.children) node.children.forEach(walk);
    };

    walk(domData);
    setSearchResults(matches);

    const currSelected = selectedIdRef.current;
    if (matches.length > 0) {
      const idx = matches.indexOf(currSelected ?? -1);
      if (idx !== -1) {
        setSearchIndex(idx);
      } else {
        setSearchIndex(0);
        setSelectedId(matches[0]);
      }
    } else {
      setSearchIndex(0);
      setSelectedId(null);
    }
  }, [searchQuery, domData, classMapper]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F3") {
        e.preventDefault();
        e.shiftKey ? prevSearchRef.current() : nextSearchRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className="relative flex flex-col h-screen bg-[#282828] text-[#bdc1c6] font-mono text-[12px] overflow-hidden"
      onMouseLeave={clearHighlight}
    >
      <style>{`
        ::-webkit-scrollbar{width:8px;height:8px}
        ::-webkit-scrollbar-track{background:#282828}
        ::-webkit-scrollbar-thumb{background:#444;border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:#555}
      `}</style>

      <div
        className="fixed m-0 px-2 py-1 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-[11px] rounded shadow-[0_4px_10px_rgba(0,0,0,0.5)] border border-[#444] pointer-events-none whitespace-nowrap"
        popover="manual"
        ref={tooltipRef}
      />

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-1 pb-20">
        {domData && (
          <ul className="list-none m-0 p-0">
            <TreeViewNode
              mapClass={classMapper}
              node={domData}
              onHideTooltip={hideTooltip}
              onHoverNode={highlightNode}
              onSelect={setSelectedId}
              onShowTooltip={showTooltip}
              searchIndex={searchIndex}
              searchQuery={searchQuery}
              searchResults={searchResults}
              selectedId={selectedId}
            />
          </ul>
        )}
      </div>

      <div className="absolute bottom-6 right-6 flex items-center gap-3 z-50">
        {!showSettings && (
          <button
            className="w-12 h-12 bg-[#3c4043] hover:bg-[#505457] text-white rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 border border-white/10"
            onClick={refreshDOM}
          >
            <RefreshCw size={20} />
          </button>
        )}
        <button
          className="w-12 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 border border-blue-400/20"
          onClick={() => setShowSettings(!showSettings)}
        >
          {showSettings ? <XIcon size={24} /> : <SettingsIcon size={24} />}
        </button>
      </div>

      {showSettings && (
        <Settings
          jsonStr={jsonStr}
          onChangeJson={setJsonStr}
          onClose={() => setShowSettings(false)}
          onRefresh={refreshDOM}
          onSave={() => saveClassmap(jsonStr)}
        />
      )}
    </div>
  );
};
