#!/usr/bin/env node
/*
 * grok-cli — a tiny, dependency-free Grok assistant for Home Assistant.
 *
 * Pure Node.js (built-ins only) so it runs anywhere Node runs — including
 * older CPUs without AVX, where Bun-based CLIs crash. Talks to xAI's
 * OpenAI-compatible API and can read/write/edit files and run shell
 * commands in your /config directory.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { execFile } = require('child_process');

// ---- Config from environment -------------------------------------------------
const API_KEY = process.env.GROK_API_KEY || '';
const BASE_URL = (process.env.GROK_BASE_URL || 'https://api.x.ai/v1').replace(/\/+$/, '');
const MODEL = process.env.GROK_MODEL || 'grok-code-fast-1';
const MAX_TOKENS = parseInt(process.env.GROK_MAX_TOKENS || '8192', 10);
const WORKDIR = process.env.GROK_WORKDIR || '/config';
const MAX_TOOL_OUTPUT = 24000; // chars, to keep context manageable

// ---- Tiny ANSI helpers -------------------------------------------------------
const c = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', teal: '\x1b[38;5;44m', grey: '\x1b[90m',
};
const paint = (col, s) => `${col}${s}${c.reset}`;

// ---- System prompt -----------------------------------------------------------
const SYSTEM_PROMPT = `You are Grok, an AI assistant running inside a Home Assistant add-on terminal.
You are helping the user manage their Home Assistant setup. Your working directory is ${WORKDIR}, which contains their Home Assistant configuration (configuration.yaml, automations.yaml, scripts, custom_components, etc.).

You have tools to read, write and edit files, list directories, and run shell commands. Use them to inspect and modify the configuration when asked.

Guidelines:
- Prefer reading a file before editing it. When editing, keep changes minimal and preserve the surrounding YAML style and indentation.
- Home Assistant YAML is whitespace-sensitive. Never break indentation.
- After changing configuration, remind the user to check the config (e.g. via "ha core check" if the 'ha' CLI is available) and reload/restart the relevant part.
- The environment variables HASS_URL and HASS_TOKEN are available to shell commands, so you can query the live API, e.g.:
    curl -s -H "Authorization: Bearer $HASS_TOKEN" $HASS_URL/api/states
- Be concise. Explain what you changed and why. Ask before doing anything destructive or irreversible.`;

// ---- Tool definitions (OpenAI-compatible) -----------------------------------
const tools = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a text file. Path may be relative to the working directory or absolute.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'File path to read' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Create a new file or completely overwrite an existing file with the given content.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to write' },
          content: { type: 'string', description: 'Full file content' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description: 'Replace an exact substring in a file with new text. Use for small, targeted edits. old_string must occur exactly once.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          old_string: { type: 'string', description: 'Exact text to replace' },
          new_string: { type: 'string', description: 'Replacement text' },
        },
        required: ['path', 'old_string', 'new_string'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_dir',
      description: 'List the files and folders in a directory.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Directory path (default: working directory)' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_shell',
      description: 'Run a bash shell command in the working directory and return its output. Use for git, grep, ha CLI, curl to the HA API, checking config, etc.',
      parameters: {
        type: 'object',
        properties: { command: { type: 'string', description: 'The bash command to run' } },
        required: ['command'],
      },
    },
  },
];

// ---- Tool implementations ----------------------------------------------------
function resolvePath(p) {
  if (!p) return WORKDIR;
  return path.isAbsolute(p) ? p : path.resolve(WORKDIR, p);
}

function clip(s) {
  if (s.length > MAX_TOOL_OUTPUT) {
    return s.slice(0, MAX_TOOL_OUTPUT) + `\n… [truncated ${s.length - MAX_TOOL_OUTPUT} chars]`;
  }
  return s;
}

function runShell(command) {
  return new Promise((resolve) => {
    execFile('bash', ['-lc', command], { cwd: WORKDIR, timeout: 120000, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout, stderr) => {
        let out = (stdout || '') + (stderr ? `\n[stderr]\n${stderr}` : '');
        if (err && err.killed) out += '\n[command timed out after 120s]';
        if (err && typeof err.code === 'number') out += `\n[exit code ${err.code}]`;
        resolve(clip(out.trim() || '(no output)'));
      });
  });
}

async function execTool(name, args) {
  try {
    switch (name) {
      case 'read_file': {
        const fp = resolvePath(args.path);
        return clip(fs.readFileSync(fp, 'utf8'));
      }
      case 'write_file': {
        const fp = resolvePath(args.path);
        fs.mkdirSync(path.dirname(fp), { recursive: true });
        fs.writeFileSync(fp, args.content, 'utf8');
        return `Wrote ${Buffer.byteLength(args.content)} bytes to ${fp}`;
      }
      case 'edit_file': {
        const fp = resolvePath(args.path);
        const cur = fs.readFileSync(fp, 'utf8');
        const parts = cur.split(args.old_string);
        if (parts.length === 1) return `ERROR: old_string not found in ${fp}`;
        if (parts.length > 2) return `ERROR: old_string is not unique in ${fp} (${parts.length - 1} matches)`;
        fs.writeFileSync(fp, parts.join(args.new_string), 'utf8');
        return `Edited ${fp}`;
      }
      case 'list_dir': {
        const fp = resolvePath(args.path);
        const entries = fs.readdirSync(fp, { withFileTypes: true })
          .map((e) => (e.isDirectory() ? e.name + '/' : e.name))
          .sort();
        return clip(entries.join('\n') || '(empty)');
      }
      case 'run_shell':
        return await runShell(args.command);
      default:
        return `ERROR: unknown tool ${name}`;
    }
  } catch (e) {
    return `ERROR: ${e.message}`;
  }
}

// ---- xAI API call ------------------------------------------------------------
async function callModel(messages) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools,
      tool_choice: 'auto',
      max_tokens: MAX_TOKENS,
      temperature: 0.2,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.choices[0].message;
}

// ---- Simple spinner ----------------------------------------------------------
function startSpinner(label) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const id = setInterval(() => {
    process.stdout.write(`\r${c.teal}${frames[i++ % frames.length]}${c.reset} ${c.dim}${label}${c.reset} `);
  }, 80);
  return () => {
    clearInterval(id);
    process.stdout.write('\r\x1b[2K'); // clear line
  };
}

// ---- Agent turn: run tool loop until a final text answer ---------------------
async function runTurn(messages) {
  for (let step = 0; step < 25; step++) {
    const stop = startSpinner('Grok is thinking…');
    let msg;
    try {
      msg = await callModel(messages);
    } catch (e) {
      stop();
      console.log(paint(c.red, `\n⚠  ${e.message}\n`));
      return;
    }
    stop();

    messages.push(msg);

    if (msg.content && msg.content.trim()) {
      console.log('\n' + paint(c.bold + c.teal, 'Grok') + '  ' + msg.content.trim() + '\n');
    }

    const calls = msg.tool_calls || [];
    if (calls.length === 0) return; // final answer reached

    for (const call of calls) {
      let args = {};
      try { args = JSON.parse(call.function.arguments || '{}'); } catch (_) {}
      const label = describeCall(call.function.name, args);
      console.log(paint(c.grey, `  ↳ ${label}`));
      const result = await execTool(call.function.name, args);
      messages.push({ role: 'tool', tool_call_id: call.id, content: String(result) });
    }
  }
  console.log(paint(c.yellow, '\n⚠  Stopped after too many tool steps.\n'));
}

function describeCall(name, args) {
  switch (name) {
    case 'read_file': return `read ${args.path}`;
    case 'write_file': return `write ${args.path}`;
    case 'edit_file': return `edit ${args.path}`;
    case 'list_dir': return `list ${args.path || WORKDIR}`;
    case 'run_shell': return `run: ${String(args.command || '').split('\n')[0]}`;
    default: return `${name}(${JSON.stringify(args)})`;
  }
}

// ---- REPL --------------------------------------------------------------------
function banner() {
  console.log(paint(c.teal + c.bold, '\n  Grok Terminal') + paint(c.dim, `  ·  model: ${MODEL}`));
  console.log(paint(c.dim, `  Working in ${WORKDIR}. I can read, edit and run things here.`));
  console.log(paint(c.dim, '  Type your request. Commands: /reset  /help  /exit\n'));
}

function help() {
  console.log(paint(c.dim, [
    '',
    '  Ask me to inspect or change your Home Assistant config, e.g.:',
    '   • "Add a template sensor averaging my three temperature sensors"',
    '   • "Why is my sunset automation not firing? Check the logs."',
    '   • "Create an automation that turns off all lights at midnight"',
    '',
    '  /reset  start a fresh conversation',
    '  /help   show this help',
    '  /exit   quit (or Ctrl+D)',
    '',
  ].join('\n')));
}

async function main() {
  if (!API_KEY) {
    console.log(paint(c.yellow, '\n⚠  No xAI API key configured.'));
    console.log(paint(c.dim, '   Set it in the add-on Configuration tab (get one at https://console.x.ai) and restart.\n'));
    process.exit(1);
  }

  banner();

  let messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = () => rl.setPrompt(paint(c.green + c.bold, 'you ') + paint(c.green, '› '));

  prompt();
  rl.prompt();

  rl.on('line', async (line) => {
    const text = line.trim();
    if (!text) { rl.prompt(); return; }

    if (text === '/exit' || text === '/quit') { rl.close(); return; }
    if (text === '/help') { help(); rl.prompt(); return; }
    if (text === '/reset') {
      messages = [{ role: 'system', content: SYSTEM_PROMPT }];
      console.log(paint(c.dim, '  (conversation reset)\n'));
      rl.prompt();
      return;
    }

    messages.push({ role: 'user', content: text });
    rl.pause();
    await runTurn(messages);
    rl.resume();
    rl.prompt();
  });

  rl.on('close', () => {
    console.log(paint(c.dim, '\n  Bye 👋\n'));
    process.exit(0);
  });
}

main();
