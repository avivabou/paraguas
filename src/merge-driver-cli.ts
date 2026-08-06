#!/usr/bin/env node
import { runMergeDriverCli } from './merge-driver';

process.exitCode = runMergeDriverCli(process.argv.slice(2));
