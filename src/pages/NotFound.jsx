import { Link } from 'react-router-dom'
import { org } from '../data/site'

export default function NotFound() {
  return (
    <section className="section">
      <div className="wrap prose">
        <span className="eyebrow">404</span>
        <h1>We couldn&rsquo;t find that page</h1>
        <p className="lead">
          The page you were looking for has moved or no longer exists. Here is where most
          people are headed:
        </p>
        <ul>
          <li>
            <Link to="/volunteer">Become a member</Link>
          </li>
          <li>
            <Link to="/services#cpr">Book a CPR class</Link>
          </li>
          <li>
            <Link to="/services#standby">Request an event stand-by</Link>
          </li>
          <li>
            <Link to="/support">Donate</Link>
          </li>
          <li>
            <Link to="/contact">Contact us</Link>
          </li>
        </ul>
        <p>
          Still stuck? Call the station at <a href={org.phoneHref}>{org.phone}</a>.
        </p>
        <Link className="btn btn--primary" to="/">
          Back to the home page
        </Link>
      </div>
    </section>
  )
}
