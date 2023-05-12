import type { PnpmDependency } from './get-dependencies'
import { getLicenseText } from './get-license-text'
import type { PnpmDependencyResolvedLicenseText } from './get-license-text'

export const resolveLicensesBestEffort = async (
  deps: PnpmDependency[]
): Promise<{ successful: PnpmDependencyResolvedLicenseText[]; failed: PnpmDependency[] }> => {
  const depsWithLicensesPromise = deps.map(async (dep) => ({ ...dep, ...(await getLicenseText(dep)) }))

  // keep track of which licenses could be resolved and which couldn't
  // include the index to restore the original order afterwards
  const successful: [number, PnpmDependencyResolvedLicenseText][] = []
  const failed: [number, PnpmDependency][] = []

  await Promise.all(
    depsWithLicensesPromise.map((depPromise, index) =>
      depPromise
        .then((dep) => {
          successful.push([index, dep])
        })
        .catch((error) => {
          failed.push([index, error])
        })
    )
  )

  return {
    successful: successful.sort((a, b) => a[0] - b[0]).map(([, dep]) => dep),
    failed: failed.sort((a, b) => a[0] - b[0]).map(([, dep]) => dep)
  }
}
