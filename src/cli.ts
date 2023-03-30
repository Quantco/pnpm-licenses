#!/usr/bin/env node
import minimist from 'minimist'
import { listCommand, generateDisclaimerCommand } from './index'
import c from 'ansi-colors'

const version = '1.0.0'
const usage = `
${c.bold('usage')}: ${c.yellow('pnpm-licenses')} ${c.white('[command]')} ${c.white('[options]')}

${c.bold(c.white('commands'))}:
  ${c.bold(c.white('list'))} [options]                 ${c.white('List all dependencies and their licenses')}

    ${c.white('--prod')}, ${c.white('-p')}                   Only consider production dependencies
    ${c.white('--resolve-licenses')}           Resolve actual license files and texts for dependencies
                                 (as compared to just the license identifier)
    ${c.white('--cyclonedx')}                  Output cycloneDX compliant json
    ${c.white('--json-input')}                 Read input from stdin as json, instead of calling pnpm ourselves
    ${c.white('--json-input-file')}, ${c.white('-i')}        Read input from a (json) file, instead of calling pnpm ourselves or reading from stdin
    ${c.white('--output-file')}, ${c.white('-o')}            Output to a file instead of stdout

    ${c.white('--help')}                       Get help for the list command


  ${c.bold(c.white('generate-disclaimer'))} [options]  ${c.white('Generate a disclaimer for all dependencies')}

    ${c.white('--prod')}, ${c.white('-p')}                   Only consider production dependencies
    ${c.white('--json-input')}                 Read input from stdin as json, instead of calling pnpm ourselves
    ${c.white('--json-input-file')}, ${c.white('-i')}        Read input from a (json) file, instead of calling pnpm ourselves or reading from stdin
    ${c.white('--output-file')}, ${c.white('-o')}            Output to a file instead of stdout

    ${c.white('--help')}                       Get help for the generate-disclaimer command

  ${c.bold(c.white('version'))}                        ${c.white('Print the version number')} (also available as ${c.white('--version')})
  ${c.bold(c.white('help'))}                           ${c.white('Print this help message')} (also available as ${c.white('--help')})
`.trim()

const usage_list_command = `
${c.bold('usage')}: ${c.yellow('pnpm-licenses list')} ${c.white('[options]')}

                               List all dependencies and their licenses

${c.bold(c.white('options'))}:
  ${c.white('--prod')}, ${c.white('-p')}                   Only consider production dependencies
  ${c.white('--resolve-licenses')}           Resolve actual license files and texts for dependencies
                               (as compared to just the license identifier)
  ${c.white('--cyclonedx')}                  Output cycloneDX compliant json

  ${c.white('--json-input')}                 Read input from stdin as json, instead of calling pnpm ourselves
  ${c.white('--json-input-file')}, ${c.white('-i')}        Read input from a (json) file, instead of calling pnpm ourselves or reading from stdin
  ${c.white('--output-file')}, ${c.white('-o')}            Output to a file instead of stdout

  ${c.white('--help')}                       Get help for the list command
`.trim()

const usage_generate_disclaimer_command = `
${c.bold('usage')}: ${c.yellow('pnpm-licenses generate-disclaimer')} ${c.white('[options]')}
  
                               Generate a disclaimer for all dependencies

${c.bold(c.white('options'))}:
  ${c.white('--prod')}, ${c.white('-p')}                   Only consider production dependencies

  ${c.white('--json-input')}                 Read input from stdin as json, instead of calling pnpm ourselves
  ${c.white('--json-input-file')}, ${c.white('-i')}        Read input from a (json) file, instead of calling pnpm ourselves or reading from stdin
  ${c.white('--output-file')}, ${c.white('-o')}            Output to a file instead of stdout

  ${c.white('--help')}                       Get help for the generate-disclaimer command
`.trim()

const argv = minimist(process.argv.slice(2), {
  boolean: ['json-input', 'prod', 'resolve-licenses', 'cyclonedx', 'version', 'help'],
  alias: {
    'json-input-file': ['i'],
    'output-file': ['o']
  }
})

const knownFlags = ['json-input', 'json-input-file', 'i', 'output-file', 'o', 'prod', 'resolve-licenses', 'cyclonedx', 'version', 'help']
const usedFlags = Object.entries(argv)
  .filter(([, value]: [string, boolean | string]) => value === true)
  .map(([key]) => key)

if (argv.version || usedFlags.length === 0 && argv._.length === 1 && argv._[0] === 'version') {
  const unknownFlags = usedFlags.filter(flag => !knownFlags.includes(flag))

  if (unknownFlags.length > 0) {
    console.log('Unknown flags supplied to version commmand:', unknownFlags.join(', '))
    process.exit(1)
  }

  // all other flags are invalid with the version command
  if (usedFlags.length > 1) {
    console.log('Invalid flags supplied to version commmand:', usedFlags.join(', '))
    process.exit(1)
  }

  console.log(version)
  process.exit(0)
}

if (argv.help && argv._.length === 0 || usedFlags.length === 0 && argv._.length === 1 && argv._[0] === 'help' || usedFlags.length === 0 && argv._.length === 0) {
  const unknownFlags = usedFlags.filter(flag => !knownFlags.includes(flag))

  if (unknownFlags.length > 0) {
    console.log('Unknown flags supplied to help commmand: ', unknownFlags.join(', '))
    process.exit(1)
  }

  // all other flags are invalid with the help command
  if (usedFlags.length > 1) {
    console.log('Invalid flags supplied to help commmand: ', usedFlags.join(', '))
    process.exit(1)
  }
  
  console.log(usage)
  process.exit(0)
}

if (argv._.length === 1 && argv._[0] === 'list') {
  const forbiddenFlags = ['version', 'help']
  const unknownFlags = usedFlags.filter(flag => !knownFlags.includes(flag))
  const invalidFlags = usedFlags.filter(flag => forbiddenFlags.includes(flag))

  if (unknownFlags.length > 0) {
    console.log('Unknown flags supplied to list commmand:', unknownFlags.join(', '))
    process.exit(1)
  }

  if (argv.help) {
    // TODO: could highlight the options that are currently being supplied
    console.log(usage_list_command)
    process.exit(0)
  }

  if (invalidFlags.length > 0) {
    console.log('Invalid flags supplied to list command:', invalidFlags.join(', '))
    process.exit(1)
  }

  // TODO: validate io options
  const ioOptions = {
    stdin: argv['json-input'],
    inputFile: argv['json-input-file'],
    stdout: argv['output-file'] === undefined,
    outputFile: argv['output-file'],
  }

  if (typeof argv.prod !== 'boolean') {
    console.log('Invalid value for prod flag:', argv.prod)
    process.exit(1)
  }

  if (typeof argv['resolve-licenses'] !== 'boolean') {
    console.log('Invalid value for resolve-licenses flag:', argv['resolve-licenses'])
    process.exit(1)
  }

  if (typeof argv['cyclonedx'] !== 'boolean') {
    console.log('Invalid value for cyclonedx flag:', argv['cyclonedx'])
    process.exit(1)
  }

  listCommand({
    prod: argv.prod,
    resolveLicenses: argv['resolve-licenses'],
    cycloneDX: argv.cyclonedx,
  }, ioOptions)
}

if (argv._.length === 1 && argv._[0] === 'generate-disclaimer') {
  const forbiddenFlags = ['resolve-licenses', 'cyclonedx', 'version', 'help']
  const unknownFlags = usedFlags.filter(flag => !knownFlags.includes(flag))
  const invalidFlags = usedFlags.filter(flag => forbiddenFlags.includes(flag))

  if (unknownFlags.length > 0) {
    console.log('Unknown flags supplied to version commmand:', unknownFlags.join(', '))
    process.exit(1)
  }

  if (argv.help) {
    // TODO: could highlight the options that are currently being supplied
    console.log(usage_generate_disclaimer_command)
    process.exit(0)
  }


  if (invalidFlags.length > 0) {
    console.log('Invalid flags supplied to generate-disclaimer command:', invalidFlags.join(', '))
    process.exit(1)
  }

  // TODO: validate io options
  const ioOptions = {
    stdin: argv['json-input'],
    inputFile: argv['json-input-file'],
    stdout: argv['output-file'] === undefined,
    outputFile: argv['output-file'],
  }

  if (typeof argv.prod !== 'boolean') {
    console.log('Invalid value for prod flag:', argv.prod)
    process.exit(1)
  }

  generateDisclaimerCommand({
    prod: argv.prod,
  }, ioOptions)
}
