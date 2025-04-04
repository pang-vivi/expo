#!/usr/bin/env yarn --silent ts-node --transpile-only

import { v4 as uuid } from 'uuid';

import { Filter as PathsFilter } from './paths-filter/filter';
import type { FilterResults } from './paths-filter/filter';
import * as git from './paths-filter/git';

const spawnAsync = require('@expo/spawn-async');
const picomatch = require('picomatch');

/**
 *
 * Check for any changes or additions from a specific github branch or commit,
 * that match a set of paths/globs.
 *
 */

(async function () {
  const args = process.argv.slice(2);
  console.log(`args: ${JSON.stringify(args, null, 2)}`);

  const branch = 'sdk-52';
  const pathsToCheck = ['packages/expo-updates/**'];
  const currentBranchName = uuid();
  const fetchHeadBranchName = uuid();
  await prepareGit(branch, currentBranchName, fetchHeadBranchName);
  const changedFiles = await git.getChanges(fetchHeadBranchName, currentBranchName);
  const filter = new Filter();
  filter.loadFromEntries(pathsToCheck);
  const results = filter.match(changedFiles);
  console.log(`results: ${JSON.stringify(results, null, 2)}`);
  const didChange = await didAnyFilesChange(results);
  console.log(`didChange: ${didChange}`);
})();

// Minimatch options used in all matchers
const MatchOptions = {
  dot: true,
};

class Filter extends PathsFilter {
  loadFromEntries(entries: string[]) {
    for (const entry of entries) {
      this.rules[entry] = [{ status: undefined, isMatch: picomatch(entry, MatchOptions) }];
    }
  }
}

async function didAnyFilesChange(result: FilterResults) {
  return Object.values(result).some((files) => files.length > 0);
}

async function prepareGit(branch: string, currentBranchName: string, fetchHeadBranchName: string) {
  await spawnAsync('git', ['checkout', '-b', currentBranchName], {
    stdio: 'ignore',
  });
  await spawnAsync('git', ['add', '.'], {
    stdio: 'ignore',
  });
  await spawnAsync('git', ['commit', '--allow-empty', '-m', 'tmp'], {
    stdio: 'ignore',
  });
  await spawnAsync('git', ['fetch', 'origin', branch], {
    stdio: 'ignore',
  });
  await spawnAsync('git', ['checkout', 'FETCH_HEAD'], {
    stdio: 'ignore',
  });
  await spawnAsync('git', ['switch', '-c', fetchHeadBranchName], {
    stdio: 'ignore',
  });
  await spawnAsync('git', ['checkout', currentBranchName], {
    stdio: 'ignore',
  });
}
