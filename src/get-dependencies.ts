import fs from 'fs/promises'
import { exec } from 'child_process'
import z from 'zod'

const pnpmDependencyBaseSchema = z.object({
  name: z.string(),
  license: z.string(),
  author: z.string().optional(),
  homepage: z.string().optional(),
  description: z.string().optional()
})

const pnpmDependencyGroupedSchema = pnpmDependencyBaseSchema.extend({
  versions: z.array(z.string(), { required_error: 'versions: string[] is required (pnpm>=9.0.0)' }),
  paths: z.array(z.string(), { required_error: 'paths: string[] is required (pnpm>=9.0.0)' })
})

const pnpmDependencyFlattenedSchema = pnpmDependencyBaseSchema.extend({
  version: z.string({ required_error: 'version: string is required (pnpm<9.0.0)' }),
  path: z.string({ required_error: 'path: string is required (pnpm<9.0.0)' })
})

const pnpmDependencySchema = z.union([pnpmDependencyGroupedSchema, pnpmDependencyFlattenedSchema])

const pnpmInputSchema = z.record(z.string(), z.array(pnpmDependencySchema))

const pnpmError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string()
  })
})

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

const parse =
  <T>(schema: z.ZodType<T>) =>
  (value: unknown): T => {
    const result = schema.safeParse(value)

    if (result.success) return result.data

    const stringifiedInput = JSON.stringify(value, null, 2)
    const stringifiedError = JSON.stringify(result.error.format(), null, 2)
    throw new Error(
      `Failed to parse input, received the following:\n${stringifiedInput}\n\nThe type error was:\n${stringifiedError}`
    )
  }

// special treatment for pnpm errors in the input
// the errors are of the form { error: { code: string, message: string } } and would result in a zod error, but treating
// them specially is more helpful, as otherwise the error is harder to reason about with the zod validation mixed in
const checkForPnpmError = (value: unknown) => {
  const result = pnpmError.safeParse(value)

  if (!result.success) return value

  const { code, message, ...rest } = result.data.error

  // there shouldn't be anything else contained in the error object, but just to be sure that no information is lost we
  // include any other properties in the error message as json if present
  const stringifiedRest = Object.keys(rest).length > 0 ? ` (${JSON.stringify(rest, null, 2)})` : ''
  throw new Error(`${code} - ${message}${stringifiedRest}`)
}

export type IOOptions = (
  | { stdin: false; inputFile: undefined }
  | { stdin: true; inputFile: undefined }
  | { stdin: false; inputFile: string }
) &
  ({ stdout: true; outputFile: undefined } | { stdout: false; outputFile: string })

export const getDependencies = (
  options: { prod: boolean },
  ioOptions: IOOptions
): Promise<PnpmDependencyFlattened[]> => {
  let inputPromise: Promise<string> | undefined

  if (ioOptions.stdin) {
    inputPromise = read(process.stdin)
  } else if (ioOptions.inputFile !== undefined) {
    inputPromise = fs.readFile(ioOptions.inputFile, 'utf8')
  } else {
    inputPromise = new Promise((resolve, reject) => {
      exec(`pnpm licenses list ${options.prod ? '--prod' : ''} --json`, (error, stdout, stderr) => {
        if (error) return reject(new Error(`${error.message}\nstdout: ${stdout}\nstderr: ${stderr}`))
        resolve(stdout)
      })
    })
  }

  return inputPromise
    .then(JSON.parse)
    .then(checkForPnpmError)
    .then(parse(pnpmInputSchema))
    .then(Object.values)
    .then((deps: PnpmDependency[][]) => deps.flat())
    .then(flattenDependencies)
}
