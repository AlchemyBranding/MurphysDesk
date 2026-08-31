import type { Objective } from '@/lib/engine';

// The spine. England Year 6 programmes of study plus the DfE ready-to-progress
// criteria, because they are the only granular, testable specification available
// anywhere in the UK. Wales publishes no content list.
//
// `week` is the fixed pace. Mastery gates the ordering and the repetition;
// this gates overall progress through the year, because the EEF evidence turns
// negative on mastery learning that is purely self-paced.

export const OBJECTIVES: Objective[] = [
  // ------------------------------------------------------------ number and place value
  {
    id: 'M.PV.READ',
    strand: 'maths',
    title: 'Numbers up to ten million',
    canDo: 'I can read, write and order numbers up to 10,000,000.',
    teach:
      'Big numbers are grouped in threes from the right: units, thousands, millions. The commas are just there to make the groups easy to see. Read each group and then say what it is: "four million, two hundred and six thousand, ninety-one".',
    prereqs: [],
    week: 1,
    misconceptions: {
      'place-shift': 'A digit slipped a column. Check the grouping in threes from the right.',
      'longer-is-bigger': 'More digits usually does mean bigger, but only when you have counted them properly.',
    },
  },
  {
    id: 'M.PV.DIGIT',
    strand: 'maths',
    title: 'What each digit is worth',
    canDo: 'I can say what any digit in a big number is actually worth.',
    teach:
      'A digit means different things depending on where it sits. In 4,206,091 the 2 is not worth 2, it is worth 200,000. Count the columns from the right: units, tens, hundreds, thousands, ten thousands, hundred thousands, millions.',
    prereqs: ['M.PV.READ'],
    week: 1,
    misconceptions: {
      'face-value': 'That is the digit itself, not what it is worth. Which column is it sitting in?',
      'off-by-one-column': 'One column out. Count them again from the right.',
    },
  },
  {
    id: 'M.PV.ROUND',
    strand: 'maths',
    title: 'Rounding',
    canDo: 'I can round any whole number to any degree of accuracy.',
    teach:
      'Find the column you are rounding to, then look at the digit immediately to its right. Five or more rounds up, four or less stays. Everything to the right becomes zero.',
    prereqs: ['M.PV.DIGIT'],
    week: 2,
    misconceptions: {
      'round-down-always': 'You chopped the number off instead of rounding it. Check the digit to the right.',
      'wrong-column': 'Rounded to the wrong column. Which one were you asked for?',
      'digits-not-zeroed': 'The digits to the right all become zero.',
    },
  },
  {
    id: 'M.PV.ESTIMATE',
    strand: 'maths',
    title: 'Estimating to check',
    canDo: 'I can estimate an answer first, and use it to check whether my real answer is sensible.',
    teach:
      'Round each number to something easy, do the calculation in your head, and you have a rough answer. It is not the real answer. It is a way of noticing when the real answer is nonsense.',
    prereqs: ['M.PV.ROUND'],
    week: 2,
    misconceptions: {
      'exact-not-estimate': 'That is the exact answer. The point of an estimate is that it is quick and rough.',
    },
  },
  {
    id: 'M.NEG.LINE',
    strand: 'maths',
    title: 'Negative numbers',
    canDo: 'I can use negative numbers in real situations and count across zero.',
    teach:
      'Below zero the numbers carry on, just in the other direction. Minus 6 is colder than minus 2. To count from one to the other, count up to zero and then carry on.',
    prereqs: [],
    week: 3,
    misconceptions: {
      'towards-zero': 'Falling means going further down, not back towards zero.',
      'ignored-sign': 'You worked with the sizes and dropped the minus sign.',
      'subtracted-magnitudes': 'You took one size away from the other. Try counting along a number line through zero.',
    },
  },

  // ------------------------------------------------------------ decimals
  {
    id: 'M.DEC.PLACE',
    strand: 'maths',
    title: 'Decimals to three places',
    canDo: 'I can say what each digit in a decimal is worth, down to thousandths.',
    teach:
      'After the point the columns keep dividing by ten: tenths, hundredths, thousandths. So in 4.706 the 7 is seven tenths and the 6 is six thousandths. There is no oneths column, because that is just the units.',
    prereqs: ['M.PV.DIGIT'],
    week: 4,
    misconceptions: {
      'longer-decimal-bigger': 'More digits after the point does not mean bigger. 0.2 is bigger than 0.10.',
      'two-whole-numbers': 'The bit after the point is not a separate whole number.',
      'off-by-one-column': 'One column out. Tenths, hundredths, thousandths.',
    },
  },
  {
    id: 'M.DEC.X10',
    strand: 'maths',
    title: 'Multiplying and dividing by 10, 100 and 1000',
    canDo: 'I can multiply and divide by 10, 100 and 1000, including with decimals.',
    teach:
      'The digits move, the point stays still. Multiply by 10 and every digit shifts one column to the left. Divide by 100 and every digit shifts two columns right. Nothing is being "added on the end".',
    prereqs: ['M.DEC.PLACE'],
    week: 4,
    misconceptions: {
      'add-zeros': 'Adding a zero on the end only works for whole numbers, and even then it is the wrong way to think about it.',
      'wrong-direction': 'That went the wrong way. Multiplying makes it bigger.',
      'wrong-magnitude': 'Right idea, wrong number of columns.',
    },
  },

  // ------------------------------------------------------------ factors and multiples
  {
    id: 'M.FAC.FACTORS',
    strand: 'maths',
    title: 'Common factors',
    canDo: 'I can find the factors of a number and the common factors of two numbers.',
    teach:
      'A factor divides into a number exactly, leaving nothing over. Factors come in pairs: for 24, 1 and 24, 2 and 12, 3 and 8, 4 and 6. A common factor divides into both numbers.',
    prereqs: [],
    week: 5,
    misconceptions: {
      'factor-multiple-swap': 'Those are multiples, not factors. A factor goes into the number, a multiple is the number times something.',
      'missed-pair': 'You missed one. Work through 1, 2, 3, 4 and write down both of each pair.',
      'near-factor': 'Close, but it does not divide exactly. Check what is left over.',
    },
  },
  {
    id: 'M.FAC.MULT',
    strand: 'maths',
    title: 'Common multiples',
    canDo: 'I can find common multiples of two numbers, including the smallest one.',
    teach:
      'A multiple is what you get in the times table. Common multiples appear in both lists. The smallest one is the one you will need constantly for fractions.',
    prereqs: ['M.FAC.FACTORS'],
    week: 5,
    misconceptions: {
      'factor-multiple-swap': 'Those are factors, not multiples.',
      'product-not-lcm': 'Multiplying the two numbers always gives a common multiple, but not always the smallest one.',
    },
  },
  {
    id: 'M.FAC.PRIME',
    strand: 'maths',
    title: 'Prime numbers',
    canDo: 'I can tell whether a number is prime and name the primes up to 100.',
    teach:
      'A prime has exactly two factors: itself and 1. That is why 1 is not prime, it only has one factor. 2 is the only even prime, which surprises everybody.',
    prereqs: ['M.FAC.FACTORS'],
    week: 5,
    misconceptions: {
      'one-is-prime': '1 has only one factor, so it does not qualify. A prime needs exactly two.',
      'odd-means-prime': 'Not every odd number is prime. 9, 15 and 21 are all odd and all have other factors.',
    },
  },

  // ------------------------------------------------------------ fractions
  {
    id: 'M.FR.SIMPLIFY',
    strand: 'maths',
    title: 'Simplifying fractions',
    canDo: 'I can simplify a fraction using common factors.',
    teach:
      'Divide the top and the bottom by the same number and the fraction is worth exactly the same. Keep going until nothing divides into both. The fastest route is to divide by the highest common factor in one go.',
    prereqs: ['M.FAC.FACTORS'],
    week: 6,
    misconceptions: {
      'not-simplified': 'Correct value, but it will go further. What divides into both the top and the bottom?',
      'subtract-not-divide': 'You took the same amount off the top and bottom. That changes the value. You have to divide.',
      'one-side-only': 'Whatever you do to the top you must do to the bottom.',
    },
  },
  {
    id: 'M.FR.COMMON',
    strand: 'maths',
    title: 'Putting fractions over the same bottom',
    canDo: 'I can rewrite two fractions so they have the same denominator.',
    teach:
      'You cannot compare or add fractions until the pieces are the same size. Find a common multiple of the two bottoms, then scale each fraction up to it. Whatever you multiply the bottom by, you multiply the top by too.',
    prereqs: ['M.FAC.MULT', 'M.FR.SIMPLIFY'],
    week: 6,
    misconceptions: {
      'bottom-only': 'You changed the bottom and left the top alone. That makes it a different fraction.',
      'added-denominators': 'Adding the two bottoms together does not give you a common denominator.',
    },
  },
  {
    id: 'M.FR.COMPARE',
    strand: 'maths',
    title: 'Comparing fractions',
    canDo: 'I can compare and order fractions with different denominators.',
    teach:
      'With the same bottom, the bigger top wins. With different bottoms you have to make them match first. Watch out for the trap: a bigger bottom number means smaller pieces, so one tenth is smaller than one third.',
    prereqs: ['M.FR.COMMON'],
    week: 6,
    misconceptions: {
      'denominator-magnitude': 'A bigger bottom number means the pieces are smaller, not bigger. Ten slices of a cake are smaller than three.',
      'numerator-only': 'You only looked at the top numbers.',
      'gap-thinking': 'The gap between top and bottom does not tell you the size.',
    },
  },
  {
    id: 'M.FR.ADD',
    strand: 'maths',
    title: 'Adding and subtracting fractions',
    canDo: 'I can add and subtract fractions that have different denominators.',
    teach:
      'Make the bottoms the same, then add or subtract only the tops. The bottom does not change: it is telling you what size the pieces are, and the pieces are not getting smaller just because you have more of them.',
    prereqs: ['M.FR.COMMON'],
    week: 7,
    misconceptions: {
      'add-both': 'You added the tops and the bottoms. The bottom tells you the size of the pieces, so it stays the same.',
      'kept-first-denominator': 'You kept the first bottom number instead of finding a common one.',
      'not-simplified': 'Right value, but it will simplify further.',
    },
  },
  {
    id: 'M.FR.MIXED',
    strand: 'maths',
    title: 'Mixed numbers',
    canDo: 'I can add and subtract mixed numbers, and swap between mixed numbers and improper fractions.',
    teach:
      'A mixed number is a whole number and a fraction stuck together. To turn 7/5 into a mixed number, divide: 5 goes into 7 once with 2 left over, so 1 and 2/5. Not subtract. Divide.',
    prereqs: ['M.FR.ADD'],
    week: 8,
    misconceptions: {
      'subtract-not-divide': 'You took the bottom away from the top. You need to divide to see how many whole ones fit.',
      'lost-the-whole': 'The whole number part went missing.',
    },
  },
  {
    id: 'M.FR.MULT',
    strand: 'maths',
    title: 'Multiplying fractions',
    canDo: 'I can multiply pairs of proper fractions and give the answer in its simplest form.',
    teach:
      'Tops times tops, bottoms times bottoms. This is the one case where you do work on both. Multiplying by a fraction less than one makes things smaller, which feels wrong until you say it out loud: half of a quarter really is smaller than a quarter.',
    prereqs: ['M.FR.SIMPLIFY'],
    week: 9,
    misconceptions: {
      'cross-multiply': 'That is cross multiplying, which belongs somewhere else. Here it is top times top and bottom times bottom.',
      'added-instead': 'You added instead of multiplying.',
      'not-simplified': 'Right value, but it will go further.',
    },
  },
  {
    id: 'M.FR.DIV',
    strand: 'maths',
    title: 'Dividing a fraction by a whole number',
    canDo: 'I can divide a proper fraction by a whole number.',
    teach:
      'Sharing a third between two people gives each of them a sixth. The pieces get smaller, so the bottom number gets bigger: multiply the bottom by the whole number and leave the top alone.',
    prereqs: ['M.FR.MULT'],
    week: 9,
    misconceptions: {
      'divided-numerator': 'You divided the top. Sharing makes the pieces smaller, so it is the bottom that changes.',
      'multiplied-instead': 'You multiplied. Dividing by a whole number makes it smaller.',
    },
  },

  // ------------------------------------------------------------ operations
  {
    id: 'M.OPS.ORDER',
    strand: 'maths',
    title: 'Order of operations',
    canDo: 'I can work out a calculation with mixed operations in the right order.',
    teach:
      'Brackets first, then multiply and divide, then add and subtract. Multiplying and dividing rank equally, so you take those left to right, and the same for adding and subtracting.',
    prereqs: [],
    week: 10,
    misconceptions: {
      'left-to-right': 'You worked straight through from the left. Multiplying and dividing come before adding and subtracting.',
      'brackets-ignored': 'The brackets go first.',
    },
  },
  {
    id: 'M.OPS.LONGMULT',
    strand: 'maths',
    title: 'Long multiplication',
    canDo: 'I can multiply a four digit number by a two digit number using long multiplication.',
    teach:
      'Split the second number into tens and units. Multiply by the units, then by the tens, then add the two rows. The zero at the end of the second row is not decoration: it is there because you are multiplying by tens.',
    prereqs: ['M.PV.DIGIT'],
    week: 10,
    misconceptions: {
      'missing-zero': 'The second row needs a zero on the end, because you are multiplying by tens not units.',
      'carry-error': 'Something went wrong in a carry. Check each column.',
    },
  },
  {
    id: 'M.OPS.DIV',
    strand: 'maths',
    title: 'Division with remainders',
    canDo: 'I can divide by a two digit number and say what to do with the remainder.',
    teach:
      'The remainder is what will not share out evenly. What you do with it depends on the question: sometimes you write it as a remainder, sometimes as a fraction, and sometimes you round because you cannot have most of a bus.',
    prereqs: ['M.OPS.LONGMULT'],
    week: 11,
    misconceptions: {
      'dropped-remainder': 'You lost the remainder. It has to go somewhere.',
      'wrong-rounding': 'Think about what the question is actually asking for. You cannot have part of a coach.',
    },
  },

  // ------------------------------------------------------------ percentages and ratio
  {
    id: 'M.PCT.EQUIV',
    strand: 'maths',
    title: 'Fractions, decimals and percentages',
    canDo: 'I can swap between simple fractions, decimals and percentages.',
    teach:
      'They are three ways of writing the same thing. Per cent means "out of a hundred", so 25% is 25/100, which is 1/4, which is 0.25. Learn the common ones by heart and everything else gets easier.',
    prereqs: ['M.FR.SIMPLIFY', 'M.DEC.PLACE'],
    week: 11,
    misconceptions: {
      'decimal-point-shift': 'The point moved the wrong number of places. Per cent means out of a hundred.',
      'literal-digits': 'You read the digits straight across. 1/2 is not 0.12.',
    },
  },
  {
    id: 'M.PCT.OF',
    strand: 'maths',
    title: 'Percentages of an amount',
    canDo: 'I can find a percentage of an amount, and use it on real prices.',
    teach:
      'Ten per cent is a tenth, so divide by ten. Everything else you can build from that: 5% is half of 10%, 20% is double, 15% is 10% plus 5%. This is the single most useful thing in the whole money strand.',
    prereqs: ['M.PCT.EQUIV', 'M.DEC.X10'],
    week: 12,
    misconceptions: {
      'percent-as-whole': 'You used the percentage as if it were a number of pounds.',
      'wrong-tenth': 'Ten per cent means divide by ten, not by a hundred.',
    },
  },
  {
    id: 'M.RAT.SCALE',
    strand: 'maths',
    title: 'Ratio and proportion',
    canDo: 'I can solve problems where two quantities scale together.',
    teach:
      'If a recipe for four people needs six eggs, then for twelve people you need three times as much, so eighteen eggs. The trap is adding instead of multiplying: twelve is not four plus eight in this sense, it is four times three.',
    prereqs: ['M.FAC.MULT'],
    week: 12,
    misconceptions: {
      'additive-comparison': 'You added the difference instead of scaling. Ask how many times bigger, not how much bigger.',
      'inverted-ratio': 'The ratio went the wrong way round.',
    },
  },

  // ------------------------------------------------------------ english: grammar
  {
    id: 'E.GR.CLASS',
    strand: 'english',
    title: 'Word classes',
    canDo: 'I can name the word class of any word in a sentence.',
    teach:
      'Noun names a thing, verb is what is being done, adjective describes a noun, adverb describes a verb, preposition tells you where or when, conjunction joins, pronoun stands in for a noun. The same word can change class depending on the sentence, which is why you always check the job it is doing.',
    prereqs: [],
    week: 1,
    misconceptions: {
      'adj-adv-confusion': 'Adjectives describe nouns, adverbs describe verbs. Which is it describing here?',
      'noun-verb-confusion': 'Look at the job the word is doing in this sentence, not the word on its own.',
      'wrong-class': 'Not that one. Ask what job the word is doing in this sentence.',
    },
  },
  {
    id: 'E.GR.MODAL',
    strand: 'english',
    title: 'Modal verbs',
    canDo: 'I can spot a modal verb and say how certain it makes a sentence.',
    teach:
      'Modal verbs tell you how likely or how necessary something is: will, would, can, could, may, might, shall, should, must, ought. "She might come" and "she must come" are very different promises.',
    prereqs: ['E.GR.CLASS'],
    week: 3,
    misconceptions: {
      'main-verb-picked': 'That is the main verb. The modal is the one in front of it that changes how certain it is.',
      'adverb-picked': 'Perhaps and probably do the same job, but they are adverbs, not modal verbs.',
    },
  },
  {
    id: 'E.GR.RELATIVE',
    strand: 'english',
    title: 'Relative clauses',
    canDo: 'I can use a relative clause to add information to a sentence.',
    teach:
      'A relative clause adds detail about a noun, and it starts with who, which, where, when, whose or that. "The adder, which basks in February, is our only venomous snake." Sometimes the relative pronoun is left out altogether and you have to notice it is missing.',
    prereqs: ['E.GR.CLASS'],
    week: 5,
    misconceptions: {
      'main-clause-picked': 'That is the main clause. The relative clause is the part adding detail about the noun.',
      'wrong-pronoun': 'Who is for people, which is for things, whose shows belonging.',
    },
  },
  {
    id: 'E.GR.CLAUSE',
    strand: 'english',
    title: 'Main and subordinate clauses',
    canDo: 'I can tell a main clause from a subordinate one.',
    teach:
      'A main clause makes sense on its own. A subordinate clause does not, and it usually starts with a word like because, although, while, if, when or since. "Although it was raining" leaves you waiting for the rest.',
    prereqs: ['E.GR.CLASS'],
    week: 7,
    misconceptions: {
      'order-not-function': 'Which clause comes first does not decide which is the main one. Ask which part makes sense alone.',
    },
  },
  {
    id: 'E.GR.PASSIVE',
    strand: 'english',
    title: 'Active and passive',
    canDo: 'I can turn a sentence from active to passive and say why a writer might choose it.',
    teach:
      'Active: the dog bit the postman. Passive: the postman was bitten by the dog, or just "the postman was bitten", which quietly loses the dog altogether. That is exactly why the passive turns up so often in official writing.',
    prereqs: ['E.GR.CLASS'],
    week: 9,
    misconceptions: {
      'past-tense-confusion': 'Passive is not the same as past tense. "Was bitten" is passive, "bit" is just past.',
      'subject-object-swap': 'In the passive, the thing having it done to it goes first.',
      'agent-still-there': 'That one is passive, but it still tells you who did it.',
    },
  },
  {
    id: 'E.GR.FORMAL',
    strand: 'english',
    title: 'Formal and informal',
    canDo: 'I can choose vocabulary and structures that suit how formal the writing needs to be.',
    teach:
      'Formal writing prefers discover to find out, request to ask for, enter to go in. It also uses structures you would rarely say out loud, like "if I were you" instead of "if I was you". Neither is better; they are for different jobs.',
    prereqs: ['E.GR.CLASS'],
    week: 11,
    misconceptions: {
      'longer-means-formal': 'A longer word is not automatically the more formal one.',
      'wrong-meaning': 'That is formal enough, but it does not mean the same thing.',
    },
  },

  // ------------------------------------------------------------ english: punctuation
  {
    id: 'E.PU.APOS',
    strand: 'english',
    title: 'Apostrophes',
    canDo: 'I can use apostrophes for belonging and for missing letters, and I know when not to.',
    teach:
      'An apostrophe shows either that letters are missing (do not becomes don’t) or that something belongs to someone (the dog’s lead). Plurals never take one. Its and it’s are the trap: it’s only ever means it is.',
    prereqs: [],
    week: 2,
    misconceptions: {
      'plural-apostrophe': 'Plurals do not take an apostrophe. More than one thing is not the same as belonging.',
      'its-confusion': "It’s always means it is. Belonging uses its, with no apostrophe.",
      'wrong-side': 'The apostrophe goes after the s when the owner is plural.',
    },
  },
  {
    id: 'E.PU.COMMA',
    strand: 'english',
    title: 'Commas that change meaning',
    canDo: 'I can use commas to make my meaning clear and to mark a fronted adverbial.',
    teach:
      'A comma after a fronted adverbial: "Later that morning, we visited the castle." And commas that stop a sentence meaning something ridiculous: "Let’s eat, Grandma" is a very different invitation from "Let’s eat Grandma".',
    prereqs: [],
    week: 4,
    misconceptions: {
      'comma-splice': 'Two complete sentences joined with only a comma. That needs a full stop, a semi-colon, or a joining word.',
      'no-comma-needed': 'That comma is not doing anything.',
    },
  },
  {
    id: 'E.PU.PAREN',
    strand: 'english',
    title: 'Parenthesis',
    canDo: 'I can use brackets, dashes or commas to add extra information to a sentence.',
    teach:
      'Parenthesis is an aside: something you could lift straight out and still have a whole sentence. You can mark it with brackets, a pair of dashes, or a pair of commas. Whichever you choose, you need both of them.',
    prereqs: ['E.PU.COMMA'],
    week: 6,
    misconceptions: {
      'one-mark-only': 'Parenthesis needs a pair. You have opened it and not closed it.',
      'mixed-marks': 'Do not open with a bracket and close with a dash.',
    },
  },
  {
    id: 'E.PU.COLON',
    strand: 'english',
    title: 'Colons and semi-colons',
    canDo: 'I can use a colon to introduce a list or an explanation, and a semi-colon to join two related sentences.',
    teach:
      'A colon points forwards: what follows explains or lists. A semi-colon joins two complete sentences that belong together; a full stop would work, but the link would be lost. Wales does not usually teach these until later, so this one is genuinely ahead.',
    prereqs: ['E.GR.CLAUSE'],
    week: 8,
    misconceptions: {
      'colon-for-semicolon': 'A colon points forwards to an explanation or a list. To join two equal sentences you want a semi-colon.',
      'incomplete-clause': 'A semi-colon needs a complete sentence on both sides.',
    },
  },
  {
    id: 'E.PU.BULLET',
    strand: 'english',
    title: 'Hyphens and bullet points',
    canDo: 'I can use a hyphen to avoid confusion and punctuate a bulleted list consistently.',
    teach:
      'A hyphen stops a phrase meaning the wrong thing: a man-eating shark is a problem, a man eating shark is dinner. Bullet points need to be punctuated the same way as each other all the way down the list.',
    prereqs: ['E.PU.COMMA'],
    week: 12,
    misconceptions: {
      'hyphen-not-needed': 'That phrase is not ambiguous, so it does not need a hyphen.',
    },
  },

  // ------------------------------------------------------------ english: spelling
  {
    id: 'E.SP.LIST',
    strand: 'english',
    title: 'The Year 5 and 6 word list',
    canDo: 'I can spell the words on the statutory Year 5 and 6 list.',
    teach:
      'One hundred words that have to be learned rather than worked out. Wales publishes no word list at all, so this is a real gap and it is worth closing. Listen, then type. Say it in syllables in your head first.',
    prereqs: [],
    week: 1,
    misconceptions: {},
  },
  {
    id: 'E.SP.CIOUS',
    strand: 'english',
    title: 'Words ending -cious and -tious',
    canDo: 'I can spell words ending in the "shus" sound.',
    teach:
      'If the root word ends in -ce, the ending is usually -cious: grace becomes gracious, space becomes spacious. Otherwise it is usually -tious: ambition becomes ambitious. Vicious, precious and delicious just have to be learned.',
    prereqs: [],
    week: 2,
    misconceptions: {
      'cious-tious': 'Wrong one of the two endings. Does the root word end in -ce?',
    },
  },
  {
    id: 'E.SP.CIAL',
    strand: 'english',
    title: 'Words ending -cial and -tial',
    canDo: 'I can spell words ending in the "shul" sound.',
    teach:
      'After a vowel it is usually -cial: official, special, artificial. After a consonant it is usually -tial: confidential, essential, partial. Initial, financial and commercial break the rule, because English.',
    prereqs: [],
    week: 3,
    misconceptions: {
      'cial-tial': 'Wrong one of the two endings. Is there a vowel or a consonant just before it?',
    },
  },
  {
    id: 'E.SP.HOMO',
    strand: 'english',
    title: 'Homophones',
    canDo: 'I can choose the right spelling for words that sound the same.',
    teach:
      'Practice is the noun and practise is the verb, the same way advice and advise work, and you can hear the difference in those two. Stationary means standing still; stationery is envelopes.',
    prereqs: [],
    week: 4,
    misconceptions: {
      'noun-verb-homophone': 'One of these is the noun and one is the verb. Try swapping in advice and advise: you can hear which is which.',
    },
  },
  {
    id: 'E.SP.ANT',
    strand: 'english',
    title: 'Words ending -ant, -ance, -ent and -ence',
    canDo: 'I can spell words ending in -ant, -ance, -ent and -ence.',
    teach:
      'If you can hear a clear "ay" or a hard c or g sound before the ending, it is usually -ant and -ance: observant, observance, hesitancy. A soft c, g or qu before it usually means -ent and -ence: innocent, innocence, frequent, frequency.',
    prereqs: [],
    week: 10,
    misconceptions: {},
  },
];

export const OBJ_BY_ID: Record<string, Objective> = Object.fromEntries(
  OBJECTIVES.map((o) => [o.id, o])
);

/** Objectives whose failure blocks a lot downstream. Gated at 0.98 rather than 0.95. */
export const FOUNDATIONAL = new Set([
  'M.PV.DIGIT',
  'M.FR.COMMON',
  'M.FR.SIMPLIFY',
  'M.PCT.OF',
]);
