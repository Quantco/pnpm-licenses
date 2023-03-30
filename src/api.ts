import { generateDisclaimer } from './generate-disclaimer'
import { getDependencies } from './get-dependencies'
import { getLicenseText } from './get-license-text'
import { resolveLicensesBestEffort } from './resolve-licenses-best-effort'
import type { PnpmDependency } from './get-dependencies'
import type { PnpmDependencyResolvedLicenseText } from './get-license-text'

export type { PnpmDependency, PnpmDependencyResolvedLicenseText }

export { generateDisclaimer, getDependencies, getLicenseText, resolveLicensesBestEffort }
