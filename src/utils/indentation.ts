export const dedent = (input: string) => {
  // leading whitespace on lines with text (i.e. ignoring whitespace-only lines)
  // note that this treats any kind of whitespace as being the same, i.e. 1 tab is the same as 1 space.
  // for this to make sense the assumption is made that a file is using either tabs or spaces for indentation
  const leading = input.match(/^[ \t]*(?=\S)/gm) ?? []
  const indentation = leading.map((x) => x.length)

  // find the smallest indentation size
  const minIndent = Math.min(...indentation)

  // if not indented or if all lines are whitespace-only, return the input as-is
  if (minIndent === 0 || minIndent === Infinity) {
    return input
  }

  const regex = new RegExp(`^[ \\t]{${minIndent}}`, 'gm')
  return input.replace(regex, '')
}

export const strip = (input: string) =>
  input
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim()
