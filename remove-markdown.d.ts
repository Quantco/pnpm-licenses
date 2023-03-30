declare module 'remove-markdown' {
  function removeMarkdown(input: string, options?: {
    /**
     * strip list leaders
     * 
     * @default true
     */
    stripListLeaders: boolean
    /**
     * char to insert instead of stripped list leaders
     * @default ''
     */
    listUnicodeChar: string
    /**
     * support GitHub-Flavored Markdown
     * @default true
     */
    gfm: boolean
    /**
     * replace images with alt-text, if present
     * @default true
     */
    useImgAltText: boolean
  }): string

  export = removeMarkdown
}
