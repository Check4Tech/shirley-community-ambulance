import { useEffect, useId, useMemo, useState } from 'react'
import Loader from '../../components/Loader'
import { isProbationary, isStudent, MEMBER_LIST_FILTERS, useActiveMembers } from './useActiveMembers'

function cell(value) {
  if (value == null || String(value).trim() === '') return '—'
  return String(value)
}

function StatusCell({ value }) {
  const text = cell(value)
  if (text !== 'Active' && text !== 'Inactive') return text
  const tone = text === 'Active' ? 'active' : 'inactive'
  return <span className={`member-status member-status--${tone}`}>{text}</span>
}

export default function MembersRoster({ group = 'all' }) {
  const [nameQuery, setNameQuery] = useState('')
  const [appliedName, setAppliedName] = useState('')
  const [list, setList] = useState('all')
  const nameId = useId()
  const listId = useId()
  const subset = group === 'students' ? isStudent : group === 'probationary' ? isProbationary : null
  const { status, members, error, notice, loaded } = useActiveMembers({ list, query: appliedName })
  const rows = useMemo(
    () => (subset ? members.filter((member) => subset(member.raw)) : members),
    [members, subset],
  )
  const narrowed = list !== 'all' || appliedName !== ''
  const title = group === 'students' ? 'Students' : group === 'probationary' ? 'Probationary' : 'Members'
  const lead =
    group === 'students'
      ? 'Members whose role or certification is student or youth.'
      : group === 'probationary'
        ? 'Members whose role or certification is probationary.'
        : 'Members of Shirley Community Ambulance.'
  const empty =
    group === 'students'
      ? 'No students were returned.'
      : group === 'probationary'
        ? 'No probationary members were returned.'
        : 'No members were returned.'

  useEffect(() => {
    const trimmed = nameQuery.trim()
    if (!trimmed) {
      setAppliedName('')
      return undefined
    }
    const timer = window.setTimeout(() => setAppliedName(trimmed), 300)
    return () => window.clearTimeout(timer)
  }, [nameQuery])

  return (
    <section className="section members-panel">
      <div className="wrap">
        <header className="members-panel__head">
          <p className="eyebrow">Members area</p>
          <h1>{title}</h1>
          <p className="lead">{lead}</p>
        </header>

        {status === 'loading' && <Loader compact label="Loading members…" />}

        {status === 'error' && (
          <p className="members-panel__error" role="alert">
            {error}
          </p>
        )}

        {status === 'ready' && notice ? (
          <p className="members-panel__empty" role="status">
            {notice}
          </p>
        ) : null}

        {(status === 'ready' || loaded) && status !== 'error' && (
          <div className="member-filters">
            <div className="field">
              <label htmlFor={nameId}>Name</label>
              <input
                id={nameId}
                type="search"
                value={nameQuery}
                onChange={(event) => setNameQuery(event.target.value)}
                autoComplete="off"
                placeholder="Search by name"
              />
            </div>
            <div className="field field--list">
              <label htmlFor={listId}>Show</label>
              <select id={listId} value={list} onChange={(event) => setList(event.target.value)}>
                {MEMBER_LIST_FILTERS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {status === 'ready' && rows.length === 0 && (
          <p className="members-panel__empty" role="status">
            {narrowed ? 'No members match.' : empty}
          </p>
        )}

        {status === 'ready' && rows.length > 0 && (
          <div className="member-table-scroll">
            <table className="member-table">
              <caption className="visually-hidden">{title}</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Username</th>
                  <th scope="col">Role</th>
                  <th scope="col">Certification</th>
                  <th scope="col">Email</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((member) => (
                  <tr key={member.id ?? member.username}>
                    <td>{cell(member.name)}</td>
                    <td>{cell(member.username)}</td>
                    <td>{cell(member.role)}</td>
                    <td>{cell(member.certification)}</td>
                    <td>{cell(member.email)}</td>
                    <td>{cell(member.phone)}</td>
                    <td>
                      <StatusCell value={member.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
