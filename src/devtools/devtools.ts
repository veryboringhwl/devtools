chrome.devtools.panels.create("Mapped Elements", "", "panel.html", (panel) => {
  panel.onShown.addListener((panelWindow: Window) => {
    (window as unknown as Record<string, unknown>).__panelWindow = panelWindow;
  });

  panel.onHidden.addListener(() => {
    (window as unknown as Record<string, unknown>).__panelWindow = null;
  });

  panel.onSearch.addListener((action: string, queryString?: string) => {
    const pw = (window as unknown as Record<string, Window | null>).__panelWindow;
    if (pw) {
      pw.postMessage(
        {
          source: "devtools-command",
          action,
          query: queryString || ""
        },
        "*"
      );
    }
  });
});
