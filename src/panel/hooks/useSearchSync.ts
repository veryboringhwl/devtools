import { useCallback, useEffect, useRef } from "react";

import { useStore } from "../stores/useStore.ts";

import type { TreeNode } from "../types.ts";

export function useSearchSync(domData: TreeNode | null) {
  const classMapper = useStore((s) => s.classMapper);
  const selectedId = useStore((s) => s.selectedId);
  const searchQuery = useStore((s) => s.searchQuery);
  const setSelectedId = useStore((s) => s.setSelectedId);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const setSearchResults = useStore((s) => s.setSearchResults);
  const setSearchIndex = useStore((s) => s.setSearchIndex);

  const selectedIdRef = useRef(selectedId);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const nextSearchRef = useRef<() => void>(() => {});
  const prevSearchRef = useRef<() => void>(() => {});

  const nextSearch = useCallback(() => {
    const results = useStore.getState().searchResults;
    if (results.length === 0) return;
    const idx = useStore.getState().searchIndex;
    const nextIdx = (idx + 1) % results.length;
    const nextId = results[nextIdx];
    if (nextId !== undefined) {
      setSelectedId(nextId);
      setSearchIndex(nextIdx);
    }
  }, [setSelectedId, setSearchIndex]);

  const prevSearch = useCallback(() => {
    const results = useStore.getState().searchResults;
    if (results.length === 0) return;
    const idx = useStore.getState().searchIndex;
    const nextIdx = (idx - 1 + results.length) % results.length;
    const nextId = results[nextIdx];
    if (nextId !== undefined) {
      setSelectedId(nextId);
      setSearchIndex(nextIdx);
    }
  }, [setSelectedId, setSearchIndex]);

  useEffect(() => {
    nextSearchRef.current = nextSearch;
    prevSearchRef.current = prevSearch;
  }, [nextSearch, prevSearch]);

  useEffect(() => {
    if (!chrome.devtools?.panels?.elements) return;

    const handleSelection = () => {
      chrome.devtools.inspectedWindow.eval(
        "window.__EXT_DEVTOOLS__ ? window.__EXT_DEVTOOLS__.getId($0) : null",
        (id, isException) => {
          if (!isException && typeof id === "number") setSelectedId(id);
        }
      );
    };

    chrome.devtools.panels.elements.onSelectionChanged.addListener(handleSelection);
    handleSelection();

    return () => {
      chrome.devtools.panels.elements.onSelectionChanged.removeListener(handleSelection);
    };
  }, [setSelectedId]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as Record<string, unknown> | undefined;
      if (data?.source !== "devtools-command") return;
      const { action, query } = data;
      if (action === "performSearch") setSearchQuery(String(query || ""));
      if (action === "nextSearchResult") nextSearchRef.current();
      if (action === "previousSearchResult") prevSearchRef.current();
      if (action === "cancelSearch") {
        setSearchQuery("");
        setSearchResults([]);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [setSearchQuery, setSearchResults]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F3") {
        e.preventDefault();
        if (e.shiftKey) {
          prevSearchRef.current();
        } else {
          nextSearchRef.current();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
      if (node.type === "pseudo" && node.pseudoType?.toLowerCase().includes(lowerQuery)) {
        isMatch = true;
      }
      if (node.tag?.toLowerCase().includes(lowerQuery)) isMatch = true;

      if (node.attrs) {
        for (const [k, v] of Object.entries(node.attrs)) {
          const attrVal: string = v;
          const val = k === "class" ? classMapper(attrVal).displayStr : attrVal;
          if (val.toLowerCase().includes(lowerQuery)) {
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
        const first = matches[0];
        if (first !== undefined) setSelectedId(first);
      }
    } else {
      setSearchIndex(0);
      setSelectedId(null);
    }
  }, [searchQuery, domData, classMapper, setSearchResults, setSearchIndex, setSelectedId]);
}
