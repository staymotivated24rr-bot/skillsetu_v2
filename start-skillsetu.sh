#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  echo 'Install Node.js 24 from https://nodejs.org, then run this script again.'
  exit 1
fi
if [ ! -f .env ]; then cp .env.example .env; fi
if [ ! -d node_modules ]; then npm ci --ignore-scripts; fi
npm run setup
printf '\nSkillSetu is starting. Open http://localhost:3000 in your browser.\nKeep this terminal open; press Ctrl+C to stop.\n\n'
npm run dev
