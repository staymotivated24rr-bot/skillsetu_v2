// The opaque iframe is a security boundary; Python import restrictions are defense in depth.
export function sandboxDocument(origin: string) {
  const assets = `${origin}/python/`;
  const worker = `
let runtime;
self.onmessage = async event => {
  const { code, inputs, functionName, requestId } = event.data;
  try {
    importScripts(${JSON.stringify(assets + 'pyodide.js')});
    runtime = await loadPyodide({ indexURL: ${JSON.stringify(assets)}, stdout: () => {}, stderr: () => {} });
    // No runtime package downloads, network primitives, nested workers or JS host APIs.
    for (const name of ['fetch','XMLHttpRequest','WebSocket','EventSource','importScripts','Worker','SharedWorker']) {
      Object.defineProperty(self, name, { value: undefined, writable: false, configurable: false });
    }
    runtime.globals.set('_source', code);
    runtime.globals.set('_inputs_json', JSON.stringify(inputs));
    runtime.globals.set('_function_name', functionName);
    self.postMessage({ kind: 'ready', requestId });
    const outputs = await runtime.runPythonAsync(\`
import json, builtins
_real_import = builtins.__import__
_allowed = {'json', 'math', 'collections', 're', 'csv', 'io', 'itertools', 'functools', 'decimal', 'statistics'}
def _limited_import(name, *args, **kwargs):
    if name.split('.')[0] not in _allowed:
        raise ImportError('This task permits computation and approved standard-library modules only.')
    return _real_import(name, *args, **kwargs)
_safe_builtins = dict(vars(builtins))
_safe_builtins['__import__'] = _limited_import
for _name in ('open', 'input', 'breakpoint'):
    _safe_builtins.pop(_name, None)
_namespace = {'__builtins__': _safe_builtins}
exec(_source, _namespace, _namespace)
_results = []
for _args in json.loads(_inputs_json):
    try:
        _original_input = json.dumps(_args, sort_keys=True)
        _value = _namespace[_function_name](*_args)
        if json.dumps(_args, sort_keys=True) != _original_input:
            raise ValueError('The task contract requires preserving input data')
        _encoded = json.dumps(_value, allow_nan=False)
        if len(_encoded) > 10000:
            raise ValueError('Output exceeds task limit')
        _results.append(json.loads(_encoded))
    except Exception as _error:
        _results.append({'executionError': type(_error).__name__ + ': ' + str(_error)[:200]})
json.dumps(_results, allow_nan=False)
\`);
    self.postMessage({ kind: 'result', outputs: JSON.parse(outputs), requestId });
  } catch(error) { self.postMessage({ kind:'error', error: String(error).slice(0,1500), requestId }); }
};`;
  const csp = `default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: ${assets}; connect-src ${assets}; worker-src blob:; child-src blob:; style-src 'none'; img-src 'none'; form-action 'none'; base-uri 'none'`;
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${csp}"></head><body><script>
const workerSource = ${JSON.stringify(worker).replace(/</g, '\\u003c')};
let worker;
window.addEventListener('message', event => {
  if(event.source !== parent || !event.data || event.data.kind !== 'run') return;
  worker?.terminate();
  worker = new Worker(URL.createObjectURL(new Blob([workerSource], {type:'text/javascript'})));
  worker.onmessage = message => parent.postMessage(message.data, '*');
  worker.onerror = () => parent.postMessage({kind:'error', error:'Python worker could not load. Retry the task.', requestId:event.data.requestId}, '*');
  worker.postMessage(event.data);
});
parent.postMessage({kind:'frame-ready'}, '*');
</script></body></html>`;
}
