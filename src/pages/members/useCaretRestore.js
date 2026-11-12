import { useLayoutEffect, useRef } from 'react'

function applyCaret(pending) {
  if (!pending) return
  const { node, start, end } = pending
  if (!node || document.activeElement !== node || start == null || end == null) return
  try {
    node.setSelectionRange(start, end)
  } catch {
    // Number and some email inputs do not expose a caret.
  }
}

/** Remember the caret, then put it back after a controlled value change. */
export function useCaretRestore() {
  const caret = useRef(null)
  const frame = useRef(0)

  useLayoutEffect(() => {
    applyCaret(caret.current)
  })

  return function rememberCaret(input) {
    if (!input) return
    try {
      caret.current = { node: input, start: input.selectionStart, end: input.selectionEnd }
    } catch {
      caret.current = null
      return
    }
    cancelAnimationFrame(frame.current)
    const pending = caret.current
    frame.current = requestAnimationFrame(() => {
      applyCaret(pending)
      if (caret.current === pending) caret.current = null
    })
  }
}
