#!/usr/bin/env node
import minimist from 'minimist'
import c from 'ansi-colors'
import { z } from 'zod'
import { version } from '../package.json'
import { listCommand, generateDisclaimerCommand } from './index'

const filtersSchema = z.array(z.string())

/* eslint-disable prettier/prettier */
const usage = `
${c.bold('usage')}: ${c.yellow('pnpm-licenses')} ${c.white('[command]')} ${c.white('[options]')}

${c.bold(c.white('commands'))}:
  ${c.bold(c.white('list'))} [options]                 ${c.white('List all dependencies and their licenses')}

    ${c.white('--prod')}, ${c.white('-p')}                   Only consider production dependencies
    ${c.white('--json-input')}                 Read input from stdin as json, instead of calling pnpm ourselves
    ${c.white('--json-input-file')}, ${c.white('-i')}        Read input from a (json) file, instead of calling pnpm ourselves or reading from stdin
    ${c.white('--output-file')}, ${c.white('-o')}            Output to a file instead of stdout
    ${c.white('--filter')}, ${c.white('-f')}                 Filter out dependencies via glob patterns.
                                 Example: --filter='["@quantco/*", "@pnpm/*"]'
                                          --filter='["**", "!@quantco/*", "!@pnpm/*"]' (inverted match)

    ${c.white('--help')}                       Get help for the list command


  ${c.bold(c.white('generate-disclaimer'))} [options]  ${c.white('Generate a disclaimer for all dependencies')}

    ${c.white('--prod')}, ${c.white('-p')}                   Only consider production dependencies
    ${c.white('--json-input')}                 Read input from stdin as json, instead of calling pnpm ourselves
    ${c.white('--json-input-file')}, ${c.white('-i')}        Read input from a (json) file, instead of calling pnpm ourselves or reading from stdin
    ${c.white('--output-file')}, ${c.white('-o')}            Output to a file instead of stdout
    ${c.white('--filter')}, ${c.white('-f')}                 Filter out dependencies via glob patterns.
                                 Example: --filter='["@quantco/*", "@pnpm/*"]'
                                          --filter='["**", "!@quantco/*", "!@pnpm/*"]' (inverted match)

    ${c.white('--help')}                       Get help for the generate-disclaimer command

  ${c.bold(c.white('version'))}                        ${c.white('Print the version number')} (also available as ${c.white('--version')})
  ${c.bold(c.white('help'))}                           ${c.white('Print this help message')} (also available as ${c.white('--help')})
`.trim()

const usageListCommand = `
${c.bold('usage')}: ${c.yellow('pnpm-licenses list')} ${c.white('[options]')}

                               List all dependencies and their licenses

${c.bold(c.white('options'))}:
  ${c.white('--prod')}, ${c.white('-p')}                   Only consider production dependencies

  ${c.white('--json-input')}                 Read input from stdin as json, instead of calling pnpm ourselves
  ${c.white('--json-input-file')}, ${c.white('-i')}        Read input from a (json) file, instead of calling pnpm ourselves or reading from stdin
  ${c.white('--output-file')}, ${c.white('-o')}            Output to a file instead of stdout
  ${c.white('--filter')}, ${c.white('-f')}                 Filter out dependencies via glob patterns.
                               Example: --filter='["@quantco/*", "@pnpm/*"]'
                                        --filter='["**", "!@quantco/*", "!@pnpm/*"]' (inverted match)

  ${c.white('--help')}                       Get help for the list command
`.trim()

const usageGenerateDisclaimerCommand = `
${c.bold('usage')}: ${c.yellow('pnpm-licenses generate-disclaimer')} ${c.white('[options]')}
  
                               Generate a disclaimer for all dependencies

${c.bold(c.white('options'))}:
  ${c.white('--prod')}, ${c.white('-p')}                   Only consider production dependencies

  ${c.white('--json-input')}                 Read input from stdin as json, instead of calling pnpm ourselves
  ${c.white('--json-input-file')}, ${c.white('-i')}        Read input from a (json) file, instead of calling pnpm ourselves or reading from stdin
  ${c.white('--output-file')}, ${c.white('-o')}            Output to a file instead of stdout
  ${c.white('--filter')}, ${c.white('-f')}                 Filter out dependencies via glob patterns.
                               Example: --filter='["@quantco/*", "@pnpm/*"]'
                                        --filter='["**", "!@quantco/*", "!@pnpm/*"]' (inverted match)

  ${c.white('--help')}                       Get help for the generate-disclaimer command
`.trim()
/* eslint-enable prettier/prettier */

const parseFilters = (
  filtersAsJsonString: string
): { success: false; error: string } | z.SafeParseSuccess<string[]> => {
  let jsonFilter
  try {
    jsonFilter = JSON.parse(filtersAsJsonString)
  } catch (e) {
    return {
      success: false,
      error: `Invalid value for filter flag, expected an array of strings encoded as JSON but received:\n${filtersAsJsonString}`
    }
  }

  const maybeFilters = filtersSchema.safeParse(jsonFilter)
  if (!maybeFilters.success) {
    const formattedZodError = JSON.stringify(maybeFilters.error.format(), null, 2)
    return {
      success: false,
      error: `Invalid value for filter flag, expected an array of strings encoded as JSON. Received valid JSON but got a schema error:\n${formattedZodError}`
    }
  }

  return maybeFilters
}

const argv = minimist(process.argv.slice(2), {
  boolean: ['json-input', 'prod', 'version', 'help'],
  alias: {
    'json-input-file': ['i'],
    'output-file': ['o'],
    filter: ['f']
  }
})

const knownFlags = ['json-input', 'json-input-file', 'i', 'output-file', 'o', 'filter', 'f', 'prod', 'version', 'help']

const usedFlags = Object.entries(argv)
  .filter(([, value]: [string, boolean | string]) => value === true)
  .map(([key]) => key)

if (argv.version || (usedFlags.length === 0 && argv._.length === 1 && argv._[0] === 'version')) {
  const unknownFlags = usedFlags.filter((flag) => !knownFlags.includes(flag))

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

if (
  (argv.help && argv._.length === 0) ||
  (usedFlags.length === 0 && argv._.length === 1 && argv._[0] === 'help') ||
  (usedFlags.length === 0 && argv._.length === 0)
) {
  const unknownFlags = usedFlags.filter((flag) => !knownFlags.includes(flag))

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
  const unknownFlags = usedFlags.filter((flag) => !knownFlags.includes(flag))
  const invalidFlags = usedFlags.filter((flag) => forbiddenFlags.includes(flag))

  if (unknownFlags.length > 0) {
    console.log('Unknown flags supplied to list commmand:', unknownFlags.join(', '))
    process.exit(1)
  }

  if (argv.help) {
    // TODO: could highlight the options that are currently being supplied
    console.log(usageListCommand)
    process.exit(0)
  }

  if (invalidFlags.length > 0) {
    console.log('Invalid flags supplied to list command:', invalidFlags.join(', '))
    process.exit(1)
  }

  let filters: string[] = []

  if (argv.filter) {
    const maybeFilters = parseFilters(argv.filter)
    if (!maybeFilters.success) {
      console.log(maybeFilters.error)
      process.exit(1)
    }

    filters = maybeFilters.data
  }

  // TODO: validate io options
  const ioOptions = {
    stdin: argv['json-input'],
    inputFile: argv['json-input-file'],
    stdout: argv['output-file'] === undefined,
    outputFile: argv['output-file']
  }

  if (typeof argv.prod !== 'boolean') {
    console.log('Invalid value for prod flag:', argv.prod)
    process.exit(1)
  }

  listCommand({ prod: argv.prod, filters }, ioOptions).catch((error) => {
    console.log(error)
    process.exit(1)
  })
}

if (argv._.length === 1 && argv._[0] === 'generate-disclaimer') {
  const forbiddenFlags = ['version', 'help']
  const unknownFlags = usedFlags.filter((flag) => !knownFlags.includes(flag))
  const invalidFlags = usedFlags.filter((flag) => forbiddenFlags.includes(flag))

  if (unknownFlags.length > 0) {
    console.log('Unknown flags supplied to version commmand:', unknownFlags.join(', '))
    process.exit(1)
  }

  if (argv.help) {
    // TODO: could highlight the options that are currently being supplied
    console.log(usageGenerateDisclaimerCommand)
    process.exit(0)
  }

  if (invalidFlags.length > 0) {
    console.log('Invalid flags supplied to generate-disclaimer command:', invalidFlags.join(', '))
    process.exit(1)
  }

  let filters: string[] = []

  if (argv.filter) {
    const maybeFilters = parseFilters(argv.filter)
    if (!maybeFilters.success) {
      console.log(maybeFilters.error)
      process.exit(1)
    }

    filters = maybeFilters.data
  }

  // TODO: validate io options
  const ioOptions = {
    stdin: argv['json-input'],
    inputFile: argv['json-input-file'],
    stdout: argv['output-file'] === undefined,
    outputFile: argv['output-file']
  }

  if (typeof argv.prod !== 'boolean') {
    console.log('Invalid value for prod flag:', argv.prod)
    process.exit(1)
  }

  generateDisclaimerCommand({ prod: argv.prod, filters }, ioOptions).catch((error) => {
    console.log(error)
    process.exit(1)
  })
}
