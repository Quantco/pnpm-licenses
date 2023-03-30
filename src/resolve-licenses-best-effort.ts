import type { PnpmDependency } from './get-dependencies'
import { getLicenseText } from './get-license-text'
import type { PnpmDependencyResolvedLicenseText } from './get-license-text'

export const resolveLicensesBestEffort = async (
  deps: PnpmDependency[]
): Promise<{ successful: PnpmDependencyResolvedLicenseText[]; failed: PnpmDependency[] }> => {
  const depsWithLicensesPromise = deps.map(async (dep) => ({ ...dep, ...(await getLicenseText(dep)) }))

  const successful: PnpmDependencyResolvedLicenseText[] = []
  const failed: PnpmDependency[] = []

  await Promise.all(
    depsWithLicensesPromise.map((depPromise) =>
      depPromise.then((dep) => successful.push(dep)).catch((error) => failed.push(error))
    )
  )

  return {
    successful,
    failed
  }
}
