# REA investigation

Investigated 27 October 2026 using official `morluto/rea` GitHub raw documents and ordinary shell/source tools. Upstream HEAD observed: `df6db781ddae6a85a370591b3c4f17e140029d87`; package.json identifies `rea-agents` 6.8.0. These are repository observations, not a claim that an installed REA runtime was tested.

Sources:

- [README](https://github.com/morluto/rea/blob/df6db781ddae6a85a370591b3c4f17e140029d87/README.md)
- [Installation](https://github.com/morluto/rea/blob/df6db781ddae6a85a370591b3c4f17e140029d87/docs/installation.md)
- [Client configuration](https://github.com/morluto/rea/blob/df6db781ddae6a85a370591b3c4f17e140029d87/docs/client-configuration.md)
- [MCP contracts](https://github.com/morluto/rea/blob/df6db781ddae6a85a370591b3c4f17e140029d87/docs/mcp-contracts.md)

## Capabilities and applicability

REA documents static JavaScript/Electron analysis, application feature tracing, browser observation/capture comparison, runtime investigation, evidence provenance/coverage, and native binary providers (Hopper/Ghidra/IDA). Static JavaScript does not require a native analysis engine; Linux launches require procps-compatible ps for process ownership checks. Browser/network/runtime work can launch processes, write artifacts and execute target code; it needs an authorized target and review of tool-specific effects.

SkillSetu source is available and ordinary ripgrep, TypeScript and browser tests provide direct evidence more cheaply. PDF image inspection needs no REA. Browser comparison or feature tracing could become useful for an authorized SkillSetu build or a user-provided application artifact whose implementation is unavailable. Native engines add no evidence for this milestone.

`command -v rea` returned no executable. The active tool catalog exposes no REA MCP tools; accessible Codex registration locations showed no REA entry. This establishes no callable REA in this session, not absence from every filesystem/cache or a disconnected desktop elsewhere. No REA command was executed, installed or configured. No reverse-engineering claim is made about Brilliant.

## Read-only configuration proposal — NOT applied

Installation is unnecessary for this vertical slice. If a future authorized investigation needs REA, first verify the official npm release and inspect its proposed effects, then run:

```sh
npx --yes rea-agents@6.8.0 setup --client codex --skill=false --dry-run --json
```

This is a proposed command, not a completed dry-run. npx may download/execute the package and populate npm cache, even though setup's dry-run promises no client-configuration writes. Review before execution. No unrelated provider installation or `--install-hopper` is proposed.

Illustrative TOML merge preview (preserve existing MCP servers, approval settings and unrelated keys):

```toml
[mcp_servers.rea]
command = "npx"
args = ["--yes", "rea-agents@6.8.0", "mcp"]
startup_timeout_sec = 30
tool_timeout_sec = 450

[mcp_servers.rea.env]
REA_MCP_TOOL_FAMILIES = "browser,session,javascript-runtime"
REA_MCP_INPUT_SCHEMA_PROFILE = "compact"
```

Actual launcher/path/timeout and family selection must follow the reviewed setup output, not blindly overwrite a config file. Web packet capture is excluded from this example. Setup documents backups, policy preservation and configuration validation. Applying setup would modify the selected Codex config (`$CODEX_HOME/config.toml`, default `~/.codex/config.toml`); workflow instructions are excluded by `--skill=false`. Installation/configuration requires separate approval. Restart/reconnect Codex after an approved apply, then verify tools/list and doctor readiness before use. No current work depends on that restart.

## Limits and implementation consequences

We have no Brilliant source, authenticated application session, private API, authorized binary or captured runtime. Screenshots cannot expose backend, grading, adaptation or persistence rules. No login/subscription/protection bypass was attempted. All SkillSetu adaptation and assessment policy in this change are original authored rules. The evidence/uncertainty distinction informed the documentation; no REA output was used as implementation evidence.

## UI clarification — 2026-10-29
The user asked whether REA was used and requested a closer Brilliant-style educational interface. Answer: documentation was consulted, but REA was not installed or run. The exposed session tool catalog still contains no REA tools. This visual revision uses the supplied PDF and direct SkillSetu source/browser verification. The [official repository](https://github.com/morluto/rea) was reread; no new REA runtime evidence was collected and no global registration was modified.

## REA installed and executed — 2026-10-29
Supersedes the previous no-runtime status for this new task only: official rea-agents 6.8.0 is now installed locally in an ignored tools directory with isolated Node 24.22.1. Version reporting, five browser-scenario captures and two normalized capture comparisons ran successfully against disposable SkillSetu staging. No global MCP registration was changed. The executable launcher, exact evidence IDs, artifacts, limitations and commands are documented in [rea-animation/README.md](rea-animation/README.md). Earlier UI work was still source/PDF based; do not retrospectively label it REA analysis.
