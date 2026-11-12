import assert from 'node:assert/strict'
import test from 'node:test'
import { completionUserIds, idsInPicker, selectionAfterToggleAll, userIdsOnTraining } from './trainingPeople.js'

const people = [
  { id: 1, name: 'Avery' },
  { id: 2, name: 'Blair' },
  { id: 3, name: 'Casey' },
]

test('a new assign starts with everyone already on that training checked', () => {
  const resource = { id: 9 }
  const assignments = [
    {
      id: 40,
      resources: [{ id: 9 }],
      completions: [
        { userId: 1, completed: true },
        { userId: 2, completed: false },
      ],
    },
    {
      id: 41,
      resources: [{ id: 9 }],
      completions: [{ userId: 3, completed: false }],
    },
    {
      id: 42,
      resources: [{ id: 8 }],
      completions: [{ userId: 4, completed: false }],
    },
  ]
  assert.deepEqual(idsInPicker(userIdsOnTraining(resource, assignments), people), [1, 2, 3])
  assert.deepEqual(idsInPicker(userIdsOnTraining(resource, assignments), people).includes(4), false)
})

test('edit starts with the people on that assignment', () => {
  const assignment = {
    id: 40,
    resources: [{ id: 9 }],
    completions: [
      { userId: 2, completed: false },
      { userId: 2, completed: false },
      { userId: 9, completed: true },
    ],
  }
  assert.deepEqual(idsInPicker(completionUserIds(assignment), people), [2])
})

test('clearing select all drops people who started checked', () => {
  assert.deepEqual(idsInPicker([1, 2], people), [1, 2])
  assert.deepEqual(selectionAfterToggleAll(true, people), [1, 2, 3])
  assert.deepEqual(selectionAfterToggleAll(false, people), [])
})
