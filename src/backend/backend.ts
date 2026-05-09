export const BACKEND_SCRIPT = `;(function () {
  if (window.__EXT_DEVTOOLS__) return

  window.__EXT_DEVTOOLS__ = {
    nextId: 1,
    nodeToId: new Map(),
    idToNode: new Map(),
    mutations: false,
    observer: null,

    init: function () {
      if (this.observer) return
      this.observer = new MutationObserver(function () {
        window.__EXT_DEVTOOLS__.mutations = true
      })
      this.observer.observe(document.documentElement, {
        childList: true,
        attributes: true,
        subtree: true,
        characterData: true,
      })
    },

    getId: function (node) {
      if (this.nodeToId.has(node)) return this.nodeToId.get(node)
      var id = this.nextId++
      this.nodeToId.set(node, id)
      this.idToNode.set(id, node)
      return id
    },

    serializeAttributes: function (el) {
      var attrs = {}
      for (var i = 0; i < el.attributes.length; i++) {
        var attr = el.attributes[i]
        attrs[attr.name] = attr.value
      }
      return attrs
    },

    serializeNode: function (node) {
      if (node.nodeType === 3) {
        var text = (node.nodeValue || "").trim()
        if (!text) return null
        return { type: "text", val: text, id: this.getId(node) }
      }
      if (node.nodeType === 8) {
        return { type: "comment", val: node.nodeValue, id: this.getId(node) }
      }
      if (node.nodeType === 10) {
        return { type: "doctype", name: node.name, id: this.getId(node) }
      }
      if (node.nodeType === 1 || node.nodeType === 9 || node.nodeType === 11) {
        var rawChildren = Array.from(node.childNodes || [])
        if (node.shadowRoot) rawChildren.push(node.shadowRoot)
        if (node.contentDocument) rawChildren.push(node.contentDocument)

        return {
          type: "element",
          tag: (node.nodeName || "DOCUMENT").toLowerCase(),
          attrs: node.nodeType === 1 ? this.serializeAttributes(node) : {},
          children: rawChildren.map(function (c) { return window.__EXT_DEVTOOLS__.serializeNode(c) }).filter(Boolean),
          id: this.getId(node),
        }
      }
      return null
    },

    getDOM: function () {
      this.init()
      this.mutations = false
      return this.serializeNode(document)
    },

    checkMutations: function () {
      if (this.mutations) {
        this.mutations = false
        return true
      }
      return false
    },

    highlightNode: function (id) {
      this.clearHighlight()
      var node = this.idToNode.get(id)
      if (!node || node.nodeType !== 1) return

      var rect = node.getBoundingClientRect()
      var overlay = document.createElement("div")
      overlay.id = "__ext_devtools_overlay__"
      overlay.style.position = "fixed"
      overlay.style.top = rect.top + "px"
      overlay.style.left = rect.left + "px"
      overlay.style.width = rect.width + "px"
      overlay.style.height = rect.height + "px"
      overlay.style.backgroundColor = "rgba(111, 168, 220, 0.5)"
      overlay.style.outline = "2px solid rgba(147, 196, 125, 0.8)"
      overlay.style.zIndex = "2147483647"
      overlay.style.pointerEvents = "none"
      document.body.appendChild(overlay)
    },

    clearHighlight: function () {
      var existing = document.getElementById("__ext_devtools_overlay__")
      if (existing) existing.remove()
    },
  }
})()`;
