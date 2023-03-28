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

export const listCommand = (options: ListOptions, ioOptions: IOOptions) => {
  console.log('LIST OUTPUT TODO', options, ioOptions)
  process.exit(0)
}

export const generateDisclaimerCommand = (options: GenerateDisclaimerOptions, ioOptions: IOOptions) => {
  console.log('GENERATE DISCLAIMER OUTPUT TODO', options, ioOptions)
  process.exit(0)
}
