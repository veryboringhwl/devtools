import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

import { RefreshCw, SaveIcon, XIcon } from "./Icons.tsx";

import type { ClassToken } from "../types.ts";

interface SettingsProps {
  jsonStr: string;
  onChangeJson: (val: string) => void;
  onSave: () => void;
  onClose: () => void;
  onRefresh: () => void;
  onExport: () => void;
  onAddMapping: (obfuscatedClass: string, path: string) => void;
  unmappedClassTokens: ClassToken[];
}

export const Settings = ({
  jsonStr,
  onChangeJson,
  onSave,
  onClose,
  onRefresh,
  onExport,
  onAddMapping,
  unmappedClassTokens
}: SettingsProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="absolute inset-0 bg-[#282828]/98 z-40 p-6 flex flex-col gap-4 overflow-y-auto"
      onKeyDown={handleKeyDown}
    >
      <div className="flex justify-between items-center border-b border-[#3c4043] pb-3 shrink-0">
        <h2 className="text-white font-bold text-sm tracking-wide">CLASSMAP CONFIGURATION</h2>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 bg-[#3c4043] hover:bg-[#505457] rounded text-xs text-gray-300 transition-colors"
            onClick={onExport}
          >
            Export JSON
          </button>
          <button
            className="p-1.5 hover:bg-[#3c4043] rounded text-gray-400 transition-colors"
            onClick={onRefresh}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {unmappedClassTokens.length > 0 && (
        <div className="shrink-0">
          <h3 className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wide">
            Unmapped Classes ({unmappedClassTokens.length})
          </h3>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {unmappedClassTokens.map((token) => (
              <InlineMapper key={token.original} onAddMapping={onAddMapping} token={token} />
            ))}
          </div>
        </div>
      )}

      <textarea
        className={clsx(
          "flex-1 min-h-[200px] bg-[#1e1e1e] border border-[#3c4043] rounded p-4",
          "text-blue-300 text-[11px] resize-none outline-none focus:ring-1 focus:ring-blue-500",
          "font-mono shadow-inner"
        )}
        onChange={(e) => onChangeJson(e.target.value)}
        placeholder='{ "main": { "wrapper": "obfuscatedClass" } }'
        ref={textareaRef}
        spellCheck={false}
        value={jsonStr}
      />
      <div className="flex gap-3 shrink-0">
        <button
          className={clsx(
            "bg-blue-600 hover:bg-blue-500 py-3 rounded text-white font-bold",
            "flex items-center justify-center gap-2 shadow-lg transition-colors flex-1"
          )}
          onClick={onSave}
        >
          <SaveIcon size={20} /> Update Mappings
        </button>
        <button
          className={clsx(
            "bg-[#3c4043] hover:bg-[#505457] py-3 rounded text-white font-bold",
            "flex items-center justify-center gap-2 shadow-lg transition-colors flex-1"
          )}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

const InlineMapper = ({
  token,
  onAddMapping
}: {
  token: ClassToken;
  onAddMapping: (obfuscatedClass: string, path: string) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [path, setPath] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      const timer = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
  }, [editing]);

  const submit = () => {
    if (path.trim()) onAddMapping(token.original, path.trim());
    setEditing(false);
    setPath("");
  };

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit();
  };

  return editing ? (
    <form
      className="inline-flex items-center gap-1 bg-[#1e1e1e] border border-blue-500 rounded px-2 py-1"
      onSubmit={handleSubmit}
    >
      <span className="text-[#fe8d59] text-[11px] font-mono whitespace-nowrap">
        {token.original}
      </span>
      <span className="text-gray-500 text-[11px]">→</span>
      <input
        className="w-28 bg-transparent border-b border-blue-400/50 px-1 py-0 text-[11px] text-white font-mono outline-none"
        onChange={(e) => setPath(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setEditing(false);
            setPath("");
          }
        }}
        placeholder="path.name"
        ref={inputRef}
        value={path}
      />
      <button className="text-green-400 hover:text-green-300 text-[11px] px-1" type="submit">
        ✓
      </button>
      <button
        className="text-gray-400 hover:text-gray-300 text-[11px] px-1"
        onClick={() => {
          setEditing(false);
          setPath("");
        }}
        type="button"
      >
        <XIcon size={12} />
      </button>
    </form>
  ) : (
    <button
      className={clsx(
        "inline-flex items-center gap-1 bg-[#1e1e1e] hover:bg-blue-500/10",
        "border border-[#3c4043] hover:border-blue-400/40 rounded px-2 py-0.5",
        "text-[11px] font-mono text-[#fe8d59] transition-colors"
      )}
      onClick={() => setEditing(true)}
    >
      {token.original}
      <span className="text-gray-500 text-[9px]">+</span>
    </button>
  );
};
