import { pipe, split, take, join, takeLast } from 'ramda'

export const truncateAddress = pipe(
  split(''),
  (characters: string[]): string[] => [
    pipe(take(4), join(''))(characters),
    pipe(takeLast(4), join(''))(characters),
  ],
  join('...')
)
