import type { LanguageCode } from '@/types'

/**
 * Patient-facing copy. Everything the patient hears or reads is translated;
 * the caregiver console stays in English for now.
 *
 * NOTE: the Hindi / Manipuri / Bengali / Assamese lines are first-pass and should
 * be reviewed by a native speaker before any real deployment.
 *
 * Manipuri (Meiteilon) is written here in Bengali script rather than Meitei Mayek.
 * Meitei Mayek is the official script, but it only returned to schooling in recent
 * decades, so an elderly patient — the only person who ever reads these lines — is far
 * more likely to have learnt to read her language in Bengali script.
 */

export const languageLabel: Record<LanguageCode, string> = {
  en: 'English',
  hi: 'हिन्दी — Hindi',
  mni: 'মৈতৈলোন্ — Manipuri',
  as: 'অসমীয়া — Assamese',
  bn: 'বাংলা — Bengali',
}

/** BCP-47 tags handed to the speech engine, with graceful fallbacks. */
export const speechLocale: Record<LanguageCode, string[]> = {
  en: ['en-IN', 'en-GB', 'en-US'],
  hi: ['hi-IN', 'en-IN'],
  // No browser ships a Manipuri voice. Bengali reads the script correctly and lands
  // close enough on the vowels to stay intelligible, which beats falling silent.
  mni: ['mni-IN', 'bn-IN', 'as-IN', 'hi-IN', 'en-IN'],
  as: ['as-IN', 'bn-IN', 'hi-IN', 'en-IN'],
  bn: ['bn-IN', 'bn-BD', 'hi-IN', 'en-IN'],
}

const strings = {
  greeting: {
    en: 'Hello {name}. Let us play a few gentle games together.',
    hi: 'नमस्ते {name}। चलिए, कुछ आसान खेल खेलते हैं।',
    mni: 'খুরুমজরি {name}। লায়বা শান্নবা খরা পুন্না শান্নসি।',
    as: 'নমস্কাৰ {name}। আহক, কিছুমান সহজ খেল খেলোঁ।',
    bn: 'নমস্কার {name}। চলুন, কিছু সহজ খেলা খেলি।',
  },
  tapPhotoOf: {
    en: 'Tap the picture of your {rel}.',
    hi: 'अपने {rel} की तस्वीर पर टैप कीजिए।',
    mni: 'নহাক্কী {rel}গী ফোটোদা নম্বিয়ু।',
    as: 'আপোনাৰ {rel}ৰ ফটোত টিপক।',
    bn: 'আপনার {rel}-এর ছবিতে চাপ দিন।',
  },
  tapNameOf: {
    en: 'Tap the name of your {rel}.',
    hi: 'अपने {rel} का नाम चुनिए।',
    mni: 'নহাক্কী {rel}গী মিংদা নম্বিয়ু।',
    as: 'আপোনাৰ {rel}ৰ নাম বাছি লওক।',
    bn: 'আপনার {rel}-এর নাম বেছে নিন।',
  },
  tapObject: {
    en: 'Tap the {object}.',
    hi: '{object} पर टैप कीजिए।',
    mni: '{object}দা নম্বিয়ু।',
    as: '{object}ত টিপক।',
    bn: '{object}-এ চাপ দিন।',
  },
  whoseVoice: {
    en: 'Listen. Whose voice is this?',
    hi: 'सुनिए। यह किसकी आवाज़ है?',
    mni: 'তবিয়ু। মসি কনাগী খোন্জেল নো?',
    as: 'শুনক। এইটো কাৰ মাত?',
    bn: 'শুনুন। এটি কার কণ্ঠস্বর?',
  },
  routineFirst: {
    en: 'What do we do first in the morning?',
    hi: 'सुबह सबसे पहले हम क्या करते हैं?',
    mni: 'অয়ুকতা ঐখোয় অহানবা করি তৌই?',
    as: 'ৰাতিপুৱা আমি সকলোৰে আগতে কি কৰোঁ?',
    bn: 'সকালে আমরা সবার আগে কী করি?',
  },
  routineNext: {
    en: 'And what do we do after that?',
    hi: 'उसके बाद हम क्या करते हैं?',
    mni: 'মদুগী মতুংদা ঐখোয় করি তৌই?',
    as: 'তাৰ পিছত আমি কি কৰোঁ?',
    bn: 'তারপর আমরা কী করি?',
  },
  routineSecond: {
    en: 'What do we do second?',
    hi: 'दूसरे नंबर पर हम क्या करते हैं?',
    mni: 'অনীশুবা ওইক্না ঐখোয় করি তৌই?',
    as: 'দ্বিতীয়তে আমি কি কৰোঁ?',
    bn: 'দ্বিতীয় ধাপে আমরা কী করি?',
  },
  routineThird: {
    en: 'What do we do third?',
    hi: 'तीसरे नंबर पर हम क्या करते हैं?',
    mni: 'অহুমশুবা ওইক্না ঐখোয় করি তৌই?',
    as: 'তৃতীয়তে আমি কি কৰোঁ?',
    bn: 'তৃতীয় ধাপে আমরা কী করি?',
  },
  routineLast: {
    en: 'What is the very last thing we do?',
    hi: 'सबसे आखिर में हम क्या करते हैं?',
    mni: 'মথমা ওইক্না ঐখোয় করি তৌই?',
    as: 'একেবাৰে শেষত আমি কি কৰোঁ?',
    bn: 'একদম শেষে আমরা কী করি?',
  },
  teaFirst: {
    en: 'What is the first step to make tea?',
    hi: 'चाय बनाने में सबसे पहले क्या करते हैं?',
    mni: 'চা শেম্বদা অহানবা করি তৌই?',
    as: 'চাহ বনাবলৈ প্ৰথমতে কি কৰোঁ?',
    bn: 'চা বানাতে সবার আগে কী করতে হয়?',
  },
  teaSecond: {
    en: 'What is the second step when making tea?',
    hi: 'चाय बनाने में दूसरा क्या करते हैं?',
    mni: 'চা শেম্বদা অনীশুবা করি তৌই?',
    as: 'চাহ বনাওঁতে দ্বিতীয়তে কি কৰোঁ?',
    bn: 'চা বানাতে দ্বিতীয় ধাপে কী করতে হয়?',
  },
  teaThird: {
    en: 'What is the third step when making tea?',
    hi: 'चाय बनाने में तीसरा क्या करते हैं?',
    mni: 'চা শেম্বদা অহুমশুবা করি তৌই?',
    as: 'চাহ বনাওঁতে তৃতীয়তে কি কৰোঁ?',
    bn: 'চা বানাতে তৃতীয় ধাপে কী করতে হয়?',
  },
  teaLast: {
    en: 'What is the last step when making tea?',
    hi: 'चाय बनाने में सबसे आखिर में क्या करते हैं?',
    mni: 'চা শেম্বদা মথৌ করি তৌই?',
    as: 'চাহ বনাওঁতে শেষত কি কৰোঁ?',
    bn: 'চা বানাতে শেষ ধাপে কী করতে হয়?',
  },
  teaAfterBoil: {
    en: 'After boiling water, what do we add to the tea?',
    hi: 'पानी उबालने के बाद, चाय में क्या डालते हैं?',
    mni: 'ইশিং ফোৎপার মতুংদা, চাদা করি হাপ্পি?',
    as: 'পানী উতলোৱাৰ পিছত, চাহত কি দিওঁ?',
    bn: 'জল ফোটানোর পর, চায়ে কী দিতে হয়?',
  },
  teaNext: {
    en: 'And what do we do next for tea?',
    hi: 'उसके बाद क्या करते हैं?',
    mni: 'মদুগী মতুংদা করি হাপ্পি?',
    as: 'তাৰ পিছত কি কৰোঁ?',
    bn: 'তারপর কী করতে হয়?',
  },
  rememberWho: {
    en: 'Who was there with you?',
    hi: 'आपके साथ वहाँ कौन था?',
    mni: 'নহাক্কা মদোদা করি লৈমিনখি?',
    as: 'আপোনাৰ লগত তাতে কোন আছিল?',
    bn: 'আপনার সঙ্গে সেখানে কে ছিলো?',
  },
  patternNext: {
    en: 'Look at the pattern. What comes next?',
    hi: 'पैटर्न देखिए। आगे क्या आएगा?',
    mni: 'পেতর্ন অসি য়েংবিয়ু। মতুংদা করি লাক্কনি?',
    as: 'পেটাৰ্নটো চাওক। ইয়াৰ পিছত কি আহিব?',
    bn: 'প্যাটার্নটি দেখুন। এরপরে কোনটি আসবে?',
  },
  whatNext: {
    en: 'What next?',
    hi: 'आगे क्या?',
    mni: 'মতুংদা করি?',
    as: 'পিছত কি?',
    bn: 'এরপরে কি?',
  },
  correct: {
    en: 'Yes! That is right.',
    hi: 'हाँ! बिलकुल सही।',
    mni: 'হোয়! মদু অচুম্বনি।',
    as: 'হয়! একেবাৰে শুদ্ধ।',
    bn: 'হ্যাঁ! ঠিক বলেছেন।',
  },
  praise: {
    en: 'Very good.',
    hi: 'बहुत अच्छा।',
    mni: 'য়াম্না ফরে।',
    as: 'বৰ ভাল।',
    bn: 'খুব ভালো।',
  },
  gentlePerson: {
    en: 'That is okay. This is {answer}.',
    hi: 'कोई बात नहीं। यह {answer} हैं।',
    mni: 'করিসু নত্তে। মসি {answer}নি।',
    as: 'কোনো কথা নাই। এইজন {answer}।',
    bn: 'কোনো অসুবিধা নেই। এটি {answer}।',
  },
  gentleThing: {
    en: 'That is okay. This one is the {answer}.',
    hi: 'कोई बात नहीं। यह {answer} है।',
    mni: 'করিসু নত্তে। মসি {answer} অসিনি।',
    as: 'কোনো কথা নাই। এইটো {answer}।',
    bn: 'কোনো অসুবিধা নেই। এটি {answer}।',
  },
  moveOn: {
    en: 'Let us try another one.',
    hi: 'चलिए, एक और देखते हैं।',
    mni: 'অতোপ্পা অমা য়েংসি।',
    as: 'আহক, আৰু এটা চাওঁ।',
    bn: 'চলুন, আরেকটি দেখি।',
  },
  completion: {
    en: 'Great job today!',
    hi: 'आज बहुत अच्छा किया!',
    mni: 'ঙসি য়াম্না ফনা তৌরে!',
    as: 'আজি বৰ ভাল কৰিলে!',
    bn: 'আজ দুর্দান্ত করেছেন!',
  },
  completionSub: {
    en: 'You did wonderfully.',
    hi: 'आपने कमाल किया।',
    mni: 'নহাক্না য়াম্না ফনা তৌখ্রে।',
    as: 'আপুনি অতি ভাল কৰিলে।',
    bn: 'আপনি অসাধারণ করেছেন।',
  },
  hearAgain: {
    en: 'Hear again',
    hi: 'फिर सुनिए',
    mni: 'অমুক হন্না তবিয়ু',
    as: 'আকৌ শুনক',
    bn: 'আবার শুনুন',
  },
  playVoice: {
    en: 'Play the voice',
    hi: 'आवाज़ सुनिए',
    mni: 'খোন্জেল তবিয়ু',
    as: 'মাত শুনক',
    bn: 'কণ্ঠস্বর শুনুন',
  },
} as const

export type StringKey = keyof typeof strings

export function t(lang: LanguageCode, key: StringKey, vars: Record<string, string> = {}): string {
  const row = strings[key] as Record<LanguageCode, string>
  const template = row[lang] ?? row.en
  return template.replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? '')
}
