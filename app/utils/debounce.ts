export interface Debounced<A extends unknown[]> {
  (...args: A): void
  flush(): void
  cancel(): void
}

export const debounce = <A extends unknown[]>(fn: (...args: A) => void, ms: number): Debounced<A> => {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: A | null = null

  const run = () => {
    timer = null
    if (!pending) return
    const args = pending
    pending = null
    fn(...args)
  }

  const cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
    pending = null
  }

  const flush = () => {
    if (timer) clearTimeout(timer)
    run()
  }

  return Object.assign((...args: A) => {
    pending = args
    if (timer) clearTimeout(timer)
    timer = setTimeout(run, ms)
  }, { cancel, flush })
}
