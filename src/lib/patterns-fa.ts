import type { Pattern } from "./patterns";

// Persian (Farsi) patterns, ids prefixed fa_. Transliteration uses â for the long a, as the lessons do.
export const FARSI_PATTERNS: Pattern[] = [
  {
    id: "fa_present_perfect",
    title: "Present perfect (رفته‌ام, rafte-am)",
    build: "past stem + e (the participle) + personal ending: -am, -i, -ast, -im, -id, -and",
    explanation:
      "Says what someone has done, like English “has gone”. The participle ends in -e and the ending says who. For he/she it is -ast, usually written as a separate word: «رفته است».",
    examples: [
      { text: "من رفته‌ام.", translit: "man rafte-am.", english: "I have gone." },
      { text: "تو خورده‌ای؟", translit: "to xorde-i?", english: "Have you eaten?" },
      { text: "او آمده است.", translit: "u âmade ast.", english: "He/she has come." },
      { text: "ما این فیلم را دیده‌ایم.", translit: "mâ in film râ dide-im.", english: "We have seen this film." },
      { text: "آنها نوشته‌اند.", translit: "ânhâ neveshte-and.", english: "They have written." },
    ],
    hint: "past stem + e + personal ending (-am, -i, -ast, -im, -id, -and), such as رفته‌ام or آمده است",
  },
  {
    id: "fa_past_perfect",
    title: "Past perfect (رفته بودم, rafte budam)",
    build: "participle (…e) + the past of بودن (budam, budi, bud, budim, budid, budand)",
    explanation: "Something that had already happened before another moment in the past, like English “had gone”.",
    examples: [
      { text: "وقتی رسیدم، او رفته بود.", translit: "vaqti residam, u rafte bud.", english: "When I arrived, he had left." },
      { text: "ما قبلاً دیده بودیم.", translit: "mâ qablan dide budim.", english: "We had seen it before." },
      { text: "نامه را نوشته بودم.", translit: "nâme râ neveshte budam.", english: "I had written the letter." },
    ],
    hint: "participle ending in e + the past of بودن (budam, bud, budim), such as رفته بود",
  },
  {
    id: "fa_progressive",
    title: "Happening now (دارم می‌خوانم, dâram mi-xânam)",
    build: "داشتن (dâram, dâri, dârad…) + می‌ + present stem + ending",
    explanation:
      "An action in progress right now, like “am reading”. Put dâshtan in the past (dâshtim) and it becomes “we were doing”.",
    examples: [
      { text: "دارم کتاب می‌خوانم.", translit: "dâram ketâb mi-xânam.", english: "I am reading a book." },
      { text: "او دارد می‌آید.", translit: "u dârad mi-âyad.", english: "He/she is coming." },
      { text: "داشتیم غذا می‌خوردیم.", translit: "dâshtim qazâ mi-xordim.", english: "We were eating." },
    ],
    hint: "a form of داشتن + a verb with می‌, such as دارم می‌خوانم",
  },
  {
    id: "fa_habitual_past",
    title: "Used to / was doing (می‌رفتم, mi-raftam)",
    build: "می‌ + past stem + personal ending",
    explanation:
      "The past with می‌ means a habit (“I used to go”) or an action in progress (“I was going”). Without می‌ it is the simple past: raftam, I went.",
    examples: [
      { text: "هر روز می‌رفتم.", translit: "har ruz mi-raftam.", english: "I used to go every day." },
      { text: "او کتاب می‌خواند.", translit: "u ketâb mi-xând.", english: "He/she was reading a book." },
      { text: "ما می‌دانستیم.", translit: "mâ mi-dânestim.", english: "We knew." },
    ],
    hint: "می‌ + a past stem + ending, such as می‌رفتم (not the present می‌روم)",
  },
  {
    id: "fa_future",
    title: "Formal future (خواهم رفت, xâham raft)",
    build: "خواستن (xâham, xâhi, xâhad…) + the short infinitive (raft, did, âmad)",
    explanation:
      "“Will do”, mostly in writing and news. Speakers usually just use the present instead (miram, I'm going).",
    examples: [
      { text: "من خواهم رفت.", translit: "man xâham raft.", english: "I will go." },
      { text: "او خواهد آمد.", translit: "u xâhad âmad.", english: "He/she will come." },
      { text: "خواهیم دید.", translit: "xâhim did.", english: "We will see." },
    ],
    hint: "خواهم/خواهی/خواهد… + a short infinitive, such as خواهد آمد",
  },
  {
    id: "fa_subjunctive",
    title: "Want, must, can (می‌خواهم بروم, mi-xâham beravam)",
    build: "می‌خواهم / باید / می‌توانم + a verb with be- and a personal ending",
    explanation:
      "After want, must and can the second verb is in the subjunctive: be- plus the present stem plus the ending. There is no “to go”, it reads “I want I-go”.",
    examples: [
      { text: "می‌خواهم بروم.", translit: "mi-xâham beravam.", english: "I want to go." },
      { text: "باید بیایی.", translit: "bâyad biâyi.", english: "You must come." },
      { text: "می‌توانی بخوانی؟", translit: "mi-tavâni bexâni?", english: "Can you read?" },
    ],
    hint: "want/must/can (خواستن, باید, توانستن) + a second verb with be- (بروم, بیایی, بخوانی)",
  },
  {
    id: "fa_passive",
    title: "Passive (نوشته شد, neveshte shod)",
    build: "participle (…e) + شدن (shod, mi-shavad…)",
    explanation:
      "The thing that receives the action is the subject: “the door opened / was opened”. Persian also uses this a lot for things that simply happen.",
    examples: [
      { text: "در باز شد.", translit: "dar bâz shod.", english: "The door was opened." },
      { text: "نامه نوشته شد.", translit: "nâme neveshte shod.", english: "The letter was written." },
      { text: "این کتاب در ایران ساخته می‌شود.", translit: "in ketâb dar irân sâxte mi-shavad.", english: "This is made in Iran." },
    ],
    hint: "a participle ending in e + شدن, such as نوشته شد",
  },
  {
    id: "fa_ezafe",
    title: "Ezafe (کتابِ من, ketâb-e man)",
    build: "noun + -e (spoken, rarely written) + the next word",
    explanation:
      "A small -e links a noun to what describes or owns it: book-of-me, city-of-big. It is almost never written, so you must hear it. It also joins a noun to an adjective.",
    examples: [
      { text: "کتاب من", translit: "ketâb-e man", english: "my book" },
      { text: "شهر بزرگ", translit: "shahr-e bozorg", english: "a big city" },
      { text: "دانشگاه تهران", translit: "dâneshgâh-e tehrân", english: "the University of Tehran" },
      { text: "مادر دوستم", translit: "mâdar-e dustam", english: "my friend's mother" },
    ],
    hint: "two words joined by the unwritten ezafe -e, such as کتاب من (ketâb-e man) or شهر بزرگ",
  },
  {
    id: "fa_ra",
    title: "Object marker را (râ)",
    build: "the specific object + را, before the verb",
    explanation:
      "را marks the direct object when it is a definite thing, such as “the book” or “this film”. A general object (“I read books”) has no را.",
    examples: [
      { text: "کتاب را خواندم.", translit: "ketâb râ xândam.", english: "I read the book." },
      { text: "او مرا دید.", translit: "u marâ did.", english: "He/she saw me." },
      { text: "این غذا را دوست دارم.", translit: "in qazâ râ dust dâram.", english: "I like this food." },
    ],
    hint: "a definite object followed by را, such as کتاب را",
  },
];
