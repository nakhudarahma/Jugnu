import type { CognitiveDomain, LanguageCode, Memory, Person, PersonalizationLevel } from '@/types'
import { objects, relationshipWord, routineSteps, teaRoutineSteps, wordFor } from '@/lib/lexicon'
import { t } from '@/lib/i18n'

export type ActivityKind = 'personRecall' | 'objectFind' | 'routineSequence' | 'patternRecall' | 'voiceRecall' | 'memoryRecall' | 'confirm'

export interface ChoiceOption {
  id: string
  /** Word or name shown on the tile — already translated where relevant. */
  label: string
  /** Illustration key for generic artwork. */
  art?: string
  person?: Person
  correct: boolean
}

export interface ActivityStep {
  id: string
  kind: ActivityKind
  domain: CognitiveDomain
  /** Fully resolved sentence: spoken first, shown second. */
  prompt: string
  options: ChoiceOption[]
  /** Used by the gentle correction line. */
  answerLabel: string
  answerIsPerson: boolean
  /** Level 1 shows large name/word buttons instead of pictures. */
  wordTiles: boolean
  /** Sequencing: the ids in the order they should be tapped. */
  orderedIds?: string[]
  followUpPrompt?: string
  /** Voice recall plays this person's recording. */
  voicePerson?: Person
  /** Visual sequence preview shown for pattern recall activities. */
  patternPreview?: { art: string; label: string }[]
}

interface BuildArgs {
  people: Person[]
  memories: Memory[]
  language: LanguageCode
  level: PersonalizationLevel
  game?: string | null
  /** This patient's own morning routine (ordered lexicon slugs), recorded by the caregiver. */
  morningRoutine?: string[]
}

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const pick = <T,>(items: T[], n: number): T[] => shuffle(items).slice(0, n)

let stepSeq = 0
const stepId = (kind: string) => `${kind}_${(stepSeq += 1)}`

function personOption(person: Person, correct: boolean, wordTiles: boolean): ChoiceOption {
  return { id: person.id, label: person.name, person: wordTiles ? undefined : person, correct }
}

// ---------------------------------------------------------------------------
// Game 1: Object Find — 5 rounds with unique targets
// ---------------------------------------------------------------------------

/** One round: find the target object among 3 choices. */
function objectFindRound(args: BuildArgs, usedSlugs: Set<string>): ActivityStep | null {
  const available = objects.filter((o) => !usedSlugs.has(o.slug))
  if (available.length < 3) return null
  const [target, ...pool] = shuffle(available)
  usedSlugs.add(target.slug)
  const distractors = pool.slice(0, 2)
  const wordTiles = false
  const label = (o: typeof target) => wordFor(o.names, args.language, o.slug)
  return {
    id: stepId('object'),
    kind: 'objectFind',
    domain: 'attention',
    prompt: t(args.language, 'tapObject', { object: label(target) }),
    options: shuffle([
      { id: target.slug, label: label(target), art: wordTiles ? undefined : target.art, correct: true },
      ...distractors.map((o) => ({ id: o.slug, label: label(o), art: wordTiles ? undefined : o.art, correct: false })),
    ]),
    answerLabel: label(target),
    answerIsPerson: false,
    wordTiles,
  }
}

/** 5 rounds of object-find with distinct targets. */
function buildObjectFind(args: BuildArgs): ActivityStep[] {
  const used = new Set<string>()
  const steps: ActivityStep[] = []
  for (let i = 0; i < 5; i++) {
    const step = objectFindRound(args, used)
    if (step) steps.push(step)
  }
  return steps
}

// ---------------------------------------------------------------------------
// Game 2: Routine Sequencing — 5 single-answer tea questions
// ---------------------------------------------------------------------------
// Each question focuses on one position in the 4-step tea sequence.
// This is simpler and more elder-friendly than the all-at-once ordering task.

function buildRoutineSequence(args: BuildArgs): ActivityStep[] {
  const lang = args.language
  const steps = teaRoutineSteps // boil → leaves → milk → pour (4 steps)

  const makeQ = (
    promptKey: 'teaFirst' | 'teaSecond' | 'teaThird' | 'teaLast' | 'teaAfterBoil',
    correctSlug: string,
  ): ActivityStep => {
    const correct = steps.find((s) => s.slug === correctSlug)!
    const distractors = pick(steps.filter((s) => s.slug !== correctSlug), 2)
    return {
      id: stepId('routine'),
      kind: 'routineSequence',
      domain: 'memory',
      prompt: t(lang, promptKey),
      options: shuffle([
        { id: correct.slug, label: wordFor(correct.names, lang, correct.slug), art: correct.art, correct: true },
        ...distractors.map((s) => ({
          id: s.slug,
          label: wordFor(s.names, lang, s.slug),
          art: s.art,
          correct: false,
        })),
      ]),
      answerLabel: wordFor(correct.names, lang, correct.slug),
      answerIsPerson: false,
      wordTiles: false,
    }
  }

  return [
    makeQ('teaFirst', 'boil'),      // Q1: What comes first?
    makeQ('teaSecond', 'leaves'),   // Q2: What comes second?
    makeQ('teaAfterBoil', 'leaves'),// Q3: After boiling water, what next?
    makeQ('teaThird', 'milk'),      // Q4: What is the third step?
    makeQ('teaLast', 'pour'),       // Q5: What is the last step?
  ]
}

// ---------------------------------------------------------------------------
// Game 3: Pattern Recall — 5 rounds with different patterns
// ---------------------------------------------------------------------------

const candidatePairs: [string, string][] = [
  ['sun', 'flower'],
  ['kettle', 'cup'],
  ['basket', 'mango'],
  ['umbrella', 'sun'],
  ['key', 'clock'],
]

function patternRecallRound(args: BuildArgs, pairIndex: number): ActivityStep {
  const lang = args.language
  const [aSlug, bSlug] = shuffle([...candidatePairs[pairIndex]])

  const objA = objects.find((o) => o.slug === aSlug) ?? objects[0]
  const objB = objects.find((o) => o.slug === bSlug) ?? objects[1]

  const labelA = wordFor(objA.names, lang, objA.slug)
  const labelB = wordFor(objB.names, lang, objB.slug)

  const patternPreview = [
    { art: objA.art, label: labelA },
    { art: objB.art, label: labelB },
    { art: objA.art, label: labelA },
  ]

  const answer: ChoiceOption = { id: objB.slug, label: labelB, art: objB.art, correct: true }
  const distractors = pick(
    objects.filter((o) => o.slug !== objA.slug && o.slug !== objB.slug),
    2,
  ).map((d) => ({
    id: d.slug,
    label: wordFor(d.names, lang, d.slug),
    art: d.art,
    correct: false,
  }))

  return {
    id: stepId('pattern'),
    kind: 'patternRecall',
    domain: 'attention',
    prompt: t(lang, 'patternNext'),
    options: shuffle([answer, ...distractors]),
    answerLabel: labelB,
    answerIsPerson: false,
    wordTiles: false,
    patternPreview,
  }
}

function buildPatternRecall(args: BuildArgs): ActivityStep[] {
  // 5 rounds: cycle through the 5 candidate pairs in shuffled order
  return shuffle([0, 1, 2, 3, 4]).map((i) => patternRecallRound(args, i))
}

// ---------------------------------------------------------------------------
// Person Recall — auxiliary (kept for the single-game override; not in the Level 2 lineup)
// ---------------------------------------------------------------------------

function personRecallRound(args: BuildArgs, target: Person): ActivityStep | null {
  const { people, language: lang } = args
  const family = people.filter((p) => !p.isPatient)
  const distractors = pick(
    family.filter((p) => p.id !== target.id),
    2,
  )
  if (!distractors.length) return null
  const wordTiles = false
  const rel = relationshipWord(target.relationship, lang)
  return {
    id: stepId('person'),
    kind: 'personRecall',
    domain: 'recognition',
    prompt: t(lang, wordTiles ? 'tapNameOf' : 'tapPhotoOf', { rel }),
    options: shuffle([personOption(target, true, wordTiles), ...distractors.map((p) => personOption(p, false, wordTiles))]),
    answerLabel: target.name,
    answerIsPerson: true,
    wordTiles,
  }
}

function buildPersonRecall(args: BuildArgs): ActivityStep[] {
  const family = args.people.filter((p) => !p.isPatient)
  if (family.length < 2) return []
  // One question per family member (capped at 5) — never the same face twice.
  const targets = shuffle(family).slice(0, 5)
  const steps: ActivityStep[] = []
  for (const target of targets) {
    steps.push(personRecallRound({ ...args }, target)!)
  }
  return steps
}

// ---------------------------------------------------------------------------
// Game 4: Who's Calling? (Voice Recall) — up to 5 rounds (one per person with a voice note)
// ---------------------------------------------------------------------------

function buildVoiceRecall(args: BuildArgs): ActivityStep[] {
  const { people, language: lang } = args
  const withVoice = people.filter((p) => !p.isPatient && p.voiceNote)
  if (!withVoice.length) return []
  // One distinct question per recorded person (capped at 5) — never the same voice twice.
  const targets = shuffle(withVoice).slice(0, 5)
  const steps: ActivityStep[] = []
  for (const target of targets) {
    const others = pick(
      people.filter((p) => !p.isPatient && p.id !== target.id),
      2,
    )
    steps.push({
      id: stepId('voice'),
      kind: 'voiceRecall' as ActivityKind,
      domain: 'recognition' as CognitiveDomain,
      prompt: t(lang, 'whoseVoice'),
      options: shuffle([personOption(target, true, false), ...others.map((p) => personOption(p, false, false))]),
      answerLabel: target.name,
      answerIsPerson: true,
      wordTiles: false,
      voicePerson: target,
    })
  }
  return steps
}

// ---------------------------------------------------------------------------
// Game 5: Remember When — 5 rounds, each built from a real recorded memory
// ---------------------------------------------------------------------------
// The caregiver's recorded anecdote is spoken first, then the patient picks the
// person who was part of it. Actively reactivates a real memory, not just a face.
function buildMemoryRecall(args: BuildArgs): ActivityStep[] {
  const { memories, people, language: lang } = args
  const family = people.filter((p) => !p.isPatient)
  const usable = memories.filter(
    (m) => m.usableInActivities && m.personId && family.some((f) => f.id === m.personId),
  )
  if (!usable.length) return []
  // One question per distinct memory (capped at 5) — never the same story twice.
  const targets = shuffle(usable).slice(0, 5)
  const steps: ActivityStep[] = []
  for (const memory of targets) {
    const person = family.find((f) => f.id === memory.personId)!
    const distractors = pick(
      family.filter((f) => f.id !== person.id),
      2,
    )
    const story = memory.description.trim()
    steps.push({
      id: stepId('memory'),
      kind: 'memoryRecall' as ActivityKind,
      domain: 'memory' as CognitiveDomain,
      prompt: story ? `${story} ${t(lang, 'rememberWho')}` : t(lang, 'rememberWho'),
      options: shuffle([personOption(person, true, false), ...distractors.map((p) => personOption(p, false, false))]),
      answerLabel: person.name,
      answerIsPerson: true,
      wordTiles: false,
      followUpPrompt: t(lang, 'rememberWho'),
    })
  }
  return steps
}

// ---------------------------------------------------------------------------
// Game 6: My Daily Routine (Personalized) — 5 single-answer questions
// ---------------------------------------------------------------------------
// Same mechanic as the generic routine, but built from THIS patient's own
// morning routine (recorded by the caregiver) instead of the tea example.

function buildPersonalRoutine(args: BuildArgs): ActivityStep[] {
  const lang = args.language
  const slugs =
    args.morningRoutine && args.morningRoutine.length >= 3
      ? args.morningRoutine
      : routineSteps.map((s) => s.slug)
  const steps = slugs
    .map((slug) => routineSteps.find((s) => s.slug === slug))
    .filter((s): s is (typeof routineSteps)[number] => Boolean(s))
  if (steps.length < 3) return []

  const makeQ = (
    promptKey: 'routineFirst' | 'routineSecond' | 'routineThird' | 'routineNext' | 'routineLast',
    correct: (typeof routineSteps)[number],
  ): ActivityStep | null => {
    const distractors = pick(steps.filter((s) => s.slug !== correct.slug), 2)
    if (distractors.length < 2) return null
    return {
      id: stepId('routine'),
      kind: 'routineSequence',
      domain: 'memory',
      prompt: t(lang, promptKey),
      options: shuffle([
        { id: correct.slug, label: wordFor(correct.names, lang, correct.slug), art: correct.art, correct: true },
        ...distractors.map((s) => ({
          id: s.slug,
          label: wordFor(s.names, lang, s.slug),
          art: s.art,
          correct: false,
        })),
      ]),
      answerLabel: wordFor(correct.names, lang, correct.slug),
      answerIsPerson: false,
      wordTiles: false,
    }
  }

  const q1 = makeQ('routineFirst', steps[0])
  const q2 = makeQ('routineSecond', steps[1] ?? steps[steps.length - 1])
  const q3 = makeQ('routineThird', steps[2] ?? steps[steps.length - 1])
  const q4 = makeQ('routineNext', steps[3] ?? steps[steps.length - 1])
  const q5 = makeQ('routineLast', steps[steps.length - 1])
  return [q1, q2, q3, q4, q5].filter((q): q is ActivityStep => Boolean(q))
}

// ---------------------------------------------------------------------------
// Confirm step (gentle correction — cannot be failed)
// ---------------------------------------------------------------------------

/**
 * A one-tile step inserted straight after a wrong answer: it cannot be failed, so the
 * patient never meets two failures in a row and a session never ends on one.
 */
export function buildConfirmStep(previous: ActivityStep, language: LanguageCode): ActivityStep {
  const answer = previous.options.find((o) => o.correct) ?? previous.options[0]
  const sentence = previous.answerIsPerson
    ? t(language, 'tapPhotoOf', { rel: answer.label })
    : t(language, 'tapObject', { object: answer.label })
  return {
    id: stepId('confirm'),
    kind: 'confirm',
    domain: previous.domain,
    prompt: sentence,
    options: [{ ...answer, correct: true }],
    answerLabel: answer.label,
    answerIsPerson: previous.answerIsPerson,
    wordTiles: previous.wordTiles,
  }
}

// ---------------------------------------------------------------------------
// Build Plan
// ---------------------------------------------------------------------------

/**
 * Today's plan — each game now contributes 5 questions.
 *
 * Level 1 (Generic — zero setup):
 *   Game 1: Object Find            × 5
 *   Game 2: Routine Sequencing     × 5
 *   Game 3: Pattern Recall         × 5
 *
 * Level 2 (Personalized — family voices, memories, her own routine):
 *   Game 4: Who's Calling?         × 5
 *   Game 5: Remember When          × 5
 *   Game 6: My Daily Routine       × 5
 */
export function buildPlan(args: BuildArgs): ActivityStep[] {
  // Individual game overrides — still 5 questions each
  if (args.game === 'object_match' || args.game === 'object') return buildObjectFind(args)
  if (args.game === 'routine_sequencing' || args.game === 'routine') {
    return args.level === 2 ? buildPersonalRoutine(args) : buildRoutineSequence(args)
  }
  if (args.game === 'pattern_recall' || args.game === 'pattern') return buildPatternRecall(args)
  if (args.game === 'whos_calling' || args.game === 'voice') {
    const v = buildVoiceRecall(args)
    if (v.length) return v
  }
  if (args.game === 'person_recall' || args.game === 'family') {
    const p = buildPersonRecall(args)
    if (p.length) return p
  }
  if (args.game === 'memory_recall' || args.game === 'memory') {
    const m = buildMemoryRecall(args)
    if (m.length) return m
  }

  // Full session
  if (args.level === 1 || args.level === 0) {
    return [...buildObjectFind(args), ...buildRoutineSequence(args), ...buildPatternRecall(args)]
  }

  // Level 2: personalized — her own voices, memories and morning routine
  return [...buildVoiceRecall(args), ...buildMemoryRecall(args), ...buildPersonalRoutine(args)]
}

/**
 * Count the number of distinct game modules in a plan (not raw steps).
 * Used to record `activityCount` in the session — "Maa did 3 activities today".
 */
export function countGames(plan: ActivityStep[]): number {
  const seen = new Set<string>()
  for (const step of plan) {
    if (step.kind !== 'confirm') seen.add(step.kind)
  }
  return seen.size
}
