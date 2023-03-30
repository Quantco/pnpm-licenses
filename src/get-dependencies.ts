import fs from 'fs/promises'
import { exec } from 'child_process'
import z from 'zod'

const pnpmDependencySchema = z.object({
  name: z.string(),
  version: z.string(),
  path: z.string(),
  license: z.string(),
  author: z.string().optional(),
  homepage: z.string().optional(),
  description: z.string().optional()
})

const pnpmInputSchema = z.record(z.string(), z.array(pnpmDependencySchema))

export type PnpmDependency = z.infer<typeof pnpmDependencySchema>
export type PnpmJson = z.infer<typeof pnpmInputSchema>

async function read(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

export type IOOptions =
  ({ stdin: false; inputFile: undefined } | { stdin: true; inputFile: undefined } | { stdin: false; inputFile: string }) &
  ({ stdout: true; outputFile: undefined } | { stdout: false; outputFile: string })

export const getDependencies = (options: { prod: boolean }, ioOptions: IOOptions): Promise<PnpmJson> => {
  let inputPromise: Promise<string> | undefined

  if (ioOptions.stdin) {
    inputPromise = read(process.stdin)
  } else if (ioOptions.inputFile !== undefined) {
    inputPromise = fs.readFile(ioOptions.inputFile, 'utf8')
  } else {
    inputPromise = new Promise((resolve, reject) => {
      exec(`pnpm licenses list ${options.prod ? '--prod' : ''} --json`, (error, stdout, stderr) => {
        if (error) return reject(new Error(stderr))
        resolve(stdout)
      })
    })
  }

  // TODO: proper error handling pls
  return inputPromise.then(JSON.parse).then(pnpmInputSchema.parse)
}
