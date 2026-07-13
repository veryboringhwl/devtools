import clsx from "clsx";
import {
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { useStore } from "../stores/useStore.ts";
import { ChevronDown, ChevronRight } from "./Icons.tsx";

import type { TreeNode } from "../types.ts";

const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const HighlightText = ({ text, query }: { text: string | undefined; query: string }) => {
  if (!query || !text) return <>{text}</>;
  const escaped = escapeRegex(query);
  const parts = String(text).split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span className="bg-[#5c4300] text-white px-0.5 rounded-sm" key={i}>
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};

function ClassTokenRenderer({
  token,
  index,
  nodeId,
  suggestedBasePath,
  searchQuery
}: {
  token: { original: string; mapped: string; isMapped: boolean; path?: string };
  index: number;
  nodeId: number;
  suggestedBasePath: string;
  searchQuery: string;
}) {
  const editingNodeId = useStore((s) => s.editingNodeId);
  const editingTokenIndex = useStore((s) => s.editingTokenIndex);
  const setEditing = useStore((s) => s.setEditing);
  const clearEditing = useStore((s) => s.clearEditing);
  const addMapping = useStore((s) => s.addMapping);
  const removeMapping = useStore((s) => s.removeMapping);

  const [editPath, setEditPath] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = editingNodeId === nodeId && editingTokenIndex === index;

  useEffect(() => {
    if (isEditing) {
      const timer = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
  }, [isEditing]);

  const submit = useCallback(() => {
    const trimmed = editPath.trim().replace(/\.+$/, "");
    if (trimmed) addMapping(token.original, trimmed);
    clearEditing();
    setEditPath("");
  }, [editPath, token.original, addMapping, clearEditing]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") submit();
    if (e.key === "Escape") {
      clearEditing();
      setEditPath("");
    }
    e.stopPropagation();
  };

  if (isEditing) {
    return (
      <span className="inline-flex flex-col items-start">
        {suggestedBasePath ? (
          <span className="text-[9px] text-gray-500 leading-none mb-0.5">
            under {suggestedBasePath}
          </span>
        ) : (
          <span className="text-[9px] text-gray-600 leading-none mb-0.5">specify path.name</span>
        )}
        <input
          className="w-40 bg-[#1e1e1e] border border-blue-500 rounded px-1 py-0 text-[11px] text-[#fe8d59] font-mono outline-none"
          onChange={(e) => setEditPath(e.target.value)}
          onKeyDown={handleKeyDown}
          onMouseDown={(e) => e.stopPropagation()}
          ref={inputRef}
          value={editPath}
        />
      </span>
    );
  }

  if (token.isMapped) {
    return (
      <span
        className="cursor-pointer underline decoration-dotted underline-offset-2 decoration-[#fe8d59]/40"
        onClick={(e: MouseEvent) => {
          e.stopPropagation();
          setEditing(nodeId, index);
          setEditPath(token.path || "");
        }}
        onContextMenu={(e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          removeMapping(token.original);
        }}
      >
        <HighlightText query={searchQuery} text={token.mapped} />
      </span>
    );
  }

  return (
    <span
      className={clsx(
        "cursor-pointer hover:bg-blue-500/20 rounded px-0.5 transition-colors",
        "border border-dashed border-transparent hover:border-blue-400/50"
      )}
      onClick={(e: MouseEvent) => {
        e.stopPropagation();
        setEditing(nodeId, index);
        setEditPath(suggestedBasePath ? `${suggestedBasePath}.` : "");
      }}
    >
      <HighlightText query={searchQuery} text={token.mapped} />
    </span>
  );
}

function ClassAttribute({
  value,
  nodeId,
  parentPath,
  searchQuery
}: {
  value: string;
  nodeId: number;
  parentPath: string;
  searchQuery: string;
}) {
  const classMapper = useStore((s) => s.classMapper);
  const mapResult = classMapper(value);
  const suggestedBasePath = (() => {
    const mapped = mapResult.tokens.filter((t) => t.isMapped && t.path);
    if (mapped.length > 0) {
      const deepest = mapped.reduce((a, b) =>
        (b.path?.length ?? 0) > (a.path?.length ?? 0) ? b : a
      );
      const parts = (deepest.path ?? "").split(".");
      return parts.length > 1 ? parts.slice(0, -1).join(".") : "";
    }
    return parentPath || "";
  })();

  return (
    <span className="ml-1.5 inline-flex flex-wrap items-center gap-x-[1px]">
      <span className="text-[#a8c7fa]">
        <HighlightText query={searchQuery} text="class" />
      </span>
      <span className="text-gray-400">=</span>
      <span className="text-[#fe8d59]">
        "
        {mapResult.tokens.map((token, idx) => (
          <span key={idx}>
            <ClassTokenRenderer
              index={idx}
              nodeId={nodeId}
              searchQuery={searchQuery}
              suggestedBasePath={suggestedBasePath}
              token={token}
            />
            {idx < mapResult.tokens.length - 1 ? " " : ""}
          </span>
        ))}
        "
      </span>
    </span>
  );
}

function Attributes({
  attrs,
  nodeId,
  parentPath,
  searchQuery
}: {
  attrs: Record<string, string>;
  nodeId: number;
  parentPath: string;
  searchQuery: string;
}) {
  return Object.entries(attrs).map(([key, val]) => {
    if (key === "class") {
      return (
        <ClassAttribute
          key={key}
          nodeId={nodeId}
          parentPath={parentPath}
          searchQuery={searchQuery}
          value={val}
        />
      );
    }
    return (
      <span className="ml-1.5 inline-block" key={key}>
        <span className="text-[#a8c7fa]">
          <HighlightText query={searchQuery} text={key} />
        </span>
        <span className="text-gray-400">=</span>
        <span className="text-[#fe8d59]">
          "<HighlightText query={searchQuery} text={val} />"
        </span>
      </span>
    );
  });
}

function childParentPath(
  classResult: ReturnType<ReturnType<typeof useStore.getState>["classMapper"]>,
  parentPath: string
): string {
  const mapped = classResult.tokens.filter((t) => t.isMapped && t.path);
  if (mapped.length > 0) {
    const deepest = mapped.reduce((a, b) =>
      (b.path?.length ?? 0) > (a.path?.length ?? 0) ? b : a
    );
    const parts = (deepest.path ?? "").split(".");
    return parts.length > 1 ? parts.slice(0, -1).join(".") : "";
  }
  return parentPath || "";
}

export const TreeViewNode = ({ node, parentPath }: { node: TreeNode; parentPath: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const elementRef = useRef<HTMLLIElement | HTMLDivElement>(null);

  const selectedId = useStore((s) => s.selectedId);
  const searchResults = useStore((s) => s.searchResults);
  const searchIndex = useStore((s) => s.searchIndex);
  const searchQuery = useStore((s) => s.searchQuery);
  const classMapper = useStore((s) => s.classMapper);
  const highlightNode = useStore((s) => s.highlightNode);
  const setSelectedId = useStore((s) => s.setSelectedId);

  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;
  const isSearchResult = searchResults.includes(node.id);
  const isCurrentMatch = isSearchResult && searchResults[searchIndex] === node.id;

  const classResult = node.attrs?.class ? classMapper(node.attrs.class) : null;
  const derivedParentPath = classResult ? childParentPath(classResult, parentPath) : parentPath;

  const hasDescendantInSearch = useMemo(() => {
    if (searchResults.length === 0) return false;
    const check = (children?: TreeNode[]): boolean => {
      if (!children) return false;
      return children.some((c) => searchResults.includes(c.id) || check(c.children));
    };
    return check(node.children);
  }, [searchResults, node.children]);

  useEffect(() => {
    if (hasDescendantInSearch) setIsExpanded(true);
  }, [hasDescendantInSearch]);

  useEffect(() => {
    if (isSelected && elementRef.current) {
      const timer = setTimeout(() => {
        elementRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isSelected]);

  const handleToggle = (e: MouseEvent) => {
    e.stopPropagation();
    if (!hasChildren) return;
    if (isExpanded && !isSelected) setSelectedId(node.id);
    setIsExpanded(!isExpanded);
  };

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    setSelectedId(node.id);
  };

  const handleMouseEnter = (e: MouseEvent) => {
    e.stopPropagation();
    highlightNode(node.id);
  };

  const getRowClass = () =>
    clsx(
      "flex items-start group cursor-default rounded-sm transition-colors duration-75 max-w-full min-w-0",
      isSelected && "bg-[#004a77] text-white",
      !isSelected && isCurrentMatch && "bg-[#3d3d3d] ring-1 ring-inset ring-gray-500",
      !isSelected && !isCurrentMatch && isSearchResult && "bg-[#35363a]",
      !isSelected && !isSearchResult && "hover:bg-[#3d3d3d]"
    );

  const renderTextNode = () => (
    <li
      className={clsx(getRowClass(), "pl-8 break-all whitespace-normal")}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      ref={elementRef as React.Ref<HTMLLIElement>}
    >
      <span className={isSelected ? "text-white" : "text-[#eeeeee]"}>
        "<HighlightText query={searchQuery} text={node.val} />"
      </span>
    </li>
  );

  const renderCommentNode = () => (
    <li
      className={clsx(getRowClass(), "pl-8")}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      ref={elementRef as React.Ref<HTMLLIElement>}
    >
      <span className={isSelected ? "text-white" : "text-[#89b482]"}>
        &lt;!-- <HighlightText query={searchQuery} text={node.val} /> --&gt;
      </span>
    </li>
  );

  const renderDocTypeNode = () => (
    <li
      className={clsx(getRowClass(), "pl-8")}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      ref={elementRef as React.Ref<HTMLLIElement>}
    >
      <span className={isSelected ? "text-white" : "text-gray-400"}>
        &lt;!DOCTYPE <HighlightText query={searchQuery} text={node.name} />
        &gt;
      </span>
    </li>
  );

  const renderPseudoNode = () => (
    <li
      className={clsx(getRowClass(), "pl-8")}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      ref={elementRef as React.Ref<HTMLLIElement>}
    >
      <span className={isSelected ? "text-white" : "text-[#e293ca]"}>
        ::
        <HighlightText query={searchQuery} text={node.pseudoType} />
      </span>
    </li>
  );

  const renderElementNode = () => (
    <li className="list-none max-w-full min-w-0">
      <div
        className={getRowClass()}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        ref={elementRef as React.Ref<HTMLDivElement>}
      >
        <div
          className="w-5 h-5 flex items-center justify-center shrink-0 cursor-pointer select-none"
          onClick={handleToggle}
        >
          {hasChildren && (
            <span
              className={clsx(
                isSelected ? "text-white" : "text-gray-400",
                "group-hover:text-gray-200"
              )}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center min-w-0 pr-2 leading-5 whitespace-normal break-all">
          <span className="text-[#7cacf8] shrink-0 select-none">{"<"}</span>
          <span className="text-[#7cacf8] font-semibold">
            <HighlightText query={searchQuery} text={node.tag} />
          </span>
          {node.attrs && (
            <Attributes
              attrs={node.attrs}
              nodeId={node.id}
              parentPath={derivedParentPath}
              searchQuery={searchQuery}
            />
          )}
          <span className="text-[#7cacf8] shrink-0 select-none">{">"}</span>

          {!isExpanded && hasChildren && (
            <>
              <span className="mx-1 px-1 bg-[#444] text-gray-300 rounded-sm text-[9px] border border-white/10 shrink-0 select-none">
                ...
              </span>
              <span className="text-[#7cacf8] shrink-0 select-none">{"</"}</span>
              <span className="text-[#7cacf8] font-semibold">
                <HighlightText query={searchQuery} text={node.tag} />
              </span>
              <span className="text-[#7cacf8] shrink-0 select-none">{">"}</span>
            </>
          )}

          {!hasChildren && (
            <>
              <span className="text-[#7cacf8] shrink-0 select-none">{"</"}</span>
              <span className="text-[#7cacf8] font-semibold">
                <HighlightText query={searchQuery} text={node.tag} />
              </span>
              <span className="text-[#7cacf8] shrink-0 select-none">{">"}</span>
            </>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <>
          <ul className="ml-[10px] border-l border-white/10 min-w-0 overflow-hidden">
            {node.children?.map((child) => (
              <TreeViewNode key={child.id} node={child} parentPath={derivedParentPath} />
            ))}
          </ul>

          <div
            className={clsx(getRowClass(), "pl-5")}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
          >
            <div className="w-5 h-5 shrink-0 select-none" />
            <div className="flex items-center leading-5">
              <span className="text-[#7cacf8] select-none">{"</"}</span>
              <span className="text-[#7cacf8] font-semibold">
                <HighlightText query={searchQuery} text={node.tag} />
              </span>
              <span className="text-[#7cacf8] select-none">{">"}</span>
            </div>
          </div>
        </>
      )}
    </li>
  );

  switch (node.type) {
    case "text":
      return renderTextNode();
    case "comment":
      return renderCommentNode();
    case "doctype":
      return renderDocTypeNode();
    case "pseudo":
      return renderPseudoNode();
    default:
      return renderElementNode();
  }
};
