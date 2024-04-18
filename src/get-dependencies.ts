import fs from 'fs/promises'
import { exec } from 'child_process'
import z from 'zod'

const pnpmDependencyGroupedSchema = z.object({
  name: z.string(),
  versions: z.array(z.string()),
  paths: z.array(z.string()),
  license: z.string(),
  author: z.string().optional(),
  homepage: z.string().optional(),
  description: z.string().optional()
})

const pnpmDependencyFlattenedSchema = z.object({
  name: z.string(),
  version: z.string(),
  path: z.string(),
  license: z.string(),
  author: z.string().optional(),
  homepage: z.string().optional(),
  description: z.string().optional()
})

const pnpmDependencySchema = z.union([pnpmDependencyGroupedSchema, pnpmDependencyFlattenedSchema])

const pnpmInputSchema = z.record(z.string(), z.array(pnpmDependencySchema))

export type PnpmDependency = z.infer<typeof pnpmDependencySchema>
export type PnpmJson = z.infer<typeof pnpmInputSchema>

export type PnpmDependencyFlattened = z.infer<typeof pnpmDependencyFlattenedSchema>

export const flattenDependencies = (deps: PnpmDependency[]): PnpmDependencyFlattened[] =>
  deps.flatMap(({ name, license, author, homepage, description, ...rest }) => {
    if ('version' in rest) {
      return [{ name, license, author, homepage, description, ...rest }]
    } else {
      const { versions, paths } = rest
      return versions.map((version, i) => ({
        name,
        version,
        path: paths[i],
        license,
        author,
        homepage,
        description
      }))
    }
  })

async function read(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

export type IOOptions = (
  | { stdin: false; inputFile: undefined }
  | { stdin: true; inputFile: undefined }
  | { stdin: false; inputFile: string }
) &
  ({ stdout: true; outputFile: undefined } | { stdout: false; outputFile: string })

export const getDependencies = (
  options: { prod: boolean; filterPackages?: string[] },
  ioOptions: IOOptions
): Promise<PnpmDependencyFlattened[]> => {
  let inputPromise: Promise<string> | undefined

  if (ioOptions.stdin) {
    inputPromise = read(process.stdin)
  } else if (ioOptions.inputFile !== undefined) {
    inputPromise = fs.readFile(ioOptions.inputFile, 'utf8')
  } else {
    inputPromise = new Promise((resolve, reject) => {
      const command =
        options.filterPackages && options.filterPackages.length > 0
          ? `pnpm ${options.filterPackages.map((o) => `--filter '${o}'`).join(' ')} licenses list ${
              options.prod ? '--prod' : ''
            } --json`
          : `pnpm licenses list ${options.prod ? '--prod' : ''} --json`
      exec(command, (error, stdout, stderr) => {
        if (error) return reject(new Error(stderr))
        resolve(stdout)
      })
    })
  }

  // TODO: proper error handling pls
  return inputPromise
    .then(JSON.parse)
    .then(pnpmInputSchema.parse)
    .then(Object.values)
    .then((deps: PnpmDependency[][]) => deps.flat())
    .then(flattenDependencies)
}
