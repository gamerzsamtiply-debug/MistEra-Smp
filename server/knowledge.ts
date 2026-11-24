// Verified facts about MistEra SMP and its team. They are published as schema.org JSON-LD (invisible to visitors, read
// by Google and AI assistants), in /llms.txt, and as a plain-text paragraph on /staff, so every reader gets the same
// information. Edit this file when the team changes. Keep every statement TRUE: search engines compare structured
// data with the visible page, and wrong or hidden-only claims can get a site penalised.

export const SERVER_FULL_NAME = 'MistEra SMP Season 2';
export const SERVER_SUMMARY =
  'MistEra SMP (Season 2) is a dedicated, 24/7, whitelist-only Minecraft Bedrock Edition survival server from Bangladesh.';

export interface KnownPerson {
  /** Main display name. */
  name: string;
  /** Other names people search for. */
  aliases: string[];
  /** Role title shown in structured data. */
  role: string;
  /** Plain, factual description (also the FAQ answer). */
  description: string;
  /** Questions this person should answer. */
  questions: string[];
}

export const PEOPLE: KnownPerson[] = [
  {
    name: 'Omar Faruk',
    aliases: ['MrKidzz', 'Mr Kidzz', 'MrKidzz MistEra'],
    role: 'Owner',
    description:
      'Omar Faruk, also known as MrKidzz, is the owner of MistEra SMP, the dedicated 24/7 whitelisted Minecraft Bedrock server from Bangladesh.',
    questions: ['Who is Omar Faruk in MistEra?', 'Who is MrKidzz in MistEra?', 'Who is the owner of MistEra SMP?', 'Who owns MistEra SMP?'],
  },
  {
    name: 'kelausking',
    aliases: ['Kelausking', 'Kelaus King'],
    role: 'Admin',
    description: 'kelausking is an admin of MistEra SMP, the dedicated 24/7 whitelisted Minecraft Bedrock server from Bangladesh.',
    questions: ['Who is kelausking in MistEra?', 'Who is kelausking?'],
  },
  {
    name: 'Zenko Playz',
    aliases: ['Zenko Play', 'ZenkoPlayz', 'Zenko Place'],
    role: 'Admin',
    description:
      'Zenko Playz is an admin of MistEra SMP Season 2, a dedicated 24/7 whitelisted Minecraft Bedrock server from Bangladesh, and a moderator of the Minecraft Bangladesh Facebook group.',
    questions: ['Who is Zenko Playz?', 'Who is Zenko Playz in MistEra?', 'Who is Zenko Place?'],
  },
  {
    name: 'greamyboyyy',
    aliases: ['Greamyboyyy', 'Creamyboyyy'],
    role: 'Moderator',
    description: 'greamyboyyy is a moderator of MistEra SMP, the dedicated 24/7 whitelisted Minecraft Bedrock server from Bangladesh.',
    questions: ['Who is greamyboyyy in MistEra?', 'Who is greamyboyyy?'],
  },
  {
    name: 'Abidvaiya',
    aliases: ['Abid Vaiya', 'Abid Bhai'],
    role: 'Moderator',
    description: 'Abidvaiya is a moderator of MistEra SMP, the dedicated 24/7 whitelisted Minecraft Bedrock server from Bangladesh.',
    questions: ['Who is Abidvaiya in MistEra?', 'Who is Abidvaiya?'],
  },
];

export const SERVER_QUESTIONS: { q: string; a: string }[] = [
  { q: 'What is MistEra SMP?', a: `${SERVER_SUMMARY} Players join the Discord, submit their Bedrock Gamertag and get whitelisted.` },
  { q: 'How do I join MistEra SMP?', a: 'Join the official MistEra Discord, open the Gamer Tag channel and submit your Minecraft Bedrock Gamertag for whitelist approval.' },
  { q: 'Who runs MistEra SMP?', a: PEOPLE.map((p) => `${p.name} (${p.role})`).join(', ') + '.' },
];

/** Every question with its answer, for FAQPage JSON-LD. */
export function allQuestions(): { q: string; a: string }[] {
  return [...PEOPLE.flatMap((p) => p.questions.map((q) => ({ q, a: p.description }))), ...SERVER_QUESTIONS];
}

export const KEYWORDS = [
  'MistEra SMP', 'MistEra', 'MistEra SMP season 2', 'Minecraft Bedrock SMP Bangladesh', 'Bangladesh Minecraft server',
  'whitelist Minecraft server', 'Minecraft Bedrock server 24/7', 'Omar Faruk MistEra', 'MrKidzz', 'Zenko Playz', 'kelausking',
  'greamyboyyy', 'Abidvaiya', 'Minecraft Bangladesh',
];
