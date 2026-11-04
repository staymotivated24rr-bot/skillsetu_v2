import type { AuthenticTask, TaskPayload } from '../src/lib/authentic/types';
// Test-only solutions are never imported by application modules or exposed by public APIs.
export function solution(task: Pick<AuthenticTask, 'skillIds' | 'prompt'>): string {
  const key = task.skillIds[0].skillId.replace('py-', '');
  const prompt = task.prompt;
  const factor = Number(
    prompt.match(/(?:value \*|add|multiplied by|initial balance) (\d+)/)?.[1] ?? 1,
  );
  const field =
    prompt.match(/(?:price, |the |body\[")(quantity|nights|months|slots|tickets)/)?.[1] ??
    'quantity';
  const prefix = prompt.includes('event_id') ? 'event_id' : 'record_id';
  switch (key) {
    case 'fundamentals':
    case 'validation':
      return `def solve(value):\n    return value * ${factor} if type(value) is int and value > 0 else None`;
    case 'functions':
    case 'quality':
      return `def solve(price, quantity):\n    return price * quantity if type(price) in (int, float) and price >= 0 and type(quantity) is int and quantity > 0 else None`;
    case 'structures':
    case 'reasoning':
      return `def solve(rows):\n    seen = set()\n    result = []\n    for row in rows:\n        if row['${prefix}'] not in seen:\n            seen.add(row['${prefix}'])\n            result.append(row['amount'])\n    return result`;
    case 'comprehensions':
      return `def solve(rows):\n    return [r['${field}'] for r in rows if type(r.get('${field}')) is int and r['${field}'] > 0]`;
    case 'exceptions':
      return `def solve(text):\n    try:\n        return int(text) + ${factor}\n    except (ValueError, TypeError):\n        return None`;
    case 'files':
      return `import json\ndef solve(text):\n    try:\n        rows = json.loads(text)\n    except (ValueError, TypeError):\n        return None\n    if not isinstance(rows, list):\n        return None\n    return sum(1 for r in rows if isinstance(r, dict) and isinstance(r.get('${prefix}'), str) and r['${prefix}'])`;
    case 'debugging':
      return `def solve(values):\n    return [v * ${factor} for v in values if type(v) is int and v > 0]`;
    case 'testing':
      return `def solve(value):\n    return 'valid' if type(value) is int and 1 <= value <= ${Number(prompt.match(/through (\d+)/)?.[1])} else 'invalid'`;
    case 'http':
      return `def solve(response):\n    if not isinstance(response, dict) or response.get('status') != 200 or not isinstance(response.get('body'), dict):\n        return None\n    value = response['body'].get('${field}')\n    return value if type(value) is int and value >= 0 else None`;
    case 'oop':
      return `class Account:\n    def __init__(self, balance):\n        self.balance = balance\n    def add(self, value):\n        if type(value) is int and value >= 0:\n            self.balance += value\ndef solve(amounts):\n    account = Account(${factor})\n    for amount in amounts:\n        account.add(amount)\n    return account.balance`;
    default:
      throw new Error('Missing fixture for ' + key);
  }
}
export function correctPayload(task: AuthenticTask): TaskPayload {
  if (task.cases) return { code: solution(task), outputs: task.cases.map((c) => c.expected) };
  if (task.options) return { selected: task.correct };
  if (task.steps) return { order: task.order };
  return {
    text: `In this workflow I would verify ${task.rubric!.map((r) => r.concepts[0]).join(', ')}. I would confirm the acceptance contract with the owner and document the limitation before rollout.`,
  };
}
export function wrongPayload(task: AuthenticTask): TaskPayload {
  if (task.cases)
    return {
      code: 'def solve(*args):\n    return None',
      outputs: task.cases.map(() => ({ invalid: true })),
    };
  if (task.options) return { selected: (task.correct! + 1) % task.options.length };
  if (task.steps) return { order: [...task.order!].reverse() };
  return { text: 'I am not sure.' };
}
