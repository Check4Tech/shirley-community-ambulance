import { useEffect, useState } from 'react'
import Loader from '../../components/Loader'
import { callStatsForInstant } from './callStats'

// Shirley has no message-board API. These posts are layout only.
const PLACEHOLDER_POSTS = [
  {
    id: 'welcome',
    title: 'Welcome to the members board',
    date: 'October 1, 2026',
    body: 'Placeholder post. Crew notices, meeting reminders, and training updates will show up here once a message board is connected.',
  },
  {
    id: 'meetings',
    title: 'Monthly meetings',
    date: 'October 1, 2026',
    body: 'Placeholder post. Board meeting is the first Thursday, general meeting the second Thursday, and training the fourth Thursday. All three are at 1930. There is no third-Thursday meeting.',
  },
  {
    id: 'rigs',
    title: 'Rig checks',
    date: 'October 4, 2026',
    body: 'Placeholder post. Use Rig Checks in the members menu to open Check4Tech and complete a rig check with your current sign-in.',
  },
]

export default function MembersHome() {
  const [loading, setLoading] = useState(true)
  const { year, months } = callStatsForInstant()
  const peak = Math.max(...months.map((row) => row.count))

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 700)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <section className="section members-panel members-home">
      <div className="members-home__row">
        <div className="bulletin">
          <header className="members-panel__head">
            <p className="eyebrow">Members home</p>
            <h1>Message board</h1>
          </header>

          {loading ? (
            <Loader compact label="Loading the message board…" />
          ) : (
            <ol className="bulletin__list">
              {PLACEHOLDER_POSTS.map((post) => (
                <li key={post.id} className="bulletin__post">
                  <p className="bulletin__date">
                    <time>{post.date}</time>
                    <span className="bulletin__tag">Placeholder</span>
                  </p>
                  <h2>{post.title}</h2>
                  <p>{post.body}</p>
                </li>
              ))}
            </ol>
          )}
        </div>

        <aside className="call-stats" aria-labelledby="call-stats-title">
          <h2 id="call-stats-title">{year} calls</h2>
          <p className="call-stats__label">This year's calls</p>
          <ol className="call-stats__months">
            {months.map((row) => (
              <li key={row.month} className="call-stats__month">
                <span className="call-stats__name">{row.month}</span>
                <span className="call-stats__track" aria-hidden="true">
                  <span
                    className="call-stats__bar"
                    style={{ width: `${(row.count / peak) * 100}%` }}
                  />
                </span>
                <span className="call-stats__count">{row.count}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </section>
  )
}
