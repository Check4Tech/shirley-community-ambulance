import TrainingSection from './TrainingSection'

export default function MembersTrainings() {
  return (
    <section className="section members-panel">
      <div className="wrap">
        <header className="members-panel__head">
          <p className="eyebrow">Members area</p>
          <h1>Trainings</h1>
          <p className="lead">Training files and assignments for every member.</p>
        </header>
        <div className="student-panel">
          <h2>Training</h2>
          <TrainingSection active everyone />
        </div>
      </div>
    </section>
  )
}
