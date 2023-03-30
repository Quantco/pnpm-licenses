import fs from 'fs/promises'
import path from 'path'
import licenseTexts from 'spdx-license-list/full.js'
import stripIndent from 'strip-indent'
import removeMarkdown from 'remove-markdown'
import type { PnpmDependency } from './get-dependencies'

const LICENSE_BASENAMES = [
  /^LICENSE$/i,           // e.g. LICENSE
  /^LICENSE\.\w+$/i,      // e.g. LICENSE.md
  /^LICENSE\-\w+$/i,      // e.g. LICENSE-MIT
  /^LICENSE\-\w+.\w+$/i,  // e.g. LICENSE-MIT.md
  /^UNLICENSE$/i,         // e.g. UNLICENSE

  // common typo variants
  /^LICENCE$/i,           // e.g. LICENCE
  /^LICENCE\-\w+$/i,      // e.g. LICENCE-MIT
  /^LICENCE\-\w+.\w+$/i,  // e.g. LICENCE-MIT.md
  /^LICENCE\.\w+$/i,      // e.g. LICENCE.md
  /^UNLICENCE$/i,         // e.g. UNLICENCE

  /^COPYING$/i
]

const README_BASENAMES = [
  /^readme$/i, // e.g. readme or README
  /^readme\.\w+$/i, // e.g. readme.md or README.md
]

const LICENSE_TEXT_SUBSTRINGS = {
  mit_license: /ermission is hereby granted, free of charge, to any/,
  bsd_license: /edistribution and use in source and binary forms, with or withou/,
  bsd_source_code_license: /edistribution and use of this software in source and binary forms, with or withou/,
  cc0_1_0: /The\s+person\s+who\s+associated\s+a\s+work\s+with\s+this\s+deed\s+has\s+dedicated\s+the\s+work\s+to\s+the\s+public\s+domain\s+by\s+waiving\s+all\s+of\s+his\s+or\s+her\s+rights\s+to\s+the\s+work\s+worldwide\s+under\s+copyright\s+law,\s+including\s+all\s+related\s+and\s+neighboring\s+rights,\s+to\s+the\s+extent\s+allowed\s+by\s+law.\s+You\s+can\s+copy,\s+modify,\s+distribute\s+and\s+perform\s+the\s+work,\s+even\s+for\s+commercial\s+purposes,\s+all\s+without\s+asking\s+permission./i,
}

export class MissingLicenseError extends Error {
  constructor(public dependency: PnpmDependency) {
    super('No license text found for dependency ' + dependency.name)
  }
}

const resolvedByTypes = ['license-file', 'readme-search', 'fallback-author', 'fallback-homepage'] as const

/**
 * strips markdown formatting, unindents text if needed, trims trailing whitespace
 */
const prettifyLicenseText = (licenseText: string) => {
  return stripIndent(removeMarkdown(licenseText)).trim()
}

export type PnpmDependencyResolvedLicenseText = PnpmDependency & {
  licenseText: string
  additionalText?: string
  resolvedBy: typeof resolvedByTypes[number]
}

export const getLicenseText = async (dependency: PnpmDependency): Promise<{ licenseText: string; additionalText?: string; resolvedBy: typeof resolvedByTypes[number] }> => {
  const files = await fs.readdir(dependency.path)

  const licenseFiles = LICENSE_BASENAMES.map((basename) => files.filter((file) => basename.test(file))).flat()

  // we found a license file, easy
  if (licenseFiles.length > 0) {
    return fs.readFile(path.join(dependency.path, licenseFiles[0]), 'utf8').then((licenseText) => ({ licenseText: stripIndent(licenseText).trim(), resolvedBy: 'license-file' }))
  }

  // no license file found, fallback to other methods
  // 1. search in the readme.md file for a license section
  // 2. auto-generate a license file based on the license type listed in the package.json


  // 1. search in the readme.md file for a license section
  const readmeFiles = README_BASENAMES.map((basename) => files.filter((file) => basename.test(file))).flat()

  if (readmeFiles.length > 0) {
    const readme = await fs.readFile(path.join(dependency.path, readmeFiles[0]), 'utf8')
    const maybeLicenseSection = readme.match(/#{1,6} Licen[cs]e([\s\S]+?)(##|$)/)

    if (maybeLicenseSection) {
      const licenseSection = maybeLicenseSection[1].trim()

      // there are essentially two situations here:
      // 1. licenseSection is the whole license text, **good**
      // 2. licenseSection is only a short text blob that refers to the license in some way, **bad**
      //    examples:
      //     - "This project is licensed under the MIT license." or
      //    - "Released under MIT license" or
      //     - "[MIT](https://some-kind-of-link-to-the-license-file.example.com)" or
      //     - "[MIT][license] © [Jane Doe][author]"
      //     We cannot really deal with this, thus we have to fall back to the next method

      // we check for the first case by comparing the text to a bunch of known license texts, if we find a match, we're good
      const isFullLicenseText = Object.entries(LICENSE_TEXT_SUBSTRINGS).find(([key, regex]) => regex.test(licenseSection))

      if (isFullLicenseText) {
        return { licenseText: prettifyLicenseText(licenseSection), resolvedBy: 'readme-search' }
      }
    }
  }

  // 2. auto-generate a license file based on the license type listed in the package.json
  if (dependency.license in licenseTexts) {
    const licenseText = licenseTexts[dependency.license].licenseText

    const isPublicDomainLikeLicense = ['WTFPL', 'CC0-1.0', 'Unlicense', 'MIT-0'].includes(dependency.license)

    // for public domain like licenses it doesn't make sense to add "Copyright (c) 2023, Jane Doe",
    // we rather want to add additional information about the authors without mentioning copyright
    if (isPublicDomainLikeLicense) {
      if (dependency.author) {
        return {
          licenseText: licenseText,
          additionalText: `This software was created by ${dependency.author}`,
          resolvedBy: 'fallback-author'
        }
      }

      if (dependency.homepage) {
        return {
          licenseText: licenseText,
          resolvedBy: 'fallback-homepage'
        }
      }
    }

    const authors = dependency.author ? dependency.author : dependency.homepage ? `The maintainers of ${dependency.name} <${dependency.homepage}>` : `The maintainers of ${dependency.name}`

    // TODO: some license files contain placeholders like <year>, <owner> or <copyright holders>. We ideally want to replace those with the actual values
    // TODO: for now we only handle the most common cases here
    if (dependency.license === 'MIT') {
      return {
        licenseText: licenseText.replace('<year> <copyright holders>', authors),
        resolvedBy: dependency.author ? 'fallback-author' : 'fallback-homepage'
      }
    } else if (dependency.license === 'BSD-3-Clause' || dependency.license === 'BSD-2-Clause') {
      return {
        licenseText: licenseText.replace('<year> <owner>', authors),
        resolvedBy: dependency.author ? 'fallback-author' : 'fallback-homepage'
      }
    }

    return {
      licenseText: `Copyright (c) ${authors}\n\n${licenseText}`,
      resolvedBy: dependency.author ? 'fallback-author' : 'fallback-homepage'
    }
  }

  return Promise.reject(new MissingLicenseError(dependency))
}
