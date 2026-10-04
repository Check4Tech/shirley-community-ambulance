import { org, upcomingEvents } from '../data/site'
import { CtaBand, PageHero } from '../components/UI'
import './fundraiser.css'

export default function Fundraiser() {
  const listedEvents = upcomingEvents()

  return (
    <>
      <PageHero
        eyebrow="Events"
        title="What's coming up"
        lead="Parades, parties, and dinners with Shirley Community Ambulance. Dates are updated here as they are set."
        image="/images/parade.jpg"
        imageAlt="Members of Shirley Community Ambulance gathered for an agency event."
      />

      <section className="section">
        <div className="wrap">
          {listedEvents.length === 0 ? (
            <p className="event-list__empty">
              No events are listed right now. Check back soon, or follow the agency for
              announcements.
            </p>
          ) : (
            <ul className="event-list">
              {listedEvents.map((event) => (
                <li key={`${event.date}-${event.name}`} className="event-list__row">
                  <span className="event-list__name">{event.name}</span>
                  <time className="event-list__date" dateTime={event.date}>
                    {event.dateLabel}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <CtaBand
        eyebrow="Give time instead"
        title="Money helps. People help more."
        body="If you have twelve hours a week, we will turn you into an EMT at no cost to you."
        primary={{ to: '/volunteer', label: 'Become a volunteer' }}
        secondary={{ href: org.donateUrl, label: 'Donate instead' }}
      />
    </>
  )
}
