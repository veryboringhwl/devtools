interface SerializedNode {
  type: string;
  id: number;
  tag?: string;
  val?: string;
  name?: string;
  attrs?: Record<string, string>;
  children?: SerializedNode[];
}

interface DevToolsAPI {
  nextId: number;
  nodeToId: Map<Node, number>;
  idToNode: Map<number, Node>;
  mutations: boolean;
  observer: MutationObserver | null;
  init(): void;
  getId(node: Node): number;
  serializeAttributes(el: Element): Record<string, string>;
  serializeNode(node: Node): SerializedNode | null;
  getDOM(): SerializedNode | null;
  checkMutations(): boolean;
  highlightNode(id: number): void;
  clearHighlight(): void;
}

declare global {
  interface Window {
    __EXT_DEVTOOLS__: DevToolsAPI;
  }
}

if (!window.__EXT_DEVTOOLS__) {
  const api: DevToolsAPI = {
    nextId: 1,
    nodeToId: new Map<Node, number>(),
    idToNode: new Map<number, Node>(),
    mutations: false,
    observer: null,

    init() {
      if (this.observer) return;
      this.observer = new MutationObserver(() => {
        api.mutations = true;
      });
      this.observer.observe(document.documentElement, {
        childList: true,
        attributes: true,
        subtree: true,
        characterData: true
      });
    },

    getId(node: Node): number {
      const existing = this.nodeToId.get(node);
      if (existing !== undefined) return existing;
      const id = this.nextId++;
      this.nodeToId.set(node, id);
      this.idToNode.set(id, node);
      return id;
    },

    serializeAttributes(el: Element): Record<string, string> {
      const attrs: Record<string, string> = {};
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        if (attr) {
          attrs[attr.name] = attr.value;
        }
      }
      return attrs;
    },

    serializeNode(node: Node): SerializedNode | null {
      if (node.nodeType === 3) {
        const text = (node.nodeValue || "").trim();
        if (!text) return null;
        return { type: "text", val: text, id: this.getId(node) };
      }
      if (node.nodeType === 8) {
        return { type: "comment", val: node.nodeValue || "", id: this.getId(node) };
      }
      if (node.nodeType === 10) {
        return {
          type: "doctype",
          name: (node as DocumentType).name,
          id: this.getId(node)
        };
      }
      if (node.nodeType === 1 || node.nodeType === 9 || node.nodeType === 11) {
        const el = node as Element | Document | DocumentFragment;
        const rawChildren: Node[] = Array.from(el.childNodes);

        if ("shadowRoot" in el && el.shadowRoot) {
          rawChildren.push(el.shadowRoot);
        }
        if ("contentDocument" in el && (el as HTMLIFrameElement).contentDocument) {
          rawChildren.push((el as HTMLIFrameElement).contentDocument!);
        }

        return {
          type: "element",
          tag: (node.nodeName || "DOCUMENT").toLowerCase(),
          attrs: node.nodeType === 1 ? this.serializeAttributes(node as Element) : {},
          children: rawChildren
            .map((c) => api.serializeNode(c))
            .filter((n): n is SerializedNode => n !== null),
          id: this.getId(node)
        };
      }
      return null;
    },

    getDOM(): SerializedNode | null {
      this.init();
      this.mutations = false;
      return this.serializeNode(document);
    },

    checkMutations(): boolean {
      if (this.mutations) {
        this.mutations = false;
        return true;
      }
      return false;
    },

    highlightNode(id: number): void {
      this.clearHighlight();
      const node = this.idToNode.get(id);
      if (!node || node.nodeType !== 1) return;

      const el = node as Element;
      const rect = el.getBoundingClientRect();

      const overlay = document.createElement("div");
      overlay.id = "__ext_devtools_overlay__";
      overlay.style.position = "fixed";
      overlay.style.top = `${rect.top}px`;
      overlay.style.left = `${rect.left}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.backgroundColor = "rgba(111, 168, 220, 0.5)";
      overlay.style.outline = "2px solid rgba(147, 196, 125, 0.8)";
      overlay.style.zIndex = "2147483647";
      overlay.style.pointerEvents = "none";
      document.body.appendChild(overlay);
    },

    clearHighlight(): void {
      const existing = document.getElementById("__ext_devtools_overlay__");
      if (existing) existing.remove();
    }
  };

  window.__EXT_DEVTOOLS__ = api;
}
