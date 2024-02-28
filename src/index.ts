import fs from 'fs/promises'
import multimatch from 'multimatch'
import { getDependencies } from './get-dependencies'
import type { PnpmDependencyFlattened } from './get-dependencies'
import { generateDisclaimer } from './generate-disclaimer'
import { resolveLicensesBestEffort } from './resolve-licenses-best-effort'

export type ListOptions = {
  prod: boolean
  filters: string[]
}

export type GenerateDisclaimerOptions = {
  prod: boolean
  filters: string[]
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
  const deps = getDependencies(options, ioOptions).then((deps: PnpmDependencyFlattened[]) =>
    deps.filter((dep) => multimatch(dep.name, options.filters).length === 0)
  )

  const { successful, failed } = await resolveLicensesBestEffort(await deps)

  await output(JSON.stringify(successful, null, 2), ioOptions)
  process.exit(0)
}

export const generateDisclaimerCommand = async (options: GenerateDisclaimerOptions, ioOptions: IOOptions) => {
  const deps = getDependencies(options, ioOptions).then((deps: PnpmDependencyFlattened[]) =>
    deps.filter((dep) => multimatch(dep.name, options.filters).length === 0)
  )

  const { successful, failed } = await resolveLicensesBestEffort(await deps)

  await output(generateDisclaimer(successful), ioOptions)
  process.exit(0)
}
