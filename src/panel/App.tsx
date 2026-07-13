import clsx from "clsx";
import { useMemo } from "react";

import { RefreshCw, SettingsIcon, XIcon } from "./components/Icons.tsx";
import { Settings } from "./components/Settings.tsx";
import { TreeViewNode } from "./components/TreeView.tsx";
import { useDomTree } from "./hooks/useDomTree.ts";
import { useSearchSync } from "./hooks/useSearchSync.ts";
import { useStore } from "./stores/useStore.ts";

import type { TreeNode } from "./types.ts";

export const App = () => {
  const { tabId } = chrome.devtools.inspectedWindow;

  const domData = useStore((s) => s.domData);
  const jsonStr = useStore((s) => s.jsonStr);
  const classMapper = useStore((s) => s.classMapper);
  const refreshDOM = useStore((s) => s.refreshDOM);
  const clearHighlight = useStore((s) => s.clearHighlight);
  const saveClassmap = useStore((s) => s.saveClassmap);
  const addMapping = useStore((s) => s.addMapping);
  const exportClassmap = useStore((s) => s.exportClassmap);
  const toggleSettings = useStore((s) => s.toggleSettings);
  const showSettings = useStore((s) => s.showSettings);
  const setClassmapJson = useStore((s) => s.setClassmapJson);

  useDomTree(tabId);
  useSearchSync(domData);

  const unmappedClassTokens = useMemo(() => {
    if (!domData) return [];
    const seen = new Set<string>();
    const tokens: Array<{
      original: string;
      mapped: string;
      isMapped: boolean;
      path?: string;
    }> = [];
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
  }, [domData, classMapper]);

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

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-1 pb-20">
        {domData && (
          <ul className="list-none m-0 p-0">
            <TreeViewNode node={domData} parentPath="" />
          </ul>
        )}
      </div>

      <div className="absolute bottom-6 right-6 flex items-center gap-3 z-50">
        {!showSettings && (
          <button
            className={clsx(
              "w-12 h-12 bg-[#3c4043] hover:bg-[#505457] text-white rounded-full",
              "flex items-center justify-center shadow-lg transition-all active:scale-95 border border-white/10"
            )}
            onClick={refreshDOM}
          >
            <RefreshCw size={20} />
          </button>
        )}
        <button
          className={clsx(
            "w-12 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-full",
            "flex items-center justify-center shadow-lg transition-all active:scale-95 border border-blue-400/20"
          )}
          onClick={toggleSettings}
        >
          {showSettings ? <XIcon size={24} /> : <SettingsIcon size={24} />}
        </button>
      </div>

      {showSettings && (
        <Settings
          jsonStr={jsonStr}
          onAddMapping={addMapping}
          onChangeJson={setClassmapJson}
          onClose={toggleSettings}
          onExport={exportClassmap}
          onRefresh={refreshDOM}
          onSave={() => saveClassmap(jsonStr)}
          unmappedClassTokens={unmappedClassTokens}
        />
      )}
    </div>
  );
};
