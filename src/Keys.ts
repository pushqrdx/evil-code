export const raws = new Array<string>().concat(
  'backspace delete space escape left right up down'.split(' '),
  'cruwfbey['.split('').map((key) => `ctrl+${key}`),
)
