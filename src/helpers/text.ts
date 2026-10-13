export const bold = (str: string | number) => `\x1b[1m${String(str)}\x1b[0m`
export const primary = (str: string | number) => `\x1b[95m${String(str)}\x1b[0m`

export const COLORS = {
	gray: (s: string) => `\x1b[90m${s}\x1b[37m`,
	green: (s: string) => `\x1b[92m${s}\x1b[37m`,
	red: (s: string) => `\x1b[31m${s}\x1b[37m`,
	orange: (s: string) => `\x1b[38;5;214m${s}\x1b[37m`,
	bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
}
