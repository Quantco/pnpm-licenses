type AnsiValue = {
  name: string
  codes: [begin: number, end: number]
  type: 'modifier' | 'color' | 'bg' | 'bright' | 'bgBright'
}

const modifiers = [
  { name: 'reset', codes: [0, 0], type: 'modifier' },
  { name: 'bold', codes: [1, 22], type: 'modifier' },
  { name: 'dim', codes: [2, 22], type: 'modifier' },
  { name: 'italic', codes: [3, 23], type: 'modifier' },
  { name: 'underline', codes: [4, 24], type: 'modifier' },
  { name: 'inverse', codes: [7, 27], type: 'modifier' },
  { name: 'hidden', codes: [8, 28], type: 'modifier' },
  { name: 'strikethrough', codes: [9, 29], type: 'modifier' }
] satisfies AnsiValue[]

const text = [
  { name: 'black', codes: [30, 39], type: 'color' },
  { name: 'red', codes: [31, 39], type: 'color' },
  { name: 'green', codes: [32, 39], type: 'color' },
  { name: 'yellow', codes: [33, 39], type: 'color' },
  { name: 'blue', codes: [34, 39], type: 'color' },
  { name: 'magenta', codes: [35, 39], type: 'color' },
  { name: 'cyan', codes: [36, 39], type: 'color' },
  { name: 'white', codes: [37, 39], type: 'color' },
  { name: 'gray', codes: [90, 39], type: 'color' },
  { name: 'grey', codes: [90, 39], type: 'color' }
] satisfies AnsiValue[]

const background = [
  { name: 'bgBlack', codes: [40, 49], type: 'bg' },
  { name: 'bgRed', codes: [41, 49], type: 'bg' },
  { name: 'bgGreen', codes: [42, 49], type: 'bg' },
  { name: 'bgYellow', codes: [43, 49], type: 'bg' },
  { name: 'bgBlue', codes: [44, 49], type: 'bg' },
  { name: 'bgMagenta', codes: [45, 49], type: 'bg' },
  { name: 'bgCyan', codes: [46, 49], type: 'bg' },
  { name: 'bgWhite', codes: [47, 49], type: 'bg' }
] satisfies AnsiValue[]

const brightText = [
  { name: 'blackBright', codes: [90, 39], type: 'bright' },
  { name: 'redBright', codes: [91, 39], type: 'bright' },
  { name: 'greenBright', codes: [92, 39], type: 'bright' },
  { name: 'yellowBright', codes: [93, 39], type: 'bright' },
  { name: 'blueBright', codes: [94, 39], type: 'bright' },
  { name: 'magentaBright', codes: [95, 39], type: 'bright' },
  { name: 'cyanBright', codes: [96, 39], type: 'bright' },
  { name: 'whiteBright', codes: [97, 39], type: 'bright' }
] satisfies AnsiValue[]

const brightBackground = [
  { name: 'bgBlackBright', codes: [100, 49], type: 'bgBright' },
  { name: 'bgRedBright', codes: [101, 49], type: 'bgBright' },
  { name: 'bgGreenBright', codes: [102, 49], type: 'bgBright' },
  { name: 'bgYellowBright', codes: [103, 49], type: 'bgBright' },
  { name: 'bgBlueBright', codes: [104, 49], type: 'bgBright' },
  { name: 'bgMagentaBright', codes: [105, 49], type: 'bgBright' },
  { name: 'bgCyanBright', codes: [106, 49], type: 'bgBright' },
  { name: 'bgWhiteBright', codes: [107, 49], type: 'bgBright' }
] satisfies AnsiValue[]

const all = [...modifiers, ...text, ...background, ...brightText, ...brightBackground] satisfies AnsiValue[]

const apply = (code: number) => `\u001b[${code}m`

const style = (color: AnsiValue) => (input?: string) => {
  const [begin, end] = color.codes

  if (input === undefined) {
    return apply(begin)
  }

  return `${apply(begin)}${input}${apply(end)}`
}

const colors = Object.fromEntries(all.map((value) => [value.name, style(value)]))

export { colors, colors as c }
