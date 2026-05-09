import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "./Icons";

export interface TreeNode {
  id: number;
  type: string;
  tag?: string;
  val?: string;
  name?: string;
  pseudoType?: string;
  attrs?: Record<string, string>;
  children?: TreeNode[];
}

export interface ClassToken {
  original: string;
  mapped: string;
  isMapped: boolean;
}

export interface ClassMapResult {
  displayStr: string;
  tokens: ClassToken[];
}

interface TreeViewNodeProps {
  node: TreeNode;
  mapClass: (className: string) => ClassMapResult;
  selectedId: number | null;
  onSelect: (id: number) => void;
  searchResults: number[];
  searchIndex: number;
  searchQuery: string;
  onHoverNode: (id: number) => void;
  onShowTooltip: (tooltip: { text: string; x: number; y: number }) => void;
  onHideTooltip: () => void;
}

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
        ),
      )}
    </>
  );
};

export const TreeViewNode = ({
  node,
  mapClass,
  selectedId,
  onSelect,
  searchResults,
  searchIndex,
  searchQuery,
  onHoverNode,
  onShowTooltip,
  onHideTooltip,
}: TreeViewNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const elementRef = useRef<HTMLLIElement | HTMLDivElement>(null);
  const isSelected = selectedId === node.id;
  const isSearchResult = searchResults?.includes(node.id);
  const isCurrentMatch = isSearchResult && searchResults[searchIndex] === node.id;
  const hasChildren = node.children && node.children.length > 0;

  const hasDescendantSelected = useMemo(() => {
    const check = (children?: TreeNode[]): boolean => {
      if (!children) return false;
      for (const c of children) {
        if (c.id === selectedId) return true;
        if (check(c.children)) return true;
      }
      return false;
    };
    return check(node.children);
  }, [selectedId, node.children]);

  useEffect(() => {
    if (hasDescendantSelected) setIsExpanded(true);
  }, [hasDescendantSelected]);

  useEffect(() => {
    if (isSelected && elementRef.current) {
      const timer = setTimeout(() => {
        elementRef.current?.scrollIntoView({ block: "center", behavior: "auto" });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isSelected]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasChildren) return;
    if (isExpanded && hasDescendantSelected) onSelect(node.id);
    setIsExpanded(!isExpanded);
  };

  const getRowClass = () => {
    let cls =
      "flex items-start group cursor-default rounded-sm transition-colors duration-75 max-w-full min-w-0";
    if (isSelected) cls += " bg-[#004a77] text-white";
    else if (isCurrentMatch) cls += " bg-[#3d3d3d] ring-1 ring-inset ring-gray-500";
    else if (isSearchResult) cls += " bg-[#35363a]";
    else cls += " hover:bg-[#3d3d3d]";
    return cls;
  };

  const renderTextNode = () => (
    <li
      className={`${getRowClass()} pl-8 break-all whitespace-normal`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      onMouseEnter={(e) => {
        e.stopPropagation();
        onHoverNode(node.id);
      }}
      ref={elementRef as React.Ref<HTMLLIElement>}
    >
      <span className={isSelected ? "text-white" : "text-[#eeeeee]"}>
        "<HighlightText query={searchQuery} text={node.val} />"
      </span>
    </li>
  );

  const renderCommentNode = () => (
    <li
      className={`${getRowClass()} pl-8`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      onMouseEnter={(e) => {
        e.stopPropagation();
        onHoverNode(node.id);
      }}
      ref={elementRef as React.Ref<HTMLLIElement>}
    >
      <span className={isSelected ? "text-white" : "text-[#89b482]"}>
        &lt;!-- <HighlightText query={searchQuery} text={node.val} /> --&gt;
      </span>
    </li>
  );

  const renderDocTypeNode = () => (
    <li
      className={`${getRowClass()} pl-8`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      onMouseEnter={(e) => {
        e.stopPropagation();
        onHoverNode(node.id);
      }}
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
      className={`${getRowClass()} pl-8`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      onMouseEnter={(e) => {
        e.stopPropagation();
        onHoverNode(node.id);
      }}
      ref={elementRef as React.Ref<HTMLLIElement>}
    >
      <span className={isSelected ? "text-white" : "text-[#e293ca]"}>
        ::
        <HighlightText query={searchQuery} text={node.pseudoType} />
      </span>
    </li>
  );

  const renderAttributes = () => {
    if (!node.attrs) return null;
    return Object.entries(node.attrs).map(([key, val]) => {
      if (key === "class") {
        const mapResult = mapClass(val);
        return (
          <span className="ml-1.5 inline-block" key={key}>
            <span className="text-[#a8c7fa]">
              <HighlightText query={searchQuery} text={key} />
            </span>
            <span className="text-gray-400">=</span>
            <span className="text-[#fe8d59]">
              "
              {mapResult.tokens.map((token, idx) => (
                <span key={token.original}>
                  {token.isMapped ? (
                    <span
                      className="cursor-default"
                      onMouseEnter={(e: React.MouseEvent) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        onShowTooltip({ text: token.original, x: rect.left, y: rect.top - 24 });
                      }}
                      onMouseLeave={onHideTooltip}
                    >
                      <HighlightText query={searchQuery} text={token.mapped} />
                    </span>
                  ) : (
                    <HighlightText query={searchQuery} text={token.mapped} />
                  )}
                  {idx < mapResult.tokens.length - 1 ? " " : ""}
                </span>
              ))}
              "
            </span>
          </span>
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
  };

  const renderElementNode = () => (
    <li className="list-none max-w-full min-w-0">
      <div
        className={getRowClass()}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
        onMouseEnter={(e) => {
          e.stopPropagation();
          onHoverNode(node.id);
        }}
        ref={elementRef as React.Ref<HTMLDivElement>}
      >
        <div
          className="w-5 h-5 flex items-center justify-center shrink-0 cursor-pointer select-none"
          onClick={handleToggle}
        >
          {hasChildren && (
            <span className={isSelected ? "text-white" : "text-gray-400 group-hover:text-gray-200"}>
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center min-w-0 pr-2 leading-5 whitespace-normal break-all">
          <span className="text-[#7cacf8] shrink-0 select-none">{"<"}</span>
          <span className="text-[#7cacf8] font-semibold">
            <HighlightText query={searchQuery} text={node.tag} />
          </span>
          {renderAttributes()}
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
              <TreeViewNode
                key={child.id}
                mapClass={mapClass}
                node={child}
                onHideTooltip={onHideTooltip}
                onHoverNode={onHoverNode}
                onSelect={onSelect}
                onShowTooltip={onShowTooltip}
                searchIndex={searchIndex}
                searchQuery={searchQuery}
                searchResults={searchResults}
                selectedId={selectedId}
              />
            ))}
          </ul>

          <div
            className={`${getRowClass()} pl-5`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(node.id);
            }}
            onMouseEnter={(e) => {
              e.stopPropagation();
              onHoverNode(node.id);
            }}
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
