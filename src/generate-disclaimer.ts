import type { PnpmDependencyResolvedLicenseText } from './get-license-text'

export const generateDisclaimer = (deps: PnpmDependencyResolvedLicenseText[]) => {
  const beginning = `THE FOLLOWING SETS FORTH ATTRIBUTION NOTICES FOR THIRD PARTY SOFTWARE THAT MAY BE CONTAINED IN PORTIONS OF THIS PRODUCT\n\n`

  const licenseTexts = deps
    .map((dep) => {
      const disclaimer = [
        `The following software may be included in this product: ${dep.name} (${dep.version})`,
        dep.additionalText,
        'This software contains the following license and notice below:',
        ...(dep.noticeText ? ['\nNOTICE\n', dep.noticeText, '\nLICENSE:\n'] : [])
      ]
        .filter(Boolean)
        .join('\n')
      const license = dep.licenseText
      return `${disclaimer}\n\n${license}`
    })
    .join('\n\n---\n\n')

  const trailingNewline = licenseTexts.endsWith('\n') ? '' : '\n'

  return beginning + licenseTexts + trailingNewline
}
