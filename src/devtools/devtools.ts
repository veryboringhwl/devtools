let panelWindow: Window | null = null;

chrome.devtools.panels.create("Mapped Elements", "", "panel.html", (panel) => {
  panel.onShown.addListener((pw) => {
    panelWindow = pw;
  });

  panel.onHidden.addListener(() => {
    panelWindow = null;
  });

  panel.onSearch.addListener((action, queryString) => {
    if (panelWindow) {
      panelWindow.postMessage(
        {
          source: "devtools-command",
          action,
          query: queryString || "",
        },
        "*",
      );
    }
  });
});
