import { RNG } from '@/lib/rng';
import { type Template, type GeneratedItem, markText, choiceItem } from '@/lib/engine';

// The statutory Year 5 and 6 word list. Wales publishes no word list at all, so
// this is one of the clearest gaps against what an English secondary assumes.
export const Y56_WORDS = [
  'accommodate','accompany','according','achieve','aggressive','amateur','ancient','apparent',
  'appreciate','attached','available','average','awkward','bargain','bruise','category','cemetery',
  'committee','communicate','community','competition','conscience','conscious','controversy',
  'convenience','correspond','criticise','curiosity','definite','desperate','determined','develop',
  'dictionary','disastrous','embarrass','environment','equipped','especially','exaggerate','excellent',
  'existence','explanation','familiar','foreign','forty','frequently','government','guarantee',
  'harass','hindrance','identity','immediately','individual','interfere','interrupt','language',
  'leisure','lightning','marvellous','mischievous','muscle','necessary','neighbour','nuisance',
  'occupy','occur','opportunity','parliament','persuade','physical','prejudice','privilege',
  'profession','programme','pronunciation','queue','recognise','recommend','relevant','restaurant',
  'rhyme','rhythm','sacrifice','secretary','shoulder','signature','sincerely','soldier','stomach',
  'sufficient','suggest','symbol','system','temperature','thorough','twelfth','variety','vegetable',
  'vehicle','yacht',
];

const CIOUS = ['vicious','precious','conscious','delicious','malicious','suspicious','gracious','spacious','ferocious','atrocious'];
const TIOUS = ['ambitious','cautious','fictitious','infectious','nutritious','superstitious','repetitious'];
const CIAL = ['official','special','artificial','beneficial','crucial','superficial','judicial','sacrificial'];
const TIAL = ['confidential','essential','partial','substantial','potential','residential','torrential','presidential'];

const HOMOPHONES: { sentence: string; right: string; wrong: string; why: string; because: string }[] = [
  { sentence: 'She needs to ___ the piano every day.', right: 'practise', wrong: 'practice', why: 'noun-verb-homophone', because: 'Practise is the verb, the doing word. Advise and advice work the same way.' },
  { sentence: 'Her piano ___ is at four o’clock.', right: 'practice', wrong: 'practise', why: 'noun-verb-homophone', because: 'Practice is the noun, the thing. Advise and advice work the same way.' },
  { sentence: 'Let me give you some ___ about it.', right: 'advice', wrong: 'advise', why: 'noun-verb-homophone', because: 'Advice is the noun. You can hear the difference: ad-vice.' },
  { sentence: 'I would ___ you to take a coat.', right: 'advise', wrong: 'advice', why: 'noun-verb-homophone', because: 'Advise is the verb. You can hear the difference: ad-vize.' },
  { sentence: 'The car was ___ at the traffic lights.', right: 'stationary', wrong: 'stationery', why: 'noun-verb-homophone', because: 'Stationary with an a means standing still. Think of a car.' },
  { sentence: 'She bought pens and paper from the ___ shop.', right: 'stationery', wrong: 'stationary', why: 'noun-verb-homophone', because: 'Stationery with an e means envelopes and pens.' },
  { sentence: 'The shop made a small ___ last year.', right: 'profit', wrong: 'prophet', why: 'noun-verb-homophone', because: 'Profit is money left over. A prophet foretells the future.' },
  { sentence: 'They walked ___ the shops.', right: 'past', wrong: 'passed', why: 'noun-verb-homophone', because: 'Past is a place or a time. Passed is the verb.' },
  { sentence: 'He ___ the ball to his sister.', right: 'passed', wrong: 'past', why: 'noun-verb-homophone', because: 'Passed is the verb, what somebody did.' },
  { sentence: 'You need a ___ to drive a car.', right: 'licence', wrong: 'license', why: 'noun-verb-homophone', because: 'Licence is the noun, the piece of paper. License is the verb.' },
  { sentence: 'The ___ of the school is very strict.', right: 'principal', wrong: 'principle', why: 'noun-verb-homophone', because: 'The principal is a person, and they are your pal.' },
  { sentence: 'It is against her ___ to lie.', right: 'principles', wrong: 'principals', why: 'noun-verb-homophone', because: 'Principles are rules you live by. Principals are people.' },
  { sentence: 'The knight wore ___ armour.', right: 'steel', wrong: 'steal', why: 'noun-verb-homophone', because: 'Steel is the metal. Steal is to take.' },
  { sentence: 'They ___ the whole cake between them.', right: 'devoured', wrong: 'devowered', why: 'noun-verb-homophone', because: 'There is no such word as devowered.' },
];

const ANT_ANCE = ['observant','observance','hesitant','hesitancy','tolerant','tolerance','substance','expectant','assistant','assistance'];
const ENT_ENCE = ['innocent','innocence','decent','decency','frequent','frequency','confident','confidence','obedient','obedience','independent'];

// Sentences with one word of each class marked. Kept unambiguous on purpose.
const CLASS_BANK: { sentence: string; word: string; answer: string; trap?: [string, string] }[] = [
  { sentence: 'The adder basked quietly on the warm stone.', word: 'quietly', answer: 'adverb', trap: ['adjective', 'adj-adv-confusion'] },
  { sentence: 'The adder basked quietly on the warm stone.', word: 'warm', answer: 'adjective', trap: ['adverb', 'adj-adv-confusion'] },
  { sentence: 'The adder basked quietly on the warm stone.', word: 'basked', answer: 'verb', trap: ['noun', 'noun-verb-confusion'] },
  { sentence: 'Murphy carefully counted the scales under the microscope.', word: 'carefully', answer: 'adverb', trap: ['adjective', 'adj-adv-confusion'] },
  { sentence: 'Murphy carefully counted the scales under the microscope.', word: 'under', answer: 'preposition', trap: ['adverb', 'adj-adv-confusion'] },
  { sentence: 'Murphy carefully counted the scales under the microscope.', word: 'microscope', answer: 'noun', trap: ['verb', 'noun-verb-confusion'] },
  { sentence: 'She waited outside because the rain was heavy.', word: 'because', answer: 'conjunction' },
  { sentence: 'She waited outside because the rain was heavy.', word: 'heavy', answer: 'adjective', trap: ['adverb', 'adj-adv-confusion'] },
  { sentence: 'They found it near the pond and photographed it quickly.', word: 'they', answer: 'pronoun' },
  { sentence: 'They found it near the pond and photographed it quickly.', word: 'quickly', answer: 'adverb', trap: ['adjective', 'adj-adv-confusion'] },
  { sentence: 'The slow worm is not actually a worm.', word: 'slow', answer: 'adjective', trap: ['adverb', 'adj-adv-confusion'] },
  { sentence: 'Grass snakes swim well and hunt frogs.', word: 'well', answer: 'adverb', trap: ['adjective', 'adj-adv-confusion'] },
];
const CLASSES = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun'];

const MODAL_BANK: { sentence: string; modal: string; mainVerb: string; adverb?: string }[] = [
  { sentence: 'The adder might be basking on the path.', modal: 'might', mainVerb: 'basking' },
  { sentence: 'You must wash your hands before tea.', modal: 'must', mainVerb: 'wash' },
  { sentence: 'She should have taken a coat.', modal: 'should', mainVerb: 'taken' },
  { sentence: 'We could walk to Ynyslas on Saturday.', modal: 'could', mainVerb: 'walk' },
  { sentence: 'Perhaps the grass snake will return to the compost heap.', modal: 'will', mainVerb: 'return', adverb: 'Perhaps' },
  { sentence: 'They may find slow worms under the tin.', modal: 'may', mainVerb: 'find' },
  { sentence: 'Possibly the eggs would hatch by August.', modal: 'would', mainVerb: 'hatch', adverb: 'Possibly' },
  { sentence: 'You can borrow the field guide.', modal: 'can', mainVerb: 'borrow' },
];

const RELATIVE_BANK: { sentence: string; clause: string; main: string }[] = [
  { sentence: 'The adder, which basks in February, is our only venomous snake.', clause: 'which basks in February', main: 'is our only venomous snake' },
  { sentence: 'The scientist who discovered it worked in Liverpool.', clause: 'who discovered it', main: 'The scientist worked in Liverpool' },
  { sentence: 'The dune system where sand lizards live is protected.', clause: 'where sand lizards live', main: 'The dune system is protected' },
  { sentence: 'The book that she borrowed was about venom.', clause: 'that she borrowed', main: 'The book was about venom' },
  { sentence: 'My neighbour, whose garden backs onto the field, has seen three.', clause: 'whose garden backs onto the field', main: 'My neighbour has seen three' },
];

const CLAUSE_BANK: { sentence: string; sub: string; main: string }[] = [
  { sentence: 'Although it was raining, we walked to the reserve.', sub: 'Although it was raining', main: 'we walked to the reserve' },
  { sentence: 'We waited by the gate until the sun came out.', sub: 'until the sun came out', main: 'We waited by the gate' },
  { sentence: 'Because the ground was cold, nothing was basking.', sub: 'Because the ground was cold', main: 'nothing was basking' },
  { sentence: 'She photographed the lizard while it sat on the wall.', sub: 'while it sat on the wall', main: 'She photographed the lizard' },
  { sentence: 'If you lift the tin, put it back exactly as it was.', sub: 'If you lift the tin', main: 'put it back exactly as it was' },
];

const PASSIVE_BANK: { active: string; passive: string; agentless: string }[] = [
  { active: 'The buzzard ate the adder.', passive: 'The adder was eaten by the buzzard.', agentless: 'The adder was eaten.' },
  { active: 'Volunteers counted the lizards.', passive: 'The lizards were counted by volunteers.', agentless: 'The lizards were counted.' },
  { active: 'Someone moved the tin.', passive: 'The tin was moved by someone.', agentless: 'The tin was moved.' },
  { active: 'The council closed the path.', passive: 'The path was closed by the council.', agentless: 'The path was closed.' },
];

const FORMAL_BANK: { informal: string; formal: string }[] = [
  { informal: 'find out', formal: 'discover' },
  { informal: 'ask for', formal: 'request' },
  { informal: 'go in', formal: 'enter' },
  { informal: 'get', formal: 'receive' },
  { informal: 'put off', formal: 'postpone' },
  { informal: 'sort out', formal: 'resolve' },
  { informal: 'a lot of', formal: 'a great deal of' },
  { informal: 'think about', formal: 'consider' },
];

function t(
  id: string,
  objectiveId: string,
  difficulty: 1 | 2 | 3 | 4 | 5,
  transfer: 0 | 1 | 2 | 3,
  generate: (rng: RNG) => GeneratedItem
): Template {
  return { id, objectiveId, difficulty, transfer, generate };
}

/** Spell out a word with its first letter and length, as a fallback when speech is unavailable. */
function shape(word: string): string {
  return `Starts with "${word[0]}" and has ${word.length} letters.`;
}

export const ENGLISH_TEMPLATES: Template[] = [
  // ============================================================ spelling
  t('E.SP.LIST.dictate', 'E.SP.LIST', 3, 0, (rng) => {
    const word = rng.pick(Y56_WORDS);
    return {
      templateId: 'E.SP.LIST.dictate',
      objectiveId: 'E.SP.LIST',
      seed: 0,
      input: 'text',
      stem: 'Listen, then spell the word.',
      note: shape(word),
      speak: word,
      canonical: word,
      working: [
        { say: `The word is "${word}".` },
        { say: `Look at it, cover it, write it, then check it against this.` },
      ],
      mark: markText([word]),
    };
  }),

  t('E.SP.CIOUS.choose', 'E.SP.CIOUS', 2, 0, (rng) => {
    const useCious = rng.bool();
    const word = useCious ? rng.pick(CIOUS) : rng.pick(TIOUS);
    const wrong = useCious ? word.replace(/cious$/, 'tious') : word.replace(/tious$/, 'cious');
    return choiceItem(
      {
        templateId: 'E.SP.CIOUS.choose',
        objectiveId: 'E.SP.CIOUS',
        seed: 0,
        stem: 'Which spelling is correct?',
        speak: word,
        working: [
          { say: `If the root word ends in -ce, the ending is usually -cious. Otherwise it is usually -tious.` },
          { say: `= ${word}` },
        ],
        options: [
          { label: word, correct: true },
          { label: wrong, correct: false, misconceptionId: 'cious-tious' },
        ],
      },
      rng
    );
  }),

  t('E.SP.CIAL.choose', 'E.SP.CIAL', 2, 0, (rng) => {
    const useCial = rng.bool();
    const word = useCial ? rng.pick(CIAL) : rng.pick(TIAL);
    const wrong = useCial ? word.replace(/cial$/, 'tial') : word.replace(/tial$/, 'cial');
    return choiceItem(
      {
        templateId: 'E.SP.CIAL.choose',
        objectiveId: 'E.SP.CIAL',
        seed: 0,
        stem: 'Which spelling is correct?',
        speak: word,
        working: [
          { say: `After a vowel it is usually -cial. After a consonant it is usually -tial.` },
          { say: `= ${word}` },
        ],
        options: [
          { label: word, correct: true },
          { label: wrong, correct: false, misconceptionId: 'cial-tial' },
        ],
      },
      rng
    );
  }),

  t('E.SP.HOMO.cloze', 'E.SP.HOMO', 3, 1, (rng) => {
    const h = rng.pick(HOMOPHONES);
    return choiceItem(
      {
        templateId: 'E.SP.HOMO.cloze',
        objectiveId: 'E.SP.HOMO',
        seed: 0,
        stem: `Which word fills the gap?\n\n${h.sentence}`,
        working: [{ say: h.because }, { say: `= ${h.right}` }],
        options: [
          { label: h.right, correct: true },
          { label: h.wrong, correct: false, misconceptionId: h.why },
        ],
      },
      rng
    );
  }),

  t('E.SP.ANT.dictate', 'E.SP.ANT', 3, 0, (rng) => {
    const word = rng.pick([...ANT_ANCE, ...ENT_ENCE]);
    return {
      templateId: 'E.SP.ANT.dictate',
      objectiveId: 'E.SP.ANT',
      seed: 0,
      input: 'text',
      stem: 'Listen, then spell the word.',
      note: shape(word),
      speak: word,
      canonical: word,
      working: [
        { say: `A hard c or g, or a clear "ay" sound, usually means -ant or -ance.` },
        { say: `A soft c, g or qu usually means -ent or -ence.` },
        { say: `= ${word}` },
      ],
      mark: markText([word]),
    };
  }),

  // ============================================================ grammar
  t('E.GR.CLASS.identify', 'E.GR.CLASS', 2, 0, (rng) => {
    const row = rng.pick(CLASS_BANK);
    const others = CLASSES.filter((c) => c !== row.answer && c !== row.trap?.[0]);
    const distractors = rng.sample(others, 2);
    return choiceItem(
      {
        templateId: 'E.GR.CLASS.identify',
        objectiveId: 'E.GR.CLASS',
        seed: 0,
        stem: `What word class is "${row.word}" in this sentence?\n\n${row.sentence}`,
        working: [
          { say: `Ask what job the word is doing here, not what it usually is.` },
          { say: `= ${row.answer}` },
        ],
        options: [
          { label: row.answer, correct: true },
          ...(row.trap ? [{ label: row.trap[0], correct: false, misconceptionId: row.trap[1] }] : []),
          ...distractors.map((d) => ({ label: d, correct: false, misconceptionId: 'wrong-class' })),
        ],
      },
      rng
    );
  }),

  t('E.GR.MODAL.identify', 'E.GR.MODAL', 2, 0, (rng) => {
    const row = rng.pick(MODAL_BANK);
    const opts = [
      { label: row.modal, correct: true },
      { label: row.mainVerb, correct: false, misconceptionId: 'main-verb-picked' },
    ];
    if (row.adverb) opts.push({ label: row.adverb.toLowerCase(), correct: false, misconceptionId: 'adverb-picked' });
    return choiceItem(
      {
        templateId: 'E.GR.MODAL.identify',
        objectiveId: 'E.GR.MODAL',
        seed: 0,
        stem: `Which word is the modal verb?\n\n${row.sentence}`,
        note: 'A modal verb tells you how likely or how necessary something is.',
        working: [
          { say: `Modals: will, would, can, could, may, might, shall, should, must, ought.` },
          { say: `"${row.mainVerb}" is the main verb. "${row.modal}" is the one changing how certain it is.` },
          { say: `= ${row.modal}` },
        ],
        options: opts,
      },
      rng
    );
  }),

  t('E.GR.RELATIVE.identify', 'E.GR.RELATIVE', 3, 0, (rng) => {
    const row = rng.pick(RELATIVE_BANK);
    return choiceItem(
      {
        templateId: 'E.GR.RELATIVE.identify',
        objectiveId: 'E.GR.RELATIVE',
        seed: 0,
        stem: `Which part is the relative clause?\n\n${row.sentence}`,
        working: [
          { say: `A relative clause adds detail about a noun and starts with who, which, where, when, whose or that.` },
          { say: `Take it out and the sentence still works.` },
          { say: `= ${row.clause}` },
        ],
        options: [
          { label: row.clause, correct: true },
          { label: row.main, correct: false, misconceptionId: 'main-clause-picked' },
        ],
      },
      rng
    );
  }),

  t('E.GR.CLAUSE.identify', 'E.GR.CLAUSE', 3, 1, (rng) => {
    const row = rng.pick(CLAUSE_BANK);
    return choiceItem(
      {
        templateId: 'E.GR.CLAUSE.identify',
        objectiveId: 'E.GR.CLAUSE',
        seed: 0,
        stem: `Which part is the subordinate clause?\n\n${row.sentence}`,
        note: 'The subordinate clause is the part that cannot stand alone.',
        working: [
          { say: `Read each part on its own and see which one leaves you waiting.` },
          { say: `"${row.main}" makes sense by itself.` },
          { say: `= ${row.sub}` },
        ],
        options: [
          { label: row.sub, correct: true },
          { label: row.main, correct: false, misconceptionId: 'order-not-function' },
        ],
      },
      rng
    );
  }),

  t('E.GR.PASSIVE.identify', 'E.GR.PASSIVE', 3, 1, (rng) => {
    const row = rng.pick(PASSIVE_BANK);
    return choiceItem(
      {
        templateId: 'E.GR.PASSIVE.identify',
        objectiveId: 'E.GR.PASSIVE',
        seed: 0,
        stem: `Which of these sentences is in the passive voice?`,
        working: [
          { say: `In the passive, the thing having it done to it comes first.` },
          { say: `= ${row.passive}` },
        ],
        options: [
          { label: row.passive, correct: true },
          { label: row.active, correct: false, misconceptionId: 'subject-object-swap' },
        ],
      },
      rng
    );
  }),

  t('E.GR.PASSIVE.agent', 'E.GR.PASSIVE', 4, 2, (rng) => {
    const row = rng.pick(PASSIVE_BANK);
    return choiceItem(
      {
        templateId: 'E.GR.PASSIVE.agent',
        objectiveId: 'E.GR.PASSIVE',
        seed: 0,
        stem: `Which sentence hides who did it?`,
        note: 'This is why the passive turns up so often in official writing.',
        working: [
          { say: `The passive lets a writer leave out who did the thing.` },
          { say: `= ${row.agentless}` },
        ],
        options: [
          { label: row.agentless, correct: true },
          { label: row.active, correct: false, misconceptionId: 'subject-object-swap' },
          { label: row.passive, correct: false, misconceptionId: 'agent-still-there' },
        ],
      },
      rng
    );
  }),

  t('E.GR.FORMAL.choose', 'E.GR.FORMAL', 3, 1, (rng) => {
    const row = rng.pick(FORMAL_BANK);
    const other = rng.pick(FORMAL_BANK.filter((r) => r.formal !== row.formal));
    return choiceItem(
      {
        templateId: 'E.GR.FORMAL.choose',
        objectiveId: 'E.GR.FORMAL',
        seed: 0,
        stem: `You are writing a formal letter. Which word would you use instead of "${row.informal}"?`,
        working: [
          { say: `Formal writing prefers a single precise word to an everyday phrase.` },
          { say: `"${row.informal}" is what you would say. "${row.formal}" is what you would write.` },
          { say: `= ${row.formal}` },
        ],
        options: [
          { label: row.formal, correct: true },
          { label: row.informal, correct: false, misconceptionId: 'longer-means-formal' },
          { label: other.formal, correct: false, misconceptionId: 'wrong-meaning' },
        ],
      },
      rng
    );
  }),

  // ============================================================ punctuation
  t('E.PU.APOS.its', 'E.PU.APOS', 2, 0, (rng) => {
    const rows = [
      { s: 'The snake shed ___ skin behind the log.', right: 'its' },
      { s: '___ too cold for the lizards this morning.', right: "It's" },
      { s: 'The school held ___ sports day in June.', right: 'its' },
      { s: '___ been raining since Tuesday.', right: "It's" },
    ];
    const row = rng.pick(rows);
    const wrong = row.right === 'its' ? "it's" : 'Its';
    return choiceItem(
      {
        templateId: 'E.PU.APOS.its',
        objectiveId: 'E.PU.APOS',
        seed: 0,
        stem: `Which word fills the gap?\n\n${row.s}`,
        note: 'Try reading it with "it is" instead.',
        working: [
          { say: `It's always means "it is". If "it is" does not fit, you want its.` },
          { say: `= ${row.right}` },
        ],
        options: [
          { label: row.right, correct: true },
          { label: wrong, correct: false, misconceptionId: 'its-confusion' },
        ],
      },
      rng
    );
  }),

  t('E.PU.APOS.plural', 'E.PU.APOS', 3, 1, (rng) => {
    const rows = [
      { singular: 'dog', plural: 'dogs', thing: 'lead', things: 'leads' },
      { singular: 'girl', plural: 'girls', thing: 'bag', things: 'bags' },
      { singular: 'snake', plural: 'snakes', thing: 'skin', things: 'skins' },
      { singular: 'teacher', plural: 'teachers', thing: 'desk', things: 'desks' },
    ];
    const row = rng.pick(rows);
    const manyOwners = rng.bool();
    const one = `the ${row.singular}'s ${row.thing}`;
    const many = `the ${row.plural}' ${row.things}`;
    const noApostrophe = manyOwners ? `the ${row.plural} ${row.things}` : `the ${row.plural} ${row.thing}`;
    const correct = manyOwners ? many : one;
    const wrongSide = manyOwners ? one : many;
    return choiceItem(
      {
        templateId: 'E.PU.APOS.plural',
        objectiveId: 'E.PU.APOS',
        seed: 0,
        stem: manyOwners
          ? `How do you write that the ${row.things} belong to several ${row.plural}?`
          : `How do you write that the ${row.thing} belongs to one ${row.singular}?`,
        working: [
          { say: `One owner: apostrophe, then s.` },
          { say: `More than one owner, already ending in s: s, then apostrophe.` },
          { say: `= ${correct}` },
        ],
        options: [
          { label: correct, correct: true },
          { label: wrongSide, correct: false, misconceptionId: 'wrong-side' },
          { label: noApostrophe, correct: false, misconceptionId: 'plural-apostrophe' },
        ],
      },
      rng
    );
  }),

  t('E.PU.COMMA.meaning', 'E.PU.COMMA', 3, 2, (rng) => {
    const rows = [
      {
        meaning: 'you are telling Grandma it is time to eat',
        right: 'Let’s eat, Grandma.',
        wrong: 'Let’s eat Grandma.',
        why: 'Without the comma you are eating your grandmother.',
      },
      {
        meaning: 'you finished eating, and then the dog went outside',
        right: 'After we had eaten, the dog went out.',
        wrong: 'After we had eaten the dog went out.',
        why: 'Without the comma you have eaten the dog.',
      },
      {
        meaning: 'Rhys and Nia were invited as well as the dancers',
        right: 'We invited the dancers, Rhys and Nia.',
        wrong: 'We invited the dancers Rhys and Nia.',
        why: 'Without the comma, Rhys and Nia are the dancers rather than two more guests.',
      },
      {
        meaning: 'the visit happened later that morning',
        right: 'Later that morning, we visited the castle.',
        wrong: 'Later that morning we visited, the castle.',
        why: 'The comma belongs after the fronted adverbial, not in the middle of the main clause.',
      },
    ];
    const row = rng.pick(rows);
    return choiceItem(
      {
        templateId: 'E.PU.COMMA.meaning',
        objectiveId: 'E.PU.COMMA',
        seed: 0,
        stem: `Which one means that ${row.meaning}?`,
        working: [{ say: row.why }, { say: `= ${row.right}` }],
        options: [
          { label: row.right, correct: true },
          { label: row.wrong, correct: false, misconceptionId: 'no-comma-needed' },
        ],
      },
      rng
    );
  }),

  t('E.PU.PAREN.pair', 'E.PU.PAREN', 3, 1, (rng) => {
    const rows = [
      {
        right: 'The adder (Britain’s only venomous snake) is in steep decline.',
        wrongOne: 'The adder (Britain’s only venomous snake is in steep decline.',
        wrongMixed: 'The adder (Britain’s only venomous snake — is in steep decline.',
      },
      {
        right: 'My cousin, who lives in Cardiff, is coming on Saturday.',
        wrongOne: 'My cousin, who lives in Cardiff is coming on Saturday.',
        wrongMixed: 'My cousin, who lives in Cardiff) is coming on Saturday.',
      },
    ];
    const row = rng.pick(rows);
    return choiceItem(
      {
        templateId: 'E.PU.PAREN.pair',
        objectiveId: 'E.PU.PAREN',
        seed: 0,
        stem: 'Which sentence uses parenthesis correctly?',
        note: 'You could lift the extra bit straight out and still have a whole sentence.',
        working: [
          { say: `Parenthesis always comes in a pair, and both marks must match.` },
          { say: `= ${row.right}` },
        ],
        options: [
          { label: row.right, correct: true },
          { label: row.wrongOne, correct: false, misconceptionId: 'one-mark-only' },
          { label: row.wrongMixed, correct: false, misconceptionId: 'mixed-marks' },
        ],
      },
      rng
    );
  }),

  t('E.PU.COLON.which', 'E.PU.COLON', 4, 1, (rng) => {
    const rows = [
      { s: 'We needed three things ___ a torch, a map and a flask.', right: 'a colon', why: 'It introduces a list.' },
      { s: 'The path was flooded ___ we went the long way round.', right: 'a semi-colon', why: 'Two complete sentences, closely linked.' },
      { s: 'She had one rule ___ never lift a tin that is not yours.', right: 'a colon', why: 'What follows explains the rule.' },
      { s: 'The adder basked on the stone ___ the lizard stayed in the grass.', right: 'a semi-colon', why: 'Two complete sentences, balanced against each other.' },
    ];
    const row = rng.pick(rows);
    const wrong = row.right === 'a colon' ? 'a semi-colon' : 'a colon';
    return choiceItem(
      {
        templateId: 'E.PU.COLON.which',
        objectiveId: 'E.PU.COLON',
        seed: 0,
        stem: `Which punctuation mark goes in the gap?\n\n${row.s}`,
        working: [
          { say: `A colon points forwards to a list or an explanation. A semi-colon joins two complete sentences.` },
          { say: row.why },
          { say: `= ${row.right}` },
        ],
        options: [
          { label: row.right, correct: true },
          { label: wrong, correct: false, misconceptionId: 'colon-for-semicolon' },
          { label: 'a comma', correct: false, misconceptionId: 'incomplete-clause' },
        ],
      },
      rng
    );
  }),

  t('E.PU.BULLET.hyphen', 'E.PU.BULLET', 3, 2, (rng) => {
    const rows = [
      {
        meaning: 'a shark that eats people',
        right: 'a man-eating shark',
        wrong: 'a man eating shark',
        why: 'Without the hyphen it is a man who is eating a shark.',
      },
      {
        meaning: 'put a new cover on the sofa',
        right: 're-cover the sofa',
        wrong: 'recover the sofa',
        why: 'Recover means get better. Re-cover means cover it again.',
      },
      {
        meaning: 'a scientist who is famous',
        right: 'a well-known scientist',
        wrong: 'a well known scientist',
        why: 'The hyphen joins the two words into one description of the scientist.',
      },
      {
        meaning: 'about twenty socks',
        right: 'twenty-odd socks',
        wrong: 'twenty odd socks',
        why: 'Without the hyphen the socks themselves are odd.',
      },
      {
        meaning: 'a boy who is eight years old',
        right: 'an eight-year-old boy',
        wrong: 'an eight year old boy',
        why: 'The hyphens tie the three words into a single description.',
      },
    ];
    const row = rng.pick(rows);
    return choiceItem(
      {
        templateId: 'E.PU.BULLET.hyphen',
        objectiveId: 'E.PU.BULLET',
        seed: 0,
        stem: `Which one means "${row.meaning}"?`,
        working: [{ say: row.why }, { say: `= ${row.right}` }],
        options: [
          { label: row.right, correct: true },
          { label: row.wrong, correct: false, misconceptionId: 'hyphen-not-needed' },
        ],
      },
      rng
    );
  }),
];
