#! /usr/bin/env node

import { spawnSync } from 'child_process';
import fs from 'fs';

type PnpmNode = {
  version?: string;
  dependencies?: Record<string, PnpmNode>;
  devDependencies?: Record<string, PnpmNode>;
};

type Result = {
  depth: number;
  path: string[];
};

spawnSync('pnpm list --depth Infinity --json > deps.json', { shell: true });
const data = JSON.parse(fs.readFileSync('deps.json', 'utf8'));
fs.rmSync('deps.json');

function findMaxDepth(
  deps: Record<string, PnpmNode> | undefined,
  currentPath: string[],
): Result {
  if (!deps || Object.keys(deps).length === 0) {
    return { depth: 0, path: currentPath };
  }

  let maxResult: Result = { depth: 0, path: currentPath };

  for (const [depName, node] of Object.entries(deps)) {
    const label = `${depName}@${node.version ?? 'unknown'}`;

    const result = findMaxDepth(node.dependencies, [...currentPath, label]);

    if (result.depth + 1 > maxResult.depth) {
      maxResult = {
        depth: result.depth + 1,
        path: result.path,
      };
    }
  }

  return maxResult;
}

function computeForField(field: 'dependencies' | 'devDependencies') {
  let longest: Result = { depth: 0, path: [] };

  for (const project of data) {
    const rootLabel = `${project.name}@${project.version}`;

    const result = findMaxDepth(project[field], [rootLabel]);

    if (result.depth > longest.depth) {
      longest = result;
    }
  }

  console.log('');
  console.log(`=== ${field.toUpperCase()} ===`);
  console.log('Longest chain length:', longest.depth);
  console.log('');
  console.log(longest.path.join(' → '));
  console.log('');
}

computeForField('dependencies');
computeForField('devDependencies');
