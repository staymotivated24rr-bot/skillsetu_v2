# Run the isolated, verified local REA installation; no global PATH edits.
$runtime = Join-Path $PSScriptRoot '..\.env.local-runtime\rea-runtime\node_modules'
$reaNode = Join-Path $runtime 'node-win-x64\bin\node.exe'
$reaEntry = Join-Path $runtime 'rea-agents\scripts\rea.mjs'
if (!(Test-Path -LiteralPath $reaNode) -or !(Test-Path -LiteralPath $reaEntry)) {
  throw 'Local REA is missing. See docs/diagnostic-v2/rea-animation/README.md.'
}
& $reaNode $reaEntry @args
exit $LASTEXITCODE
