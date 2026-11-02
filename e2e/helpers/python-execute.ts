export async function execute(
  page: import('@playwright/test').Page,
  code: string,
  inputs: unknown[][],
  functionName = 'solve',
  documentOverride?: string,
) {
  return page.evaluate(
    async ({ code, inputs, functionName, documentOverride }) => {
      const doc = documentOverride ?? (await (await fetch('/api/python-sandbox')).text());
      return new Promise<{ kind: string; outputs?: unknown[]; error?: string }>((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.sandbox.add('allow-scripts');
        iframe.hidden = true;
        const requestId = crypto.randomUUID();
        let timeout: ReturnType<typeof setTimeout>;
        const finish = (value: { kind: string; outputs?: unknown[]; error?: string }) => {
          clearTimeout(timeout);
          window.removeEventListener('message', listener);
          iframe.remove();
          resolve(value);
        };
        const listener = (e: MessageEvent) => {
          if (e.source !== iframe.contentWindow) return;
          if (e.data?.kind === 'frame-ready')
            iframe.contentWindow?.postMessage(
              { kind: 'run', code, inputs, functionName, requestId },
              '*',
            );
          if (e.data?.requestId !== requestId) return;
          if (e.data.kind === 'ready') {
            clearTimeout(timeout);
            timeout = setTimeout(() => finish({ kind: 'timeout' }), 1500);
          }
          if (['result', 'error'].includes(e.data.kind)) finish(e.data);
        };
        window.addEventListener('message', listener);
        timeout = setTimeout(() => finish({ kind: 'load-timeout' }), 60000);
        iframe.srcdoc = doc;
        document.body.append(iframe);
      });
    },
    { code, inputs, functionName, documentOverride },
  );
}
