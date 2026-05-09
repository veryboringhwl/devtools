import { useEffect, useRef } from "react";
import { RefreshCw, SaveIcon } from "./Icons";

interface SettingsProps {
  jsonStr: string;
  onChangeJson: (val: string) => void;
  onSave: () => void;
  onClose: () => void;
  onRefresh: () => void;
}

export const Settings = ({ jsonStr, onChangeJson, onSave, onClose, onRefresh }: SettingsProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="absolute inset-0 bg-[#282828]/98 z-40 p-6 flex flex-col gap-4"
      onKeyDown={handleKeyDown}
    >
      <div className="flex justify-between items-center border-b border-[#3c4043] pb-3">
        <h2 className="text-white font-bold text-sm tracking-wide">CLASSMAP CONFIGURATION</h2>
        <button
          className="p-1.5 hover:bg-[#3c4043] rounded text-gray-400 transition-colors"
          onClick={onRefresh}
        >
          <RefreshCw size={18} />
        </button>
      </div>
      <textarea
        className="flex-1 bg-[#1e1e1e] border border-[#3c4043] rounded p-4 text-blue-300 text-[11px] resize-none outline-none focus:ring-1 focus:ring-blue-500 font-mono shadow-inner"
        onChange={(e) => onChangeJson(e.target.value)}
        placeholder='{ "original-class": "mapped-class" }'
        ref={textareaRef}
        spellCheck={false}
        value={jsonStr}
      />
      <div className="flex gap-3">
        <button
          className="bg-blue-600 hover:bg-blue-500 py-3 rounded text-white font-bold flex items-center justify-center gap-2 shadow-lg transition-colors flex-1"
          onClick={onSave}
        >
          <SaveIcon size={20} /> Update Mappings
        </button>
        <button
          className="bg-[#3c4043] hover:bg-[#505457] py-3 rounded text-white font-bold flex items-center justify-center gap-2 shadow-lg transition-colors flex-1"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
