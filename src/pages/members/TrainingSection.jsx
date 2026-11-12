import { useEffect, useMemo, useRef, useState } from 'react'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { Field } from '../../components/UI'
import { isStudent, memberName } from './useActiveMembers'
import { authorizedFetch } from './memberApi'
import { formatUsDate, todayUsDate, toIsoDate } from './memberDates'
import { completionUserIds, idsInPicker, selectionAfterToggleAll, userIdsOnTraining } from './trainingPeople'
import { useTrainingAccess } from './trainingAccess'
import { PROBATIONARY_PERMISSION, useCohortAccess } from './cohortAccess'

const FILE_FORMATS = [
  { value: '', label: 'Choose one…' },
  { value: 'PDF', label: 'PDF' },
  { value: 'POWERPOINT', label: 'PowerPoint' },
  { value: 'MEDIA', label: 'Media' },
]

const FORMAT_LABEL = { PDF: 'PDF', POWERPOINT: 'PowerPoint', MEDIA: 'Media' }

/** Names already used for EMS and Fire training, plus the two categories stored in the Shirley seed data. */
const STARTER_CATEGORIES = [
  'Airway Management & Pulmonary',
  'Anatomy & Physiology',
  'Behavioral & Psychiatric Emergencies',
  'Cardiology & Resuscitation',
  'Dermatology & Wound Care',
  'Disaster Response & MCI',
  'EMS',
  'EMS Operations',
  'Endocrine & Metabolic Emergencies',
  'Environmental Emergencies',
  'Gastrointestinal',
  'General Training',
  'Geriatrics',
  'Hazardous Materials (HAZMAT)',
  'Infectious Diseases',
  'Medical-Legal & Ethical Considerations',
  'Neurology',
  'Obstetrics & Gynecology',
  'Ophthalmology & Otorhinolaryngology',
  'Patient Assessment & Clinical Decision-Making',
  'Pediatrics',
  'Pharmacology',
  'Renal & Urological Emergencies',
  'Reproductive & Sexual Health',
  'SAFETY',
  'Special Populations',
  'Toxicology & Overdose Management',
  'Trauma Care',
]

function categoryNames(resources, extra = '') {
  const names = new Set(STARTER_CATEGORIES)
  ;(resources || []).forEach((resource) => {
    const name = String(resource?.category || '').trim()
    if (name) names.add(name)
  })
  const current = String(extra || '').trim()
  if (current && current !== '__new__') names.add(current)
  return [...names].sort((left, right) => left.localeCompare(right))
}

function categoryChoices(resources, extra = '') {
  return [
    { value: '', label: 'ALL' },
    ...categoryNames(resources, extra).map((name) => ({ value: name, label: name })),
  ]
}

const FILE_ACCEPT = {
  PDF: '.pdf,application/pdf',
  POWERPOINT: '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation',
  MEDIA: '.mp3,.mp4,.wav,.webm,.mov,.m4a,audio/*,video/*',
}

const FILE_ACCEPT_ALL = Object.values(FILE_ACCEPT).join(',')

const EXT_KIND = {
  pdf: 'PDF',
  ppt: 'POWERPOINT',
  pptx: 'POWERPOINT',
  mp3: 'MEDIA',
  mp4: 'MEDIA',
  wav: 'MEDIA',
  webm: 'MEDIA',
  mov: 'MEDIA',
  m4a: 'MEDIA',
}

function kindFromFile(file) {
  if (!file) return ''
  const name = String(file.name || '')
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : ''
  if (EXT_KIND[ext]) return EXT_KIND[ext]
  const type = String(file.type || '').toLowerCase()
  if (type === 'application/pdf') return 'PDF'
  if (type.includes('presentation') || type === 'application/vnd.ms-powerpoint') return 'POWERPOINT'
  if (type.startsWith('audio/') || type.startsWith('video/')) return 'MEDIA'
  return ''
}

function blankFile() {
  return { title: '', kind: '', description: '', category: '', newCategory: '' }
}

async function readJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function listedPeople(assignment, students, everyone, members) {
  const rows = assignment.completions || []
  if (everyone) {
    const studentIds = new Set((members || []).filter((member) => isStudent(member)).map((member) => String(member.id)))
    return rows.filter((row) => !studentIds.has(String(row.userId)))
  }
  const ids = new Set((students || []).filter((student) => student?.id != null).map((student) => String(student.id)))
  return rows.filter((row) => ids.has(String(row.userId)))
}

function isOpenFor(assignment, userId) {
  if (userId == null) return false
  return (assignment.completions || []).some((row) => String(row.userId) === String(userId) && !row.completed)
}

function describeDelete(pending) {
  if (!pending) return { title: '', detail: '' }
  if (pending.kind === 'file') {
    const title = String(pending.resource?.title || '').trim() || 'this training file'
    return { title, detail: '' }
  }
  const assignment = pending.assignment || {}
  const linked = (assignment.resources || []).find((item) => String(item?.title || '').trim())
  const title = String(linked?.title || assignment.title || '').trim() || 'this assignment'
  const assigned = formatUsDate(assignment.assignedOn)
  const due = formatUsDate(assignment.dueOn)
  const parts = []
  if (assigned) parts.push(`Assigned ${assigned}`)
  if (due) parts.push(`Due ${due}`)
  return { title, detail: parts.join('. ') }
}

export default function TrainingSection({ active, students = [], everyone = false, memberKind = 'student', managePermission = '' }) {
  const trainingAccess = useTrainingAccess()
  const cohort = useCohortAccess()
  const session = trainingAccess.session
  const canManage = managePermission
    ? managePermission === PROBATIONARY_PERMISSION
      ? cohort.manageProbationary
      : cohort.manageStudents
    : trainingAccess.canManage
  const canSeeCompletions = trainingAccess.canManage || cohort.manageStudents || cohort.manageProbationary
  const [resources, setResources] = useState([])
  const [assignments, setAssignments] = useState([])
  const [members, setMembers] = useState([])
  const [fileCategory, setFileCategory] = useState('')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [draft, setDraft] = useState(blankFile)
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignResource, setAssignResource] = useState(null)
  const [editingAssignment, setEditingAssignment] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [assignedOn, setAssignedOn] = useState(todayUsDate)
  const [dueOn, setDueOn] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [quizFile, setQuizFile] = useState(null)
  const [takeFile, setTakeFile] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [panel, setPanel] = useState('assigned')
  const [assignedCategory, setAssignedCategory] = useState('')
  const [assignedQuery, setAssignedQuery] = useState('')

  useEffect(() => {
    if (!active) return undefined
    let cancelled = false
    async function load() {
      try {
        const resourcesCall = await authorizedFetch(session, '/training/resources')
        const assignmentsCall = await authorizedFetch(session, '/training/assignments')
        if (!resourcesCall.response.ok || !assignmentsCall.response.ok) {
          throw new Error(resourcesCall.message || assignmentsCall.message || 'Training could not be loaded.')
        }
        const resourceRows = await readJson(resourcesCall.response)
        const assignmentRows = await readJson(assignmentsCall.response)
        if (cancelled) return
        setResources(Array.isArray(resourceRows) ? resourceRows : [])
        setAssignments(Array.isArray(assignmentRows) ? assignmentRows : [])
        setLoaded(true)
        setError('')
      } catch (err) {
        if (!cancelled) {
          setLoaded(true)
          setError(err instanceof Error ? err.message : 'Training could not be loaded.')
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [active, session])

  useEffect(() => {
    if (!active || !canManage) return undefined
    let cancelled = false
    async function loadMembers() {
      try {
        const { response } = await authorizedFetch(session, '/users/active')
        if (!response.ok) return
        const rows = await readJson(response)
        if (!cancelled && Array.isArray(rows)) {
          setMembers(
            rows.map((member) => ({
              id: member.id,
              name: memberName(member) || member.username || 'Member',
              certification: member.certification ?? '',
            })),
          )
        }
      } catch {
        // The give-out can still target every current member.
      }
    }
    loadMembers()
    return () => {
      cancelled = true
    }
  }, [active, canManage, session])

  const library = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return resources.filter((resource) => {
      if (fileCategory && resource.category !== fileCategory) return false
      if (!needle) return true
      return String(resource.title || '').toLowerCase().includes(needle)
    })
  }, [resources, fileCategory, query])

  const assignPeople = useMemo(() => {
    const rows = new Map()
    members.forEach((member) => {
      if (member?.id == null) return
      rows.set(String(member.id), { id: member.id, name: member.name || memberName(member) || 'Member' })
    })
    ;(students || []).forEach((student) => {
      if (student?.id == null || rows.has(String(student.id))) return
      rows.set(String(student.id), { id: student.id, name: student.name || memberName(student) || 'Member' })
    })
    return [...rows.values()].sort((left, right) => left.name.localeCompare(right.name))
  }, [members, students])

  const openAssignments = useMemo(
    () => assignments.filter((assignment) => isOpenFor(assignment, session?.userId)),
    [assignments, session?.userId],
  )

  const assignedCards = useMemo(() => {
    const needle = assignedQuery.trim().toLowerCase()
    const cards = []
    openAssignments.forEach((assignment) => {
      ;(assignment.resources || []).forEach((item) => {
        const resource = resources.find((row) => String(row.id) === String(item.id)) || item
        const title = String(resource.title || item.title || 'Training')
        if (assignedCategory && resource.category !== assignedCategory) return
        if (needle && !title.toLowerCase().includes(needle)) return
        cards.push({
          key: `${assignment.id}-${resource.id || title}`,
          assignment,
          resource: { ...resource, title },
        })
      })
    })
    return cards
  }, [assignedCategory, assignedQuery, openAssignments, resources])

  function updateDraft(field) {
    return (event) => setDraft((current) => ({ ...current, [field]: event.target.value }))
  }

  function closeUpload() {
    setUploadOpen(false)
    setEditingId(null)
    setDraft(blankFile())
    setFile(null)
  }

  function openUpload() {
    setError('')
    setEditingId(null)
    setDraft(blankFile())
    setFile(null)
    setUploadOpen(true)
  }

  function openQuiz(event, resource) {
    event.stopPropagation()
    setError('')
    setQuizFile(resource)
  }

  function openTakeQuiz(event, resource) {
    event.stopPropagation()
    setError('')
    setTakeFile(resource)
  }

  function quizSaved(resourceId) {
    setResources((current) =>
      current.map((row) => (String(row.id) === String(resourceId) ? { ...row, hasQuiz: true } : row)),
    )
    setQuizFile(null)
    setNotice('Quiz saved.')
  }

  function chooseFile(event) {
    const next = event.target.files?.[0] || null
    setFile(next)
    const detected = kindFromFile(next)
    setDraft((current) => ({ ...current, kind: detected || (next ? '' : current.kind) }))
  }

  async function saveFile(event) {
    event.preventDefault()
    const kind = kindFromFile(file) || draft.kind
    const category = (draft.category === '__new__' ? draft.newCategory : draft.category).trim()
    if (!file && !editingId) {
      setError('Choose a PDF, PowerPoint, or media file.')
      return
    }
    if (!kind) {
      setError('Choose PDF, PowerPoint, or Media.')
      return
    }
    if (!category) {
      setError(draft.category === '__new__' ? 'Enter a category.' : 'Choose a category.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    const body = new FormData()
    body.append('title', draft.title)
    body.append('kind', kind)
    body.append('category', category)
    body.append('description', draft.description)
    if (file) body.append('file', file)
    try {
      const path = editingId ? `/training/resources/${editingId}` : '/training/resources'
      const { response, message } = await authorizedFetch(session, path, {
        method: editingId ? 'PATCH' : 'POST',
        body,
      })
      if (!response.ok) throw new Error(message || 'The training file could not be saved.')
      const saved = await readJson(response)
      setResources((current) => {
        const without = current.filter((resource) => resource.id !== saved.id)
        return [...without, saved].sort((left, right) => String(left.title).localeCompare(String(right.title)))
      })
      setNotice(editingId ? 'Training file updated.' : 'Training file uploaded.')
      closeUpload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The training file could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  function removeFile(resource) {
    if (!resource?.id) return
    setError('')
    setPendingDelete({ kind: 'file', resource })
  }

  function openViewer(event, resource) {
    event.stopPropagation()
    setError('')
    setViewing(resource)
  }

  function openAssign(resource) {
    setError('')
    setEditingAssignment(null)
    setAssignResource(resource)
    const today = todayUsDate()
    setAssignedOn(today)
    setDueOn(today)
    setSelectedUsers(idsInPicker(userIdsOnTraining(resource, assignments), assignPeople))
  }

  function openEditAssignment(assignment) {
    const linked = (assignment?.resources || []).find((item) => item?.id != null)
    if (!linked) return
    const resource = resources.find((row) => String(row.id) === String(linked.id)) || linked
    setError('')
    setEditingAssignment(assignment)
    setAssignResource(resource)
    setAssignedOn(formatUsDate(assignment.assignedOn) || todayUsDate())
    setDueOn(formatUsDate(assignment.dueOn))
    setSelectedUsers(idsInPicker(completionUserIds(assignment), assignPeople))
  }

  function personSelected(id) {
    return selectedUsers.some((userId) => String(userId) === String(id))
  }

  function togglePerson(id) {
    setSelectedUsers((current) => (
      current.some((userId) => String(userId) === String(id))
        ? current.filter((userId) => String(userId) !== String(id))
        : [...current, id]
    ))
  }

  function toggleAllPeople(event) {
    setSelectedUsers(selectionAfterToggleAll(event.target.checked, assignPeople))
  }

  function closeAssign() {
    if (assigning) return
    setError('')
    setAssignResource(null)
    setEditingAssignment(null)
  }

  async function giveOut(event) {
    event.preventDefault()
    if (!assignResource) return
    const assignedIso = toIsoDate(assignedOn)
    const dueIso = toIsoDate(dueOn)
    if (!assignedIso || !dueIso) {
      setError('Use MM/DD/YYYY for the dates.')
      return
    }
    if (selectedUsers.length === 0) {
      setError('Choose at least one person.')
      return
    }
    const updating = editingAssignment
    setAssigning(true)
    setError('')
    setNotice('')
    const resourceIds = updating
      ? (updating.resources || []).map((item) => Number(item.id)).filter((id) => Number.isFinite(id))
      : [Number(assignResource.id)]
    try {
      const { response, message } = await authorizedFetch(
        session,
        updating ? `/training/assignments/${updating.id}` : '/training/assignments',
        {
          method: updating ? 'PATCH' : 'POST',
          body: JSON.stringify({
            resourceIds: resourceIds.length ? resourceIds : [Number(assignResource.id)],
            assignedOn: assignedIso,
            dueOn: dueIso,
            allMembers: false,
            userIds: selectedUsers.map(Number),
          }),
        },
      )
      if (!response.ok) {
        throw new Error(message || (updating ? 'The assignment could not be updated.' : 'The training could not be assigned.'))
      }
      const saved = await readJson(response)
      if (!saved?.id) {
        throw new Error(updating ? 'The assignment could not be updated.' : 'The training could not be assigned.')
      }
      if (updating) {
        setAssignments((current) => current.map((row) => (String(row.id) === String(updating.id) ? saved : row)))
        setNotice(saved.emailNotice || 'Training updated.')
      } else {
        setAssignments((current) => [saved, ...current])
        setNotice(saved.emailNotice || 'Training assigned.')
      }
      setSelectedUsers([])
      setDueOn('')
      setAssignResource(null)
      setEditingAssignment(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : (updating ? 'The assignment could not be updated.' : 'The training could not be assigned.'))
    } finally {
      setAssigning(false)
    }
  }

  function removeAssignment(assignment) {
    if (!assignment?.id) return
    setError('')
    setPendingDelete({ kind: 'assignment', assignment })
  }

  function closeDelete() {
    if (deleting) return
    setError('')
    setPendingDelete(null)
  }

  async function confirmDelete(event) {
    event.preventDefault()
    if (!pendingDelete || deleting) return
    const target = pendingDelete
    setDeleting(true)
    setError('')
    setNotice('')
    try {
      if (target.kind === 'file') {
        const { response, message } = await authorizedFetch(session, `/training/resources/${target.resource.id}`, { method: 'DELETE' })
        if (!response.ok) throw new Error(message || 'The training file could not be deleted.')
        setResources((current) => current.filter((item) => item.id !== target.resource.id))
        setNotice('Training file deleted.')
      } else {
        const assignment = target.assignment
        const { response, message } = await authorizedFetch(session, `/training/assignments/${assignment.id}`, { method: 'DELETE' })
        if (!response.ok) throw new Error(message || 'The assignment could not be deleted.')
        setAssignments((current) => current.filter((row) => String(row.id) !== String(assignment.id)))
        if (String(editingAssignment?.id) === String(assignment.id)) {
          setAssignResource(null)
          setEditingAssignment(null)
        }
        setNotice('Assignment deleted.')
      }
      setPendingDelete(null)
    } catch (err) {
      const fallback = target.kind === 'file' ? 'The training file could not be deleted.' : 'The assignment could not be deleted.'
      setError(err instanceof Error ? err.message : fallback)
    } finally {
      setDeleting(false)
    }
  }

  function beginEdit(resource) {
    setError('')
    setEditingId(resource.id)
    setDraft({
      title: resource.title || '',
      kind: resource.kind || 'PDF',
      description: resource.description || '',
      category: resource.category || '',
      newCategory: '',
    })
    setFile(null)
    setUploadOpen(true)
  }

  const detectedKind = kindFromFile(file)
  const ambiguousKind = Boolean(file) && !detectedKind
  const shownKind = detectedKind || (!file && editingId ? draft.kind : '')
  const categories = categoryNames(resources, draft.category)
  const deleteCopy = describeDelete(pendingDelete)

  return (
    <div className="training-section">
      {error && !uploadOpen && !assignResource && !pendingDelete ? (
        <p className="members-panel__error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="members-panel__empty" role="status">
          {notice}
        </p>
      ) : null}

      <nav className="student-subnav" aria-label="Training">
        <button type="button" aria-current={panel === 'assigned' ? 'page' : undefined} onClick={() => setPanel('assigned')}>
          Assigned training
        </button>
        <button type="button" aria-current={panel === 'library' ? 'page' : undefined} onClick={() => setPanel('library')}>
          Training
        </button>
      </nav>

      {panel === 'assigned' ? (
        <section className="training-block" aria-label="Assigned training">
          <div className="training-filters">
            <Field
              label="Category"
              name="training-assigned-category"
              value={assignedCategory}
              onChange={(event) => setAssignedCategory(event.target.value)}
              options={categoryChoices(resources)}
            />
            <Field
              label="Search titles"
              name="training-assigned-search"
              value={assignedQuery}
              onChange={(event) => setAssignedQuery(event.target.value)}
              autoComplete="off"
            />
          </div>
          {!loaded ? (
            <p className="members-panel__empty" role="status">
              Loading training…
            </p>
          ) : null}
          {loaded && openAssignments.length === 0 ? (
            <p className="members-panel__empty" role="status">
              No assigned training.
            </p>
          ) : null}
          {loaded && openAssignments.length > 0 && assignedCards.length === 0 ? (
            <p className="members-panel__empty" role="status">
              No assigned training matches.
            </p>
          ) : null}
          <ul className="training-library training-library--assigned">
            {assignedCards.map(({ key, assignment, resource }) => (
              <li key={key} className="training-card training-card--assigned">
                <h4 className="training-card__title">{resource.title}</h4>
                <p className="training-card__kind">{resource.category || 'No category'}</p>
                <p className="training-card__meta">Due {formatUsDate(assignment.dueOn)}</p>
                <p className="training-card__description">{resource.description || ''}</p>
                <div className="training-actions">
                  <button type="button" className="btn btn--outline btn--sm" onClick={(event) => openViewer(event, resource)}>
                    Open
                  </button>
                  {!canManage && resource.hasQuiz ? (
                    <button type="button" className="btn btn--outline btn--sm" onClick={(event) => openTakeQuiz(event, resource)}>
                      Take quiz
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
      <section className="training-block" aria-label="Training library">
        {canManage ? (
          <div className="training-upload">
            <button type="button" className="btn btn--navy btn--sm" onClick={openUpload}>
              Upload
            </button>
          </div>
        ) : null}
        <h3>File library</h3>
        <div className="training-filters">
          <Field label="Category" name="training-category" value={fileCategory} onChange={(event) => setFileCategory(event.target.value)} options={categoryChoices(resources)} />
          <Field
            label="Search titles"
            name="training-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
        </div>
        {loaded && library.length === 0 ? (
          <p className="members-panel__empty" role="status">
            No training files match.
          </p>
        ) : null}
        <ul className="training-library">
          {library.map((resource) => {
            const selected = String(selectedId) === String(resource.id)
            return (
            <li
              key={resource.id}
              className={`training-card${selected ? ' is-selected' : ''}`}
              aria-pressed={selected}
              onClick={() => setSelectedId(resource.id)}
            >
              <h4 className="training-card__title">{resource.title}</h4>
              <p className="training-card__kind">{resource.category || 'No category'}</p>
              <p className="training-card__description">{resource.description || ''}</p>
              <div className="training-actions">
                <button type="button" className="btn btn--outline btn--sm" onClick={(event) => openViewer(event, resource)}>
                  Open
                </button>
                {canManage ? (
                  <>
                    <button type="button" className="btn btn--outline btn--sm" onClick={() => openAssign(resource)}>
                      Assign
                    </button>
                    <button type="button" className="btn btn--outline btn--sm" onClick={() => beginEdit(resource)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn--outline btn--sm" onClick={() => removeFile(resource)}>
                      Delete
                    </button>
                    <button type="button" className="btn btn--outline btn--sm" onClick={(event) => openQuiz(event, resource)}>
                      Add quiz
                    </button>
                  </>
                ) : null}
              </div>
            </li>
            )
          })}
        </ul>
        {canSeeCompletions ? (
          <FileAssignments
            resource={library.find((resource) => String(resource.id) === String(selectedId)) || null}
            assignments={assignments}
            students={students}
            everyone={everyone}
            members={members}
            onEdit={canManage ? openEditAssignment : undefined}
            onDelete={canManage ? removeAssignment : undefined}
          />
        ) : null}
      </section>
      )}

      {assignResource ? (
        <div className="calendar-modal" role="presentation" onMouseDown={closeAssign}>
          <form
            className="calendar-modal__panel training-upload-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="training-assign-title"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={giveOut}
          >
            <header className="calendar-modal__head">
              <h2 id="training-assign-title">{editingAssignment ? 'Edit' : 'Assign'} {assignResource.title}</h2>
              <button type="button" className="calendar-modal__close" aria-label="Close" onClick={closeAssign}>
                ×
              </button>
            </header>
            {error ? (
              <p className="members-panel__error" role="alert">
                {error}
              </p>
            ) : null}
            <Field
              label="Assigned date"
              name="training-assigned-on"
              required
              value={assignedOn}
              onChange={(event) => setAssignedOn(event.target.value)}
              autoComplete="off"
              help="MM/DD/YYYY"
            />
            <Field
              label="Due date"
              name="training-due-on"
              required
              value={dueOn}
              onChange={(event) => setDueOn(event.target.value)}
              autoComplete="off"
              help="MM/DD/YYYY"
            />
            <fieldset className="training-people-picker">
              <legend>People</legend>
              {assignPeople.length === 0 ? (
                <p className="members-panel__empty">No current users to assign.</p>
              ) : (
                <>
                  <label>
                    <input
                      type="checkbox"
                      checked={assignPeople.every((person) => personSelected(person.id))}
                      onChange={toggleAllPeople}
                    />
                    Select all
                  </label>
                  {assignPeople.map((person) => (
                    <label key={person.id}>
                      <input
                        type="checkbox"
                        checked={personSelected(person.id)}
                        onChange={() => togglePerson(person.id)}
                      />
                      <span>{person.name}</span>
                    </label>
                  ))}
                </>
              )}
            </fieldset>
            <div className="btn-row">
              <button type="submit" className="btn btn--navy btn--sm" disabled={assigning || assignPeople.length === 0}>
                {assigning ? (editingAssignment ? 'Saving…' : 'Assigning…') : (editingAssignment ? 'Save' : 'Assign')}
              </button>
              <button type="button" className="btn btn--outline btn--sm" onClick={closeAssign}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {pendingDelete ? (
        <div className="calendar-modal" role="presentation" onMouseDown={closeDelete}>
          <form
            className="calendar-modal__panel bulletin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="training-delete-title"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={confirmDelete}
          >
            <header className="calendar-modal__head">
              <h2 id="training-delete-title">Delete {deleteCopy.title}</h2>
              <button type="button" className="calendar-modal__close" aria-label="Close" onClick={closeDelete}>
                ×
              </button>
            </header>
            {error ? (
              <p className="members-panel__error" role="alert">
                {error}
              </p>
            ) : null}
            <p>
              {`Delete “${deleteCopy.title}”?`}
              {deleteCopy.detail ? ` ${deleteCopy.detail}.` : ''}
            </p>
            <div className="btn-row">
              <button type="submit" className="btn btn--navy btn--sm" disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
              <button type="button" className="btn btn--outline btn--sm" onClick={closeDelete}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {quizFile ? (
        <QuizModal
          session={session}
          resource={quizFile}
          onClose={() => setQuizFile(null)}
          onSaved={() => quizSaved(quizFile.id)}
        />
      ) : null}
      {takeFile ? <TakeQuizModal session={session} resource={takeFile} onClose={() => setTakeFile(null)} /> : null}
      {viewing ? <FileViewer session={session} resource={viewing} onClose={() => setViewing(null)} /> : null}
      {uploadOpen ? (
        <div className="calendar-modal" role="presentation" onMouseDown={closeUpload}>
          <form
            className="calendar-modal__panel training-upload-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="training-upload-title"
            aria-label="Upload training file"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={saveFile}
          >
            <header className="calendar-modal__head">
              <h2 id="training-upload-title">{editingId ? 'Replace training file' : 'Upload'}</h2>
              <button type="button" className="calendar-modal__close" aria-label="Close" onClick={closeUpload}>
                ×
              </button>
            </header>
            <p className="training-upload__note">Upload a PDF, a PowerPoint, or a media file.</p>
            {error ? (
              <p className="members-panel__error" role="alert">
                {error}
              </p>
            ) : null}
            <Field label="Title" name="training-upload-title-field" required value={draft.title} onChange={updateDraft('title')} />
            <Field
              label="Category"
              name="training-upload-category"
              required
              value={draft.category}
              onChange={updateDraft('category')}
              options={[
                { value: '', label: 'Choose one…' },
                ...categories.map((name) => ({ value: name, label: name })),
                { value: '__new__', label: 'Add a category' },
              ]}
            />
            {draft.category === '__new__' ? (
              <Field
                label="New category"
                name="training-new-category"
                required
                value={draft.newCategory}
                onChange={updateDraft('newCategory')}
                autoComplete="off"
              />
            ) : null}
            <Field label="Description" name="training-upload-description" rows={3} value={draft.description} onChange={updateDraft('description')} />
            <p className="field">
              <label htmlFor="f-training-file">
                File
                {!editingId ? (
                  <span className="field__req" aria-hidden="true">
                    *
                  </span>
                ) : null}
              </label>
              <input
                id="f-training-file"
                name="training-file"
                type="file"
                accept={FILE_ACCEPT_ALL}
                required={!editingId}
                onChange={chooseFile}
              />
            </p>
            {shownKind && !ambiguousKind ? <p className="training-upload__kind">File: {FORMAT_LABEL[shownKind] || shownKind}</p> : null}
            {ambiguousKind ? (
              <Field
                label="File format"
                name="training-upload-kind"
                required
                value={draft.kind}
                onChange={updateDraft('kind')}
                options={FILE_FORMATS}
              />
            ) : null}
            <div className="btn-row">
              <button type="submit" className="btn btn--navy btn--sm" disabled={saving}>
                {saving ? 'Uploading…' : 'Upload'}
              </button>
              <button type="button" className="btn btn--outline btn--sm" onClick={closeUpload}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}

function blankQuizQuestion() {
  return { prompt: '', choices: ['', ''], correctIndex: 0 }
}

function incomingQuestion(question) {
  const choices = Array.isArray(question?.choices) && question.choices.length >= 2 ? question.choices.map((choice) => String(choice)) : ['', '']
  const correct = Number(question?.correctIndex)
  return {
    prompt: question?.prompt == null ? '' : String(question.prompt),
    choices,
    correctIndex: Number.isInteger(correct) && correct >= 0 && correct < choices.length ? correct : 0,
  }
}

function TakeQuizModal({ session, resource, onClose }) {
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { response, message } = await authorizedFetch(session, `/training/resources/${resource.id}/quiz/take`)
        if (!response.ok) throw new Error(message || 'The quiz could not be loaded.')
        const body = await readJson(response)
        const rows = Array.isArray(body?.questions) ? body.questions : []
        if (cancelled) return
        setQuestions(rows.map((question) => ({
          prompt: question?.prompt == null ? '' : String(question.prompt),
          choices: Array.isArray(question?.choices) ? question.choices.map((choice) => String(choice)) : [],
        })))
        setAnswers(rows.map(() => null))
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'The quiz could not be loaded.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [resource.id, session])

  async function submit(event) {
    event.preventDefault()
    if (answers.some((answer) => answer == null)) {
      setError('Answer every question.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { response, message } = await authorizedFetch(session, `/training/resources/${resource.id}/quiz/attempt`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      })
      if (!response.ok) throw new Error(message || 'The quiz could not be submitted.')
      const body = await readJson(response)
      setResult(`You got ${body?.correctCount ?? 0} of ${body?.total ?? questions.length} correct.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The quiz could not be submitted.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="calendar-modal" role="presentation" onMouseDown={onClose}>
      <form
        className="calendar-modal__panel training-quiz-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="training-take-title"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <header className="calendar-modal__head">
          <h2 id="training-take-title">{resource.title}</h2>
          <button type="button" className="calendar-modal__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        {error ? (
          <p className="members-panel__error" role="alert">
            {error}
          </p>
        ) : null}
        {result ? (
          <p className="members-panel__empty" role="status">
            {result}
          </p>
        ) : null}
        {loading ? (
          <p className="members-panel__empty" role="status">
            Loading quiz…
          </p>
        ) : null}
        {questions.map((question, index) => (
          <fieldset key={index} className="training-quiz__question">
            <legend>Question {index + 1}</legend>
            <p>{question.prompt}</p>
            {question.choices.map((choice, choiceIndex) => (
              <label className="training-quiz__choice" key={choiceIndex}>
                <input
                  type="radio"
                  name={`take-quiz-${index}`}
                  checked={answers[index] === choiceIndex}
                  onChange={() => setAnswers((current) => current.map((answer, item) => (item === index ? choiceIndex : answer)))}
                />
                {choice}
              </label>
            ))}
          </fieldset>
        ))}
        <div className="btn-row">
          <button type="submit" className="btn btn--navy btn--sm" disabled={saving || loading || questions.length === 0}>
            {saving ? 'Submitting…' : 'Submit quiz'}
          </button>
          <button type="button" className="btn btn--outline btn--sm" onClick={onClose}>
            Close
          </button>
        </div>
      </form>
    </div>
  )
}

function QuizModal({ session, resource, onClose, onSaved }) {
  const [questions, setQuestions] = useState([blankQuizQuestion()])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { response, message } = await authorizedFetch(session, `/training/resources/${resource.id}/quiz`)
        if (!response.ok) throw new Error(message || 'The quiz could not be loaded.')
        const body = await readJson(response)
        const rows = Array.isArray(body?.questions) ? body.questions : []
        if (cancelled) return
        setQuestions(rows.length ? rows.map(incomingQuestion) : [blankQuizQuestion()])
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'The quiz could not be loaded.')
          setQuestions([blankQuizQuestion()])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [resource.id, session])

  function changeQuestion(index, next) {
    setQuestions((current) => current.map((question, item) => (item === index ? next : question)))
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { response, message } = await authorizedFetch(session, `/training/resources/${resource.id}/quiz`, {
        method: 'PUT',
        body: JSON.stringify({
          questions: questions.map((question) => ({
            prompt: question.prompt,
            choices: question.choices,
            correctIndex: Number(question.correctIndex),
          })),
        }),
      })
      if (!response.ok) throw new Error(message || 'The quiz could not be saved.')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The quiz could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="calendar-modal" role="presentation" onMouseDown={onClose}>
      <form
        className="calendar-modal__panel training-quiz-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="training-quiz-title"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={save}
      >
        <header className="calendar-modal__head">
          <h2 id="training-quiz-title">{resource.title}</h2>
          <button type="button" className="calendar-modal__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <p className="training-quiz__note">This quiz uses the file name.</p>
        {error ? (
          <p className="members-panel__error" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="members-panel__empty" role="status">
            Loading quiz…
          </p>
        ) : null}
        {questions.map((question, index) => (
          <fieldset key={index} className="training-quiz__question">
            <legend>Question {index + 1}</legend>
            <Field
              label="Question"
              name={`quiz-question-${index}`}
              required
              rows={2}
              value={question.prompt}
              onChange={(event) => changeQuestion(index, { ...question, prompt: event.target.value })}
            />
            {question.choices.map((choice, choiceIndex) => (
              <div className="training-quiz__choice" key={choiceIndex}>
                <input
                  aria-label={`Choice ${choiceIndex + 1}`}
                  value={choice}
                  required
                  onChange={(event) => {
                    const choices = question.choices.map((item, itemIndex) => (itemIndex === choiceIndex ? event.target.value : item))
                    changeQuestion(index, { ...question, choices })
                  }}
                />
                <label className="training-quiz__correct">
                  <input
                    type="radio"
                    name={`quiz-correct-${index}`}
                    checked={question.correctIndex === choiceIndex}
                    onChange={() => changeQuestion(index, { ...question, correctIndex: choiceIndex })}
                  />
                  Correct
                </label>
                {question.choices.length > 2 ? (
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => {
                      const choices = question.choices.filter((_, itemIndex) => itemIndex !== choiceIndex)
                      let correctIndex = question.correctIndex
                      if (correctIndex === choiceIndex) correctIndex = 0
                      else if (correctIndex > choiceIndex) correctIndex -= 1
                      changeQuestion(index, { ...question, choices, correctIndex })
                    }}
                  >
                    Remove
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
            <div className="btn-row">
              {question.choices.length < 6 ? (
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={() => changeQuestion(index, { ...question, choices: [...question.choices, ''] })}
                >
                  Add choice
                </button>
              ) : null}
              {questions.length > 1 ? (
                <button type="button" className="btn btn--outline btn--sm" onClick={() => setQuestions((current) => current.filter((_, item) => item !== index))}>
                  Remove question
                </button>
              ) : null}
            </div>
          </fieldset>
        ))}
        <div className="btn-row">
          {questions.length < 20 ? (
            <button type="button" className="btn btn--outline btn--sm" onClick={() => setQuestions((current) => [...current, blankQuizQuestion()])}>
              Add question
            </button>
          ) : null}
          <button type="submit" className="btn btn--navy btn--sm" disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save quiz'}
          </button>
          <button type="button" className="btn btn--outline btn--sm" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function completionCounts(rows) {
  const completed = rows.filter((row) => row.completed).length
  return `${completed} completed, ${rows.length - completed} not completed`
}

function IconPencil() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 16.5V20h3.5L18.8 8.7l-3.5-3.5L4 16.5zm15.7-9.2a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-1.2 1.2 3.5 3.5 0.7-1.7z"
        fill="currentColor"
      />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z"
        fill="currentColor"
      />
    </svg>
  )
}

function AssignmentActions({ assignment, onEdit, onDelete }) {
  if (!onEdit && !onDelete) return null
  function run(event, action) {
    event.preventDefault()
    event.stopPropagation()
    action(assignment)
  }
  return (
    <div className="training-file-assignment__actions">
      {onEdit ? (
        <button
          type="button"
          className="bulletin__icon bulletin__icon--edit"
          aria-label="Edit"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => run(event, onEdit)}
        >
          <IconPencil />
        </button>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          className="bulletin__icon bulletin__icon--delete"
          aria-label="Delete"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => run(event, onDelete)}
        >
          <IconTrash />
        </button>
      ) : null}
    </div>
  )
}

function FileAssignments({ resource, assignments, students, everyone, members, onEdit, onDelete }) {
  if (!resource) {
    return (
      <section className="training-file-assignments" aria-label="Assignments for the selected file">
        <p className="members-panel__empty">Select a file to see its assignments.</p>
      </section>
    )
  }
  const rows = (assignments || []).filter((assignment) =>
    (assignment.resources || []).some((item) => String(item.id) === String(resource.id)),
  )
  return (
    <section className="training-file-assignments" aria-label={`Assignments for ${resource.title}`}>
      <h3>{resource.title}</h3>
      {rows.length === 0 ? (
        <p className="members-panel__empty">No assignments for this file.</p>
      ) : rows.length === 1 ? (
        <AssignmentPeople
          assignment={rows[0]}
          students={students}
          everyone={everyone}
          members={members}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ) : (
        rows.map((assignment) => (
          <details key={assignment.id} className="training-file-assignment" data-assignment={assignment.id}>
            <summary>
              <span className="training-file-assignment__meta">
                <span>Assigned {formatUsDate(assignment.assignedOn)}</span>
                <span>Due {formatUsDate(assignment.dueOn)}</span>
                <span>{completionCounts(listedPeople(assignment, students, everyone, members))}</span>
              </span>
              <AssignmentActions assignment={assignment} onEdit={onEdit} onDelete={onDelete} />
            </summary>
            <PeopleColumns rows={listedPeople(assignment, students, everyone, members)} />
          </details>
        ))
      )}
    </section>
  )
}

function AssignmentPeople({ assignment, students, everyone, members, onEdit, onDelete }) {
  const rows = listedPeople(assignment, students, everyone, members)
  return (
    <article className="training-file-assignment" data-assignment={assignment.id}>
      <div className="training-file-assignment__bar">
        <span className="training-file-assignment__meta">
          <span>Assigned {formatUsDate(assignment.assignedOn)}</span>
          <span>Due {formatUsDate(assignment.dueOn)}</span>
          <span>{completionCounts(rows)}</span>
        </span>
        <AssignmentActions assignment={assignment} onEdit={onEdit} onDelete={onDelete} />
      </div>
      <PeopleColumns rows={rows} />
    </article>
  )
}

function PeopleColumns({ rows }) {
  const ordered = [...rows.filter((row) => row.completed), ...rows.filter((row) => !row.completed)]
  if (!ordered.length) return <p>None</p>
  return (
    <ul className="training-people">
      {ordered.map((row) => (
        <li key={row.userId} className={`training-person ${row.completed ? 'training-person--done' : 'training-person--open'}`}>
          <span className="training-person__mark" aria-hidden="true">
            {row.completed ? '✓' : '✕'}
          </span>
          {row.name}
        </li>
      ))}
    </ul>
  )
}

function fileNameFrom(disposition) {
  if (!disposition) return ''
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1])
    } catch {
      return encoded[1]
    }
  }
  const plain = disposition.match(/filename="?([^";]+)"?/i)
  return plain ? plain[1] : ''
}

function fileExtension(name) {
  const text = String(name || '')
  const dot = text.lastIndexOf('.')
  return dot < 0 ? '' : text.slice(dot + 1).toLowerCase()
}

function saveLocal(file, title) {
  const anchor = document.createElement('a')
  anchor.href = file.url
  anchor.download = file.name || title || 'training'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
}

function FileViewer({ session, resource, onClose }) {
  const urlRef = useRef('')
  const [phase, setPhase] = useState('loading')
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [failed, setFailed] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { response, message } = await authorizedFetch(session, `/training/resources/${resource.id}/file`, {
          headers: { Accept: '*/*' },
        })
        if (!response.ok) throw new Error(message || 'The file could not be opened.')
        const headerType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
        const name = fileNameFrom(response.headers.get('content-disposition'))
        const buffer = await response.arrayBuffer()
        const type = headerType && headerType !== 'application/octet-stream' ? headerType : ''
        const url = URL.createObjectURL(new Blob([buffer], { type: type || 'application/octet-stream' }))
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        urlRef.current = url
        setFile({ buffer, type, name, url })
        setPhase('ready')
      } catch (err) {
        if (!cancelled) {
          setPhase('error')
          setError(err instanceof Error ? err.message : 'The file could not be opened.')
        }
      }
    }
    load()
    return () => {
      cancelled = true
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = ''
      }
    }
  }, [resource.id, session])

  const extension = fileExtension(file?.name)
  const legacyPpt = extension === 'ppt' || file?.type === 'application/vnd.ms-powerpoint'
  const audio =
    file?.type.startsWith('audio/') || extension === 'mp3' || extension === 'wav' || extension === 'm4a'

  return (
    <div className="calendar-modal training-viewer-modal" role="presentation" onMouseDown={onClose}>
      <div
        className="calendar-modal__panel training-viewer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="training-viewer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="calendar-modal__head">
          <h2 id="training-viewer-title">{resource.title}</h2>
          <button type="button" className="calendar-modal__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        {phase === 'loading' ? (
          <p className="members-panel__empty" role="status">
            Opening…
          </p>
        ) : null}
        {phase === 'error' ? (
          <p className="members-panel__error" role="alert">
            {error}
          </p>
        ) : null}
        {phase === 'ready' && resource.kind === 'PDF' ? <PdfPages buffer={file.buffer} onFail={setFailed} /> : null}
        {phase === 'ready' && resource.kind === 'MEDIA' && !failed ? (
          audio ? (
            <audio
              className="training-viewer__media"
              controls
              src={file.url}
              onError={() => setFailed('This audio file could not be played in the page.')}
            />
          ) : (
            <video
              className="training-viewer__media"
              controls
              src={file.url}
              onError={() => setFailed('This video could not be played in the page.')}
            />
          )
        ) : null}
        {phase === 'ready' && resource.kind === 'POWERPOINT' && legacyPpt ? (
          <p>
            This PowerPoint cannot be shown on the page. A .pptx is a zip of slide XML, which this page can draw. This
            file is a .ppt, the older binary format, and a browser has no viewer that can turn those bytes into slides.
          </p>
        ) : null}
        {phase === 'ready' && resource.kind === 'POWERPOINT' && !legacyPpt && !failed ? (
          <PptxSlides buffer={file.buffer} onFail={setFailed} />
        ) : null}
        {failed ? (
          <p className="members-panel__error" role="alert">
            {failed}
          </p>
        ) : null}
        {file && (failed || (resource.kind === 'POWERPOINT' && legacyPpt)) ? (
          <div className="btn-row">
            <button type="button" className="btn btn--outline btn--sm" onClick={() => saveLocal(file, resource.title)}>
              Download
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function PdfPages({ buffer, onFail }) {
  const host = useRef(null)

  useEffect(() => {
    let cancelled = false
    let loadingTask
    async function draw() {
      const pdfjs = await import('pdfjs-dist')
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
      loadingTask = pdfjs.getDocument({ data: buffer.slice(0) })
      const pdf = await loadingTask.promise
      if (cancelled || !host.current) return
      host.current.replaceChildren()
      for (let number = 1; number <= pdf.numPages; number += 1) {
        const page = await pdf.getPage(number)
        if (cancelled || !host.current) return
        const viewport = page.getViewport({ scale: 1.25 })
        const canvas = document.createElement('canvas')
        canvas.className = 'training-viewer__page'
        canvas.width = viewport.width
        canvas.height = viewport.height
        const text = await page.getTextContent()
        const label = text.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
        canvas.setAttribute('role', 'img')
        canvas.setAttribute('aria-label', label || `Page ${number}`)
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
        if (cancelled || !host.current) return
        host.current.append(canvas)
      }
    }
    draw().catch((err) => {
      if (!cancelled) onFail(err instanceof Error ? err.message : 'The PDF could not be shown.')
    })
    return () => {
      cancelled = true
      loadingTask?.destroy()
    }
  }, [buffer, onFail])

  return <div className="training-viewer__pages" ref={host} />
}

async function withoutMissingParts(buffer) {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(buffer)
  const types = zip.file('[Content_Types].xml')
  if (!types) return buffer
  const xml = await types.async('string')
  let removed = 0
  const next = xml.replace(/<Override\b[^>]*\/>/g, (tag) => {
    const part = tag.match(/PartName="([^"]+)"/)
    if (!part) return tag
    let path = part[1].replace(/^\//, '')
    try {
      path = decodeURIComponent(path)
    } catch {
      // Keep the raw path when the part name is not encoded.
    }
    if (zip.file(path)) return tag
    removed += 1
    return ''
  })
  if (!removed) return buffer
  for (const name of Object.keys(zip.files)) {
    if (name.replace(/\\/g, '/').toLowerCase().endsWith('[content_types].xml')) zip.remove(name)
  }
  zip.file('[Content_Types].xml', next)
  return zip.generateAsync({ type: 'arraybuffer' })
}

function PptxSlides({ buffer, onFail }) {
  const host = useRef(null)

  useEffect(() => {
    let cancelled = false
    let previewer
    let generation = 0
    async function draw() {
      const ticket = ++generation
      const { init } = await import('pptx-preview')
      const bytes = await withoutMissingParts(buffer.slice(0))
      if (cancelled || ticket !== generation || !host.current) return
      await new Promise((resolve) => requestAnimationFrame(resolve))
      if (cancelled || ticket !== generation || !host.current) return
      previewer?.destroy?.()
      host.current.replaceChildren()
      const width = Math.max(host.current.clientWidth, 320)
      const height = Math.max(host.current.clientHeight, 240)
      previewer = init(host.current, { width, height, mode: 'list' })
      await previewer.preview(bytes.slice(0))
      if (cancelled || ticket !== generation || !host.current) return
      if (!host.current.querySelector('.pptx-preview-slide-wrapper')) {
        onFail('The slides could not be shown.')
      }
    }
    draw().catch((err) => {
      if (!cancelled) onFail(err instanceof Error ? err.message : 'The slides could not be shown.')
    })
    const onResize = () => {
      draw().catch(() => {})
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelled = true
      window.removeEventListener('resize', onResize)
      previewer?.destroy?.()
    }
  }, [buffer, onFail])

  return <div className="training-viewer__slides" ref={host} />
}
