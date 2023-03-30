import fs from 'fs/promises'
import { getDependencies } from './get-dependencies'
import type { PnpmDependency } from './get-dependencies'
import { generateDisclaimer } from './generate-disclaimer'
import { resolveLicensesBestEffort } from './resolve-licenses-best-effort'

export type ListOptions = {
  prod: boolean
  resolveLicenses: boolean
  cycloneDX: boolean
}

export type GenerateDisclaimerOptions = {
  prod: boolean
}

export type IOOptions = (
  | { stdin: false; inputFile: undefined }
  | { stdin: true; inputFile: undefined }
  | { stdin: false; inputFile: string }
) &
  ({ stdout: true; outputFile: undefined } | { stdout: false; outputFile: string })

const output = (value: string, options: IOOptions) => {
  if (options.stdout) {
    return Promise.resolve(console.log(value))
  } else {
    return fs.writeFile(options.outputFile, value)
  }
}

export const listCommand = async (options: ListOptions, ioOptions: IOOptions) => {
  const deps = getDependencies(options, ioOptions)
    .then(Object.values)
    .then((deps: PnpmDependency[]) => deps.flat())

  if (!options.resolveLicenses && !options.cycloneDX) {
    deps.then((deps) => output(JSON.stringify(deps, null, 2), ioOptions)).then(() => process.exit(0))
  }

  if (options.cycloneDX) {
    console.log('NOT IMPLEMENTED YET')
    process.exit(1)
  }

  const { successful, failed } = await resolveLicensesBestEffort(await deps)

  await output(JSON.stringify(successful, null, 2), ioOptions)
  process.exit(0)
}

export const generateDisclaimerCommand = async (options: GenerateDisclaimerOptions, ioOptions: IOOptions) => {
  const deps = getDependencies(options, ioOptions)
    .then(Object.values)
    .then((deps: PnpmDependency[]) => deps.flat())

  const { successful, failed } = await resolveLicensesBestEffort(await deps)

  await output(generateDisclaimer(successful), ioOptions)
  process.exit(0)
}
