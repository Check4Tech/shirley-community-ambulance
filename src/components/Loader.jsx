import './loader.css'

/**
 * Route-transition loader: the agency shield flipping over like a card.
 *
 * The flip is a real 3D rotation on the Y axis. The shield is duplicated onto
 * the back face (mirrored) so the reverse side reads correctly instead of
 * showing mirrored text.
 *
 * `label` is announced to screen readers; the animation itself is hidden from
 * assistive tech. Users with prefers-reduced-motion get a static shield with a
 * gentle opacity pulse instead of a spin (see loader.css).
 */
export default function Loader({ label = 'Loading…', fullscreen = true, compact = false }) {
  const classes = ['loader']
  if (compact) classes.push('loader--compact')
  else if (fullscreen) classes.push('loader--fullscreen')

  return (
    <div
      className={classes.join(' ')}
      role="status"
      aria-live="polite"
    >
      <div className="loader__stage">
        <div className="loader__card">
          <img className="loader__face loader__face--front" src="/images/shield.png" alt="" />
          <img className="loader__face loader__face--back" src="/images/shield.png" alt="" />
        </div>
      </div>
      <p className="loader__label">{label}</p>
    </div>
  )
}
