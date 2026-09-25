// Quiz questions for `pnpm db:seed-quiz`: ordinary ones plus stress cases
// (long text, tall and wide images) that exercise the quiz layout.

const IMG = (imageSeed: string, w: number, h: number) =>
  `https://picsum.photos/seed/${imageSeed}/${w}/${h}`;

export type QuestionSeed = {
  text: string;
  imageUrl?: string;
  imageThumbnailUrl?: string;
  answers: {
    text: string;
    isCorrect: boolean;
    sortOrder: number;
    imageUrl?: string;
    imageThumbnailUrl?: string;
  }[];
};

// Long text helpers
const LONG_WORD = "Supercalifragilisticexpialidocious";
const LONG_ANSWER =
  "Questa è una risposta molto lunga che dovrebbe andare su più righe per testare il comportamento del line-clamp e verificare che il testo non rompa il layout";
const LONG_QUESTION =
  "Questa è una domanda estremamente lunga per verificare che il layout della domanda del quiz gestisca correttamente il testo lungo senza rompere nulla nel design, inclusi i margini e il padding?";

export const QUIZ_QUESTIONS: QuestionSeed[] = [
  // ── STRESS: Very long question text, no images ──
  {
    answers: [
      { isCorrect: true, sortOrder: 0, text: "Sì" },
      { isCorrect: false, sortOrder: 1, text: "No" },
    ],
    text: LONG_QUESTION,
  },

  // ── STRESS: Long unbreakable word in answers (text-only) ──
  {
    answers: [
      { isCorrect: true, sortOrder: 0, text: LONG_WORD },
      {
        isCorrect: false,
        sortOrder: 1,
        text: "Pneumoultramicroscopicsilicovolcanoconiosis",
      },
      { isCorrect: false, sortOrder: 2, text: "Ciao" },
    ],
    text: "Qual è la parola più lunga che conosci?",
  },

  // ── STRESS: Very long answer text (5+ lines), text-only, 4 answers ──
  {
    answers: [
      { isCorrect: true, sortOrder: 0, text: LONG_ANSWER },
      { isCorrect: false, sortOrder: 1, text: LONG_ANSWER },
      { isCorrect: false, sortOrder: 2, text: "Corta" },
      { isCorrect: false, sortOrder: 3, text: "Anche questa è breve" },
    ],
    text: "Quale risposta è troppo lunga?",
  },

  // ── STRESS: Single character answers ──
  {
    answers: [
      { isCorrect: true, sortOrder: 0, text: "A" },
      { isCorrect: false, sortOrder: 1, text: "Z" },
    ],
    text: "Quale lettera viene prima?",
  },

  // ── STRESS: Wide panoramic question image (21:9) ──
  {
    answers: [
      { isCorrect: true, sortOrder: 0, text: "Toscana" },
      { isCorrect: false, sortOrder: 1, text: "Umbria" },
      { isCorrect: false, sortOrder: 2, text: "Lazio" },
    ],
    imageThumbnailUrl: IMG("panorama-wide", 2100, 900),
    imageUrl: IMG("panorama-wide", 2100, 900),
    text: "Riconosci questo panorama?",
  },

  // ── STRESS: Tall portrait question image (9:16) ──
  {
    answers: [
      { isCorrect: true, sortOrder: 0, text: "Io" },
      { isCorrect: false, sortOrder: 1, text: "Tu" },
      { isCorrect: false, sortOrder: 2, text: "Nessuno dei due" },
      { isCorrect: false, sortOrder: 3, text: "Un amico" },
    ],
    imageThumbnailUrl: IMG("portrait-tall", 450, 800),
    imageUrl: IMG("portrait-tall", 450, 800),
    text: "Chi è in questa foto verticale?",
  },

  // ── STRESS: Square question image + portrait answer images (mixed aspect ratios) ──
  {
    answers: [
      {
        imageThumbnailUrl: IMG("answer-portrait-1", 300, 500),
        imageUrl: IMG("answer-portrait-1", 300, 500),
        isCorrect: true,
        sortOrder: 0,
        text: "Questa",
      },
      {
        imageThumbnailUrl: IMG("answer-landscape-1", 500, 300),
        imageUrl: IMG("answer-landscape-1", 500, 300),
        isCorrect: false,
        sortOrder: 1,
        text: "Quella",
      },
    ],
    imageThumbnailUrl: IMG("square-question", 600, 600),
    imageUrl: IMG("square-question", 600, 600),
    text: "Quale foto è stata scattata per prima?",
  },

  // ── STRESS: All answer images different aspect ratios (4 answers) ──
  {
    answers: [
      {
        imageThumbnailUrl: IMG("aspect-square", 400, 400),
        imageUrl: IMG("aspect-square", 400, 400),
        isCorrect: false,
        sortOrder: 0,
        text: "Quadrata",
      },
      {
        imageThumbnailUrl: IMG("aspect-ultrawide", 800, 200),
        imageUrl: IMG("aspect-ultrawide", 800, 200),
        isCorrect: true,
        sortOrder: 1,
        text: "Panoramica ultra-wide",
      },
      {
        imageThumbnailUrl: IMG("aspect-narrow", 200, 600),
        imageUrl: IMG("aspect-narrow", 200, 600),
        isCorrect: false,
        sortOrder: 2,
        text: "Verticale stretta",
      },
      {
        imageThumbnailUrl: IMG("aspect-standard", 400, 300),
        imageUrl: IMG("aspect-standard", 400, 300),
        isCorrect: false,
        sortOrder: 3,
        text: "Standard 4:3",
      },
    ],
    text: "Quale immagine ha il formato diverso?",
  },

  // ── STRESS: Mixed images + long text-only answers ──
  {
    answers: [
      {
        imageThumbnailUrl: IMG("weekend-park", 400, 400),
        imageUrl: IMG("weekend-park", 400, 400),
        isCorrect: false,
        sortOrder: 0,
        text: "Passeggiata al parco con il cane e poi gelato in centro",
      },
      {
        isCorrect: true,
        sortOrder: 1,
        text: "Restare a casa a guardare film tutto il giorno sotto le coperte con cioccolata calda e popcorn",
      },
      {
        isCorrect: false,
        sortOrder: 2,
        text: "Viaggio improvvisato in una città che non abbiamo mai visitato prima senza prenotare nulla",
      },
      {
        imageThumbnailUrl: IMG("weekend-brunch", 400, 400),
        imageUrl: IMG("weekend-brunch", 400, 400),
        isCorrect: false,
        sortOrder: 3,
        text: "Brunch con amici",
      },
    ],
    text: "Quale opzione descrive meglio il nostro weekend ideale?",
  },

  // ── STRESS: Tiny question image (100x100) ──
  {
    answers: [
      { isCorrect: true, sortOrder: 0, text: "Un fiore" },
      { isCorrect: false, sortOrder: 1, text: "Un albero" },
    ],
    imageThumbnailUrl: IMG("tiny-img", 100, 100),
    imageUrl: IMG("tiny-img", 100, 100),
    text: "Riesci a riconoscere questa immagine minuscola?",
  },

  // ── STRESS: Huge question image (4K) + tiny answer images ──
  {
    answers: [
      {
        imageThumbnailUrl: IMG("tiny-detail-1", 50, 50),
        imageUrl: IMG("tiny-detail-1", 50, 50),
        isCorrect: true,
        sortOrder: 0,
        text: "Il riflesso nell'acqua",
      },
      {
        imageThumbnailUrl: IMG("tiny-detail-2", 80, 30),
        imageUrl: IMG("tiny-detail-2", 80, 30),
        isCorrect: false,
        sortOrder: 1,
        text: "L'ombra dell'albero",
      },
      {
        isCorrect: false,
        sortOrder: 2,
        text: "Niente di speciale",
      },
    ],
    imageThumbnailUrl: IMG("huge-4k", 3840, 2160),
    imageUrl: IMG("huge-4k", 3840, 2160),
    text: "Quale dettaglio noti in questa foto ad alta risoluzione?",
  },

  // ── STRESS: Long unbreakable text in image grid (mixed) ──
  {
    answers: [
      {
        imageThumbnailUrl: IMG("hashtag-love", 400, 400),
        imageUrl: IMG("hashtag-love", 400, 400),
        isCorrect: true,
        sortOrder: 0,
        text: "#AmoreMioPerSempreInsieme",
      },
      {
        isCorrect: false,
        sortOrder: 1,
        text: "#VacanzaEstivaAlMareConTramonto2024ItaliaRelaxBellissimo",
      },
      {
        isCorrect: false,
        sortOrder: 2,
        text: "#CoppiaPerfettaPerSempreNelBeneENelMaleFinoAllaFineDelMondo",
      },
      {
        imageThumbnailUrl: IMG("hashtag-us", 400, 400),
        imageUrl: IMG("hashtag-us", 400, 400),
        isCorrect: false,
        sortOrder: 3,
        text: "#Noi",
      },
    ],
    text: "Qual è l'hashtag giusto?",
  },

  // ── NORMAL: Standard text-only, 2 answers ──
  {
    answers: [
      { isCorrect: true, sortOrder: 0, text: "Blu" },
      { isCorrect: false, sortOrder: 1, text: "Rosso" },
    ],
    text: "Qual è il nostro colore preferito?",
  },

  // ── NORMAL: Standard with image, 4 answers ──
  {
    answers: [
      { isCorrect: true, sortOrder: 0, text: "Sardegna" },
      { isCorrect: false, sortOrder: 1, text: "Sicilia" },
      { isCorrect: false, sortOrder: 2, text: "Puglia" },
      { isCorrect: false, sortOrder: 3, text: "Calabria" },
    ],
    imageThumbnailUrl: IMG("vacation-normal", 800, 600),
    imageUrl: IMG("vacation-normal", 800, 600),
    text: "Dove eravamo in vacanza?",
  },

  // ── STRESS: All 4 answers are very long paragraphs (text-only) ──
  {
    answers: [
      {
        isCorrect: true,
        sortOrder: 0,
        text: "Quella volta che siamo rimasti bloccati sotto la pioggia e abbiamo corso fino al bar più vicino ridendo come matti",
      },
      {
        isCorrect: false,
        sortOrder: 1,
        text: "Quando abbiamo cucinato la torta per il compleanno e l'abbiamo bruciata ma l'abbiamo mangiata lo stesso",
      },
      {
        isCorrect: false,
        sortOrder: 2,
        text: "La sera che abbiamo guardato le stelle cadenti dal tetto e abbiamo espresso lo stesso desiderio senza saperlo",
      },
      {
        isCorrect: false,
        sortOrder: 3,
        text: "Il nostro primo viaggio insieme quando ci siamo persi e abbiamo scoperto quel ristorante nascosto fantastico",
      },
    ],
    text: "Quale ricordo è il più bello?",
  },

  // ── STRESS: Portrait answer images + long footer text ──
  {
    answers: [
      {
        imageThumbnailUrl: IMG("dress-black", 300, 600),
        imageUrl: IMG("dress-black", 300, 600),
        isCorrect: true,
        sortOrder: 0,
        text: "Il vestito nero elegante con le scarpe col tacco alto argentate",
      },
      {
        imageThumbnailUrl: IMG("suit-blue", 300, 600),
        imageUrl: IMG("suit-blue", 300, 600),
        isCorrect: false,
        sortOrder: 1,
        text: "Il completo blu con la cravatta rossa a pois bianchi e i gemelli dorati",
      },
    ],
    text: "Quale vestito mi stava meglio alla festa di Capodanno?",
  },

  // ── STRESS: 3 answers, 2 images + 1 text, all with long text ──
  {
    answers: [
      {
        imageThumbnailUrl: IMG("sunset-proposal", 500, 400),
        imageUrl: IMG("sunset-proposal", 500, 400),
        isCorrect: true,
        sortOrder: 0,
        text: "La proposta di matrimonio al tramonto sulla spiaggia con i petali di rosa rossi",
      },
      {
        imageThumbnailUrl: IMG("first-dance", 400, 500),
        imageUrl: IMG("first-dance", 400, 500),
        isCorrect: false,
        sortOrder: 1,
        text: "Il primo ballo insieme alla festa di laurea sotto le luci colorate con la musica dal vivo",
      },
      {
        isCorrect: false,
        sortOrder: 2,
        text: "Quando abbiamo adottato il nostro primo gattino dal rifugio e gli abbiamo dato il nome",
      },
    ],
    text: "Quale di questi momenti ricordi con più emozione?",
  },

  // ── STRESS: Very wide answer images (panoramic 3:1) ──
  {
    answers: [
      {
        imageThumbnailUrl: IMG("pano-sea", 900, 300),
        imageUrl: IMG("pano-sea", 900, 300),
        isCorrect: true,
        sortOrder: 0,
        text: "Mare",
      },
      {
        imageThumbnailUrl: IMG("pano-mountain", 900, 300),
        imageUrl: IMG("pano-mountain", 900, 300),
        isCorrect: false,
        sortOrder: 1,
        text: "Montagna",
      },
      {
        imageThumbnailUrl: IMG("pano-city", 900, 300),
        imageUrl: IMG("pano-city", 900, 300),
        isCorrect: false,
        sortOrder: 2,
        text: "Città",
      },
      {
        imageThumbnailUrl: IMG("pano-country", 900, 300),
        imageUrl: IMG("pano-country", 900, 300),
        isCorrect: false,
        sortOrder: 3,
        text: "Campagna",
      },
    ],
    text: "Quale panorama è il più bello?",
  },

  // ── STRESS: Emoji and special characters in text ──
  {
    answers: [
      { isCorrect: true, sortOrder: 0, text: "❤️ Cuore rosso" },
      { isCorrect: false, sortOrder: 1, text: "😂 Lacrime di gioia" },
      {
        isCorrect: false,
        sortOrder: 2,
        text: "🥰 Faccina innamorata con cuoricini",
      },
      { isCorrect: false, sortOrder: 3, text: "🔥 Fuoco" },
    ],
    text: "Quale emoji usiamo di più nelle chat? 💬",
  },

  // ── NORMAL: Clean 3-answer with question image ──
  {
    answers: [
      { isCorrect: true, sortOrder: 0, text: "Pizza" },
      { isCorrect: false, sortOrder: 1, text: "Sushi" },
      { isCorrect: false, sortOrder: 2, text: "Hamburger" },
    ],
    imageThumbnailUrl: IMG("food-plate", 800, 600),
    imageUrl: IMG("food-plate", 800, 600),
    text: "Cosa stavamo mangiando?",
  },

  // ── STRESS: Extreme tall question image (1:4 ratio) ──
  {
    answers: [
      { isCorrect: true, sortOrder: 0, text: "Una torre" },
      { isCorrect: false, sortOrder: 1, text: "Un grattacielo" },
      { isCorrect: false, sortOrder: 2, text: "Una scala" },
    ],
    imageThumbnailUrl: IMG("extreme-tall-question", 600, 2400),
    imageUrl: IMG("extreme-tall-question", 600, 2400),
    text: "Cosa vedi in questa immagine lunghissima?",
  },

  // ── STRESS: Extreme tall answer images (1:4 and 1:6 ratios) ──
  {
    answers: [
      {
        imageThumbnailUrl: IMG("extreme-tall-answer-1", 400, 1600),
        imageUrl: IMG("extreme-tall-answer-1", 400, 1600),
        isCorrect: true,
        sortOrder: 0,
        text: "Questo",
      },
      {
        imageThumbnailUrl: IMG("extreme-tall-answer-2", 300, 1800),
        imageUrl: IMG("extreme-tall-answer-2", 300, 1800),
        isCorrect: false,
        sortOrder: 1,
        text: "Quello",
      },
      {
        isCorrect: false,
        sortOrder: 2,
        text: "Nessuno dei due",
      },
    ],
    text: "Quale screenshot del telefono è il nostro?",
  },

  // ── STRESS: Phone screenshot dimensions (1080×3000) question + answers ──
  {
    answers: [
      {
        imageThumbnailUrl: IMG("phone-screenshot-a1", 1080, 3000),
        imageUrl: IMG("phone-screenshot-a1", 1080, 3000),
        isCorrect: true,
        sortOrder: 0,
        text: "Chat di WhatsApp",
      },
      {
        imageThumbnailUrl: IMG("phone-screenshot-a2", 1080, 3000),
        imageUrl: IMG("phone-screenshot-a2", 1080, 3000),
        isCorrect: false,
        sortOrder: 1,
        text: "Feed di Instagram",
      },
    ],
    imageThumbnailUrl: IMG("phone-screenshot-q", 1080, 3000),
    imageUrl: IMG("phone-screenshot-q", 1080, 3000),
    text: "Riconosci questo screenshot del telefono?",
  },
];
