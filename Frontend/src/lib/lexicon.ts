import type { LanguageCode } from '@/types'

/** Translated words used inside patient activities. First-pass translations. */
type Names = Record<LanguageCode, string>

export interface LexObject {
  slug: string
  /** Key into the illustration set in components/illustrations. */
  art: string
  names: Names
}

export const objects: LexObject[] = [
  { slug: 'cup', art: 'cup', names: { en: 'cup', hi: 'कप', mni: 'কপ', as: 'কাপ', bn: 'কাপ' } },
  { slug: 'flower', art: 'flower', names: { en: 'flower', hi: 'फूल', mni: 'লেই', as: 'ফুল', bn: 'ফুল' } },
  { slug: 'sun', art: 'sun', names: { en: 'sun', hi: 'सूरज', mni: 'নুমিৎ', as: 'সূৰ্য', bn: 'সূর্য' } },
  { slug: 'key', art: 'key', names: { en: 'key', hi: 'चाबी', mni: 'চাবী', as: 'চাবি', bn: 'চাবি' } },
  { slug: 'clock', art: 'clock', names: { en: 'clock', hi: 'घड़ी', mni: 'পুংফম', as: 'ঘড়ী', bn: 'ঘড়ি' } },
  { slug: 'glasses', art: 'glasses', names: { en: 'glasses', hi: 'चश्मा', mni: 'চশমা', as: 'চশমা', bn: 'চশমা' } },
  { slug: 'umbrella', art: 'umbrella', names: { en: 'umbrella', hi: 'छाता', mni: 'ছত্রী', as: 'ছাতা', bn: 'ছাতা' } },
  { slug: 'kettle', art: 'kettle', names: { en: 'kettle', hi: 'केतली', mni: 'কেৎলি', as: 'কেটলি', bn: 'কেটলি' } },
  { slug: 'basket', art: 'basket', names: { en: 'basket', hi: 'टोकरी', mni: 'লুখাক', as: 'টুকৰি', bn: 'ঝুড়ি' } },
  { slug: 'mango', art: 'mango', names: { en: 'mango', hi: 'आम', mni: 'হেইনো', as: 'আম', bn: 'আম' } },
]

/** Relationship words, keyed by the English relationship stored on a Person. */
export const relationshipNames: Record<string, Names> = {
  son: { en: 'son', hi: 'बेटे', mni: 'মচানুপা', as: 'পুত্ৰ', bn: 'ছেলে' },
  daughter: { en: 'daughter', hi: 'बेटी', mni: 'মচানুপী', as: 'জীয়ৰী', bn: 'মেয়ে' },
  husband: { en: 'husband', hi: 'पति', mni: 'মপুরোইবা', as: 'স্বামী', bn: 'স্বামী' },
  wife: { en: 'wife', hi: 'पत्नी', mni: 'মপুরোইবী', as: 'পত্নী', bn: 'স্ত্রী' },
  brother: { en: 'brother', hi: 'भाई', mni: 'তমো', as: 'ককাই', bn: 'ভাই' },
  sister: { en: 'sister', hi: 'बहन', mni: 'ইচে', as: 'ভনী', bn: 'বোন' },
  grandson: { en: 'grandson', hi: 'पोते', mni: 'নাতি', as: 'নাতি', bn: 'নাতি' },
  granddaughter: { en: 'granddaughter', hi: 'पोती', mni: 'নাতিনী', as: 'নাতিনী', bn: 'নাতনি' },
  nephew: { en: 'nephew', hi: 'भतीजे', mni: 'ইনাও মচা', as: 'ভতিজা', bn: 'ভাইপো' },
  neighbour: { en: 'neighbour', hi: 'पड़ोसी', mni: 'য়ুম্লোন', as: 'চুবুৰীয়া', bn: 'প্রতিবেশী' },
}

export interface LexRoutineStep {
  slug: string
  art: string
  /** Canonical morning order, used by the sequencing activity. */
  order: number
  names: Names
}

export const routineSteps: LexRoutineStep[] = [
  {
    slug: 'wake',
    art: 'sun',
    order: 1,
    names: { en: 'Wake up', hi: 'उठना', mni: 'হৌগৎপা', as: 'সাৰ পোৱা', bn: 'ঘুম থেকে ওঠা' },
  },
  {
    slug: 'brush',
    art: 'brush',
    order: 2,
    names: { en: 'Brush teeth', hi: 'दाँत साफ़ करना', mni: 'য়া ব্রাশ তৌবা', as: 'দাঁত ব্ৰাছ কৰা', bn: 'দাঁত ব্রাশ করা' },
  },
  {
    slug: 'tea',
    art: 'cup',
    order: 3,
    names: { en: 'Morning tea', hi: 'सुबह की चाय', mni: 'অয়ুক্কী চা', as: 'ৰাতিপুৱাৰ চাহ', bn: 'সকালের চা' },
  },
  {
    slug: 'medicine',
    art: 'medicine',
    order: 4,
    names: { en: 'Take medicine', hi: 'दवा लेना', mni: 'হিদাক চাবা', as: 'ঔষধ খোৱা', bn: 'ওষুধ খাওয়া' },
  },
  {
    slug: 'breakfast',
    art: 'plate',
    order: 5,
    names: { en: 'Eat breakfast', hi: 'नाश्ता करना', mni: 'অয়ুক্কী চাক চাবা', as: 'জলপান খোৱা', bn: 'জলখাবার খাওয়া' },
  },
]

/** The classic, culturally universal tea-making sequence (Making tea). */
export const teaRoutineSteps: LexRoutineStep[] = [
  {
    slug: 'boil',
    art: 'kettle',
    order: 1,
    names: { en: 'Boil water', hi: 'पानी उबालना', mni: 'ইশিং ফোৎপা', as: 'পানী উতলোৱা', bn: 'জল ফোটানো' },
  },
  {
    slug: 'leaves',
    art: 'leaves',
    order: 2,
    names: { en: 'Add tea leaves', hi: 'चायपत्ती डालना', mni: 'চা-নাফন হাপ্পা', as: 'চাহপাত দিয়া', bn: 'চা পাতা দেওয়া' },
  },
  {
    slug: 'milk',
    art: 'milk',
    order: 3,
    names: { en: 'Add milk', hi: 'दूध मिलाना', mni: 'শঙ্গোম হাপ্পা', as: 'গাখীৰ দিয়া', bn: 'দুধ মেশানো' },
  },
  {
    slug: 'pour',
    art: 'cup',
    order: 4,
    names: { en: 'Pour tea', hi: 'चाय छानना', mni: 'চা খাইবা', as: 'চাহ বাকি দিয়া', bn: 'চা ঢালা' },
  },
]


export function wordFor(names: Names | undefined, lang: LanguageCode, fallback = ''): string {
  if (!names) return fallback
  return names[lang] ?? names.en ?? fallback
}

export function relationshipWord(relationship: string, lang: LanguageCode): string {
  const key = relationship.trim().toLowerCase()
  return wordFor(relationshipNames[key], lang, relationship)
}
