# Jugnu

Cognitive gaming and memory assistance for people living with dementia — and for the family
around them.

Jugnu is built on one rule: **the caregiver manages, the patient experiences.** Everything a
caregiver needs to set up, watch over and share the day lives behind the caregiver layers. What
the patient sees is one calm activity at a time — voice first, no menus, no navigation, no
scores, and no way to fail.

This repository is the **frontend only**. There is no backend, no database and no API: the whole
product runs in the browser on seeded demo data held in React state and persisted to
`localStorage`. Every interaction — sessions, voice, games, forms, modals, the long-press exit,
the PIN screen, reminders, approvals, invites, settings — actually works.

## Running it

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173. To try it on a tablet on the same wifi, run
`npm run dev -- --host` and open the network URL it prints.

```bash
npm run build
```

`npm run build` typechecks with `tsc --noEmit` first, then produces `dist/`. `npm run preview`
serves that build.

## The four layers

Jugnu has no sign-in or sign-up screen. The app opens on the primary caregiver's own device, as
her. To look at the product through another pair of eyes, use the small profile icon in the
header → **Viewing Jugnu as**. That switch is a demo affordance, not authentication.

| Layer | Who | What they get |
| --- | --- | --- |
| 1 | **Meena** — Daughter, primary caregiver | The full daily command center: activity, reminders, trends, change signal, her own mood, quick actions, all settings |
| 2 | **Kamala** — Day helper | The same design language, narrowed: only her assigned reminders and the memories shared with her. Anything she cannot do is hidden or clearly disabled *before* she taps it |
| 3 | **Rahul** — Son, family | A warmer, contribution-only home. He can share memories and see whether they were used. He never sees her activity screens, her routine or how she is progressing |
| 0 | **Asha** — 72, the patient | One activity. Voice first. No navigation, no settings, no exit, no score |

Demo PINs: Meena `1234`, Kamala `5678`, Rahul `4321`.

## Demo walkthrough

1. **Start on Meena's dashboard.** The header says *Maa's Progress* with today's date. Below it, in
   this fixed order: today's activity, reminder status ("2 of 3 reminders completed"), cognitive
   trends, the change signal, her mood, quick actions. Settings are not on the dashboard — they
   live behind the profile icon.
2. **Read the trends.** Memory ↑ Improving, Attention ↓ Declining, Recognition → Stable. There are
   no percentages or scores anywhere, and the comparison is always against Asha's own baseline —
   never against another person.
3. **Read the change signal.** The seeded history raises one: *"Attention trend declining over last
   4 sessions"*, with *"This describes a change in activity results, not a diagnosis"* and *Review
   suggested*. With no history it reads *"No current flag raised"* — never "All good".
4. **Tap Start Activity.** A handoff screen appears — *"Handing over to Maa…"* — while the voice
   begins. Hand the tablet over.
5. **Play as Asha.** Each step is spoken first in Hindi, then shown. Tap the right tile and the
   feedback is warm. Tap a wrong one and nothing punishes her: *"That is okay. This is Rahul."* The
   answer is revealed, and the next step is a single-tile step she cannot fail — so she never meets
   two failures in a row, and a session never ends on one.
6. **Finish the session.** *"Great job today!"* stays on screen indefinitely. Nothing auto-navigates
   away, and no mood check-in interrupts her.
7. **Come back as the caregiver.** Press and hold the **top-right corner** for three seconds. There
   is no icon or hint there. The PIN screen appears; a wrong PIN stays put with gentle feedback and
   reveals nothing about what is behind it. Enter `1234`.
8. **Answer the mood check-in.** It appears only here, on caregiver re-entry — never at the end of
   Asha's session.
9. **Record a memory.** Quick actions → Record a Memory. Add a title, pick or create a person,
   write the story, choose a photo, record or type a voice note, and mark it usable in her
   activities.
10. **Switch to Rahul (layer 3).** Profile icon → Viewing Jugnu as → Rahul. His home is warmer and
    offers one action: share a memory. What he sends arrives as *Waiting for approval* — he cannot
    approve his own contribution, and there are no caregiver analytics on his screen.
11. **Switch to Kamala (layer 2).** She sees only the reminders assigned to her and the two memories
    shared with her. Restricted areas are locked up front, with a short note explaining why —
    never a permission error after the fact.
12. **Turn personalization down.** As Meena: profile icon → Personalization. Level 2 uses real
    photos, names and family voices; Level 1 uses large name and word buttons; Level 0 is entirely
    generic — no personal content reaches the patient screen at all. Start an activity after each
    change to see the difference.

Settings → Reset demo data puts everything back.

## How it is put together

```
src/
  App.tsx              routes, plus the capability guard that redirects instead of erroring
  main.tsx             entry point
  components/
    caregiver/         dashboard cards, header, profile menu, mood check-in
    patient/           handoff, activity view, choice tiles, completion, hidden corner, PIN
    ui/                buttons, cards, forms, modal, icons, portraits, illustrations
  data/seed.ts         Asha, her family, memories, reminders, trend history, moods
  hooks/               useLongPress (3s), useSpeaking
  lib/
    capabilities.ts    what each layer may do — the single source of permission truth
    voice.ts           speech singleton; always fires onEnd, even without TTS
    trends.ts          baseline-relative directions and the change signal
    i18n.ts, lexicon   English, Hindi, Marathi, Assamese, Bengali strings and activity words
  screens/             the nine screens
  session/
    plan.ts            builds today's steps for the active personalization level
    useSessionEngine   the handoff → activity → feedback → complete machine
  state/               reducer, context, personalization service, localStorage persistence
```

A few decisions worth knowing:

- **Permissions are structural, not defensive.** `capabilities.ts` decides what a layer may do;
  routes wrap in a guard that quietly redirects, and screens hide or disable what is not
  available. A helper never taps something and then gets told off.
- **"Never two failures in a row" is guaranteed by construction.** A wrong answer inserts a
  one-tile confirm step, so the shape of the plan makes the rule true rather than a check
  remembering to enforce it.
- **Scores exist but are never shown.** `domainScores` drives trend direction internally and is
  never rendered as a number to anybody.
- **Voice leads, the screen follows.** `voice.speak()` resolves through a safety-net timeout and a
  timing fallback when the browser has no speech synthesis, so a session never stalls waiting for
  audio that will not arrive.

## Accessibility

Semantic HTML with ARIA where roles are not implicit, full keyboard operation, visible focus,
targets sized for unsteady hands, contrast that holds at low vision, state never carried by colour
alone, and `prefers-reduced-motion` respected throughout. The patient layer is designed
tablet-first.

## What is mocked

Photos become object URLs in the browser. Voice notes use `MediaRecorder` when the microphone is
available and fall back to a typed transcript spoken by the browser's voice when it is not.
Invites are recorded locally and never sent. Nothing leaves the device.
