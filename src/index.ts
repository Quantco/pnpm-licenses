import fs from 'fs/promises'
import { getDependencies } from './get-dependencies'
import type { PnpmDependency } from './get-dependencies'
import { getLicenseText } from './get-license-text'
import type { PnpmDependencyResolvedLicenseText } from './get-license-text'

export type ListOptions = {
  prod: boolean
  resolveLicenses: boolean
  cycloneDX: boolean
}

export type GenerateDisclaimerOptions = {
  prod: boolean
}

export type IOOptions = 
  ({ stdin: false; inputFile: undefined } | { stdin: true; inputFile: undefined } | { stdin: false; inputFile: string }) &
  ({ stdout: true; outputFile: undefined } | { stdout: false; outputFile: string })

const output = (value: string, options: IOOptions) => {
  if (options.stdout) {
    return Promise.resolve(console.log(value))
  } else {
    return fs.writeFile(options.outputFile, value)
  }
}

const resolveLicensesBestEffort = async (deps: PnpmDependency[]): Promise<{ successful: PnpmDependencyResolvedLicenseText[], failed: PnpmDependency[] }> => {
  const depsWithLicensesPromise = deps.map(async (dep) => ({ ...dep, ...(await getLicenseText(dep)) }))

  const successful: PnpmDependencyResolvedLicenseText[] = []
  const failed: PnpmDependency[] = []

  await Promise.all(depsWithLicensesPromise.map((depPromise) => depPromise
    .then((dep) => successful.push(dep))
    .catch((error) => failed.push(error))
  ))

  return {
    successful,
    failed,
  }
}

export const listCommand = async (options: ListOptions, ioOptions: IOOptions) => {
  const deps = getDependencies(options, ioOptions)
    .then(Object.values)
    .then((deps: PnpmDependency[]) => deps.flat())


  if (!options.resolveLicenses && !options.cycloneDX) {
    deps
      .then((deps) => output(JSON.stringify(deps, null, 2), ioOptions))
      .then(() => process.exit(0))
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

  const beginning = `THE FOLLOWING SETS FORTH ATTRIBUTION NOTICES FOR THIRD PARTY SOFTWARE THAT MAY BE CONTAINED IN PORTIONS OF THIS PRODUCT\n\n`

  const licenseTexts = successful
    .map((dep) => {
      const disclaimer = `The following software may be included in this product: ${dep.name} (${dep.version})\n${dep.additionalText ? dep.additionalText + '\n' : ''}This software contains the following license and notice below:`
      const license = dep.licenseText
      return `${disclaimer}\n\n${license}`
    })
    .join('\n\n---\n\n')

  await output(beginning + licenseTexts, ioOptions)
  process.exit(0)
}
