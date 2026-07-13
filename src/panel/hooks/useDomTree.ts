import { useEffect } from "react";

import { useStore } from "../stores/useStore.ts";

export function useDomTree(tabId: number) {
  const refreshDOM = useStore((s) => s.refreshDOM);
  const injectBackend = useStore((s) => s.injectBackend);

  useEffect(() => {
    const init = async () => {
      const ok = await injectBackend();
      if (ok) refreshDOM();
    };
    void init();

    const intervalId = setInterval(() => {
      chrome.devtools.inspectedWindow.eval(
        "window.__EXT_DEVTOOLS__ && window.__EXT_DEVTOOLS__.checkMutations()",
        (hasMutations, isException) => {
          if (hasMutations && !isException) refreshDOM();
        }
      );
    }, 500);

    const onNavigated = () => {
      void injectBackend().then((ok) => {
        if (ok) refreshDOM();
      });
    };
    chrome.devtools.network.onNavigated.addListener(onNavigated);

    return () => {
      clearInterval(intervalId);
      chrome.devtools.network.onNavigated.removeListener(onNavigated);
    };
  }, [tabId, injectBackend, refreshDOM]);
}
