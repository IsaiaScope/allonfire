import { prisma } from "./index";
import { createQuizQuestion } from "./services/quiz.service";

const IMG = (seed: string, w: number, h: number) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

type QuestionSeed = {
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

const questions: QuestionSeed[] = [
  // ── STRESS: Very long question text, no images ──
  {
    text: LONG_QUESTION,
    answers: [
      { text: "Sì", isCorrect: true, sortOrder: 0 },
      { text: "No", isCorrect: false, sortOrder: 1 },
    ],
  },

  // ── STRESS: Long unbreakable word in answers (text-only) ──
  {
    text: "Qual è la parola più lunga che conosci?",
    answers: [
      { text: LONG_WORD, isCorrect: true, sortOrder: 0 },
      {
        text: "Pneumoultramicroscopicsilicovolcanoconiosis",
        isCorrect: false,
        sortOrder: 1,
      },
      { text: "Ciao", isCorrect: false, sortOrder: 2 },
    ],
  },

  // ── STRESS: Very long answer text (5+ lines), text-only, 4 answers ──
  {
    text: "Quale risposta è troppo lunga?",
    answers: [
      { text: LONG_ANSWER, isCorrect: true, sortOrder: 0 },
      { text: LONG_ANSWER, isCorrect: false, sortOrder: 1 },
      { text: "Corta", isCorrect: false, sortOrder: 2 },
      { text: "Anche questa è breve", isCorrect: false, sortOrder: 3 },
    ],
  },

  // ── STRESS: Single character answers ──
  {
    text: "Quale lettera viene prima?",
    answers: [
      { text: "A", isCorrect: true, sortOrder: 0 },
      { text: "Z", isCorrect: false, sortOrder: 1 },
    ],
  },

  // ── STRESS: Wide panoramic question image (21:9) ──
  {
    text: "Riconosci questo panorama?",
    imageUrl: IMG("panorama-wide", 2100, 900),
    imageThumbnailUrl: IMG("panorama-wide", 2100, 900),
    answers: [
      { text: "Toscana", isCorrect: true, sortOrder: 0 },
      { text: "Umbria", isCorrect: false, sortOrder: 1 },
      { text: "Lazio", isCorrect: false, sortOrder: 2 },
    ],
  },

  // ── STRESS: Tall portrait question image (9:16) ──
  {
    text: "Chi è in questa foto verticale?",
    imageUrl: IMG("portrait-tall", 450, 800),
    imageThumbnailUrl: IMG("portrait-tall", 450, 800),
    answers: [
      { text: "Io", isCorrect: true, sortOrder: 0 },
      { text: "Tu", isCorrect: false, sortOrder: 1 },
      { text: "Nessuno dei due", isCorrect: false, sortOrder: 2 },
      { text: "Un amico", isCorrect: false, sortOrder: 3 },
    ],
  },

  // ── STRESS: Square question image + portrait answer images (mixed aspect ratios) ──
  {
    text: "Quale foto è stata scattata per prima?",
    imageUrl: IMG("square-question", 600, 600),
    imageThumbnailUrl: IMG("square-question", 600, 600),
    answers: [
      {
        text: "Questa",
        isCorrect: true,
        sortOrder: 0,
        imageUrl: IMG("answer-portrait-1", 300, 500),
        imageThumbnailUrl: IMG("answer-portrait-1", 300, 500),
      },
      {
        text: "Quella",
        isCorrect: false,
        sortOrder: 1,
        imageUrl: IMG("answer-landscape-1", 500, 300),
        imageThumbnailUrl: IMG("answer-landscape-1", 500, 300),
      },
    ],
  },

  // ── STRESS: All answer images different aspect ratios (4 answers) ──
  {
    text: "Quale immagine ha il formato diverso?",
    answers: [
      {
        text: "Quadrata",
        isCorrect: false,
        sortOrder: 0,
        imageUrl: IMG("aspect-square", 400, 400),
        imageThumbnailUrl: IMG("aspect-square", 400, 400),
      },
      {
        text: "Panoramica ultra-wide",
        isCorrect: true,
        sortOrder: 1,
        imageUrl: IMG("aspect-ultrawide", 800, 200),
        imageThumbnailUrl: IMG("aspect-ultrawide", 800, 200),
      },
      {
        text: "Verticale stretta",
        isCorrect: false,
        sortOrder: 2,
        imageUrl: IMG("aspect-narrow", 200, 600),
        imageThumbnailUrl: IMG("aspect-narrow", 200, 600),
      },
      {
        text: "Standard 4:3",
        isCorrect: false,
        sortOrder: 3,
        imageUrl: IMG("aspect-standard", 400, 300),
        imageThumbnailUrl: IMG("aspect-standard", 400, 300),
      },
    ],
  },

  // ── STRESS: Mixed images + long text-only answers ──
  {
    text: "Quale opzione descrive meglio il nostro weekend ideale?",
    answers: [
      {
        text: "Passeggiata al parco con il cane e poi gelato in centro",
        isCorrect: false,
        sortOrder: 0,
        imageUrl: IMG("weekend-park", 400, 400),
        imageThumbnailUrl: IMG("weekend-park", 400, 400),
      },
      {
        text: "Restare a casa a guardare film tutto il giorno sotto le coperte con cioccolata calda e popcorn",
        isCorrect: true,
        sortOrder: 1,
      },
      {
        text: "Viaggio improvvisato in una città che non abbiamo mai visitato prima senza prenotare nulla",
        isCorrect: false,
        sortOrder: 2,
      },
      {
        text: "Brunch con amici",
        isCorrect: false,
        sortOrder: 3,
        imageUrl: IMG("weekend-brunch", 400, 400),
        imageThumbnailUrl: IMG("weekend-brunch", 400, 400),
      },
    ],
  },

  // ── STRESS: Tiny question image (100x100) ──
  {
    text: "Riesci a riconoscere questa immagine minuscola?",
    imageUrl: IMG("tiny-img", 100, 100),
    imageThumbnailUrl: IMG("tiny-img", 100, 100),
    answers: [
      { text: "Un fiore", isCorrect: true, sortOrder: 0 },
      { text: "Un albero", isCorrect: false, sortOrder: 1 },
    ],
  },

  // ── STRESS: Huge question image (4K) + tiny answer images ──
  {
    text: "Quale dettaglio noti in questa foto ad alta risoluzione?",
    imageUrl: IMG("huge-4k", 3840, 2160),
    imageThumbnailUrl: IMG("huge-4k", 3840, 2160),
    answers: [
      {
        text: "Il riflesso nell'acqua",
        isCorrect: true,
        sortOrder: 0,
        imageUrl: IMG("tiny-detail-1", 50, 50),
        imageThumbnailUrl: IMG("tiny-detail-1", 50, 50),
      },
      {
        text: "L'ombra dell'albero",
        isCorrect: false,
        sortOrder: 1,
        imageUrl: IMG("tiny-detail-2", 80, 30),
        imageThumbnailUrl: IMG("tiny-detail-2", 80, 30),
      },
      {
        text: "Niente di speciale",
        isCorrect: false,
        sortOrder: 2,
      },
    ],
  },

  // ── STRESS: Long unbreakable text in image grid (mixed) ──
  {
    text: "Qual è l'hashtag giusto?",
    answers: [
      {
        text: "#AmoreMioPerSempreInsieme",
        isCorrect: true,
        sortOrder: 0,
        imageUrl: IMG("hashtag-love", 400, 400),
        imageThumbnailUrl: IMG("hashtag-love", 400, 400),
      },
      {
        text: "#VacanzaEstivaAlMareConTramonto2024ItaliaRelaxBellissimo",
        isCorrect: false,
        sortOrder: 1,
      },
      {
        text: "#CoppiaPerfettaPerSempreNelBeneENelMaleFinoAllaFineDelMondo",
        isCorrect: false,
        sortOrder: 2,
      },
      {
        text: "#Noi",
        isCorrect: false,
        sortOrder: 3,
        imageUrl: IMG("hashtag-us", 400, 400),
        imageThumbnailUrl: IMG("hashtag-us", 400, 400),
      },
    ],
  },

  // ── NORMAL: Standard text-only, 2 answers ──
  {
    text: "Qual è il nostro colore preferito?",
    answers: [
      { text: "Blu", isCorrect: true, sortOrder: 0 },
      { text: "Rosso", isCorrect: false, sortOrder: 1 },
    ],
  },

  // ── NORMAL: Standard with image, 4 answers ──
  {
    text: "Dove eravamo in vacanza?",
    imageUrl: IMG("vacation-normal", 800, 600),
    imageThumbnailUrl: IMG("vacation-normal", 800, 600),
    answers: [
      { text: "Sardegna", isCorrect: true, sortOrder: 0 },
      { text: "Sicilia", isCorrect: false, sortOrder: 1 },
      { text: "Puglia", isCorrect: false, sortOrder: 2 },
      { text: "Calabria", isCorrect: false, sortOrder: 3 },
    ],
  },

  // ── STRESS: All 4 answers are very long paragraphs (text-only) ──
  {
    text: "Quale ricordo è il più bello?",
    answers: [
      {
        text: "Quella volta che siamo rimasti bloccati sotto la pioggia e abbiamo corso fino al bar più vicino ridendo come matti",
        isCorrect: true,
        sortOrder: 0,
      },
      {
        text: "Quando abbiamo cucinato la torta per il compleanno e l'abbiamo bruciata ma l'abbiamo mangiata lo stesso",
        isCorrect: false,
        sortOrder: 1,
      },
      {
        text: "La sera che abbiamo guardato le stelle cadenti dal tetto e abbiamo espresso lo stesso desiderio senza saperlo",
        isCorrect: false,
        sortOrder: 2,
      },
      {
        text: "Il nostro primo viaggio insieme quando ci siamo persi e abbiamo scoperto quel ristorante nascosto fantastico",
        isCorrect: false,
        sortOrder: 3,
      },
    ],
  },

  // ── STRESS: Portrait answer images + long footer text ──
  {
    text: "Quale vestito mi stava meglio alla festa di Capodanno?",
    answers: [
      {
        text: "Il vestito nero elegante con le scarpe col tacco alto argentate",
        isCorrect: true,
        sortOrder: 0,
        imageUrl: IMG("dress-black", 300, 600),
        imageThumbnailUrl: IMG("dress-black", 300, 600),
      },
      {
        text: "Il completo blu con la cravatta rossa a pois bianchi e i gemelli dorati",
        isCorrect: false,
        sortOrder: 1,
        imageUrl: IMG("suit-blue", 300, 600),
        imageThumbnailUrl: IMG("suit-blue", 300, 600),
      },
    ],
  },

  // ── STRESS: 3 answers, 2 images + 1 text, all with long text ──
  {
    text: "Quale di questi momenti ricordi con più emozione?",
    answers: [
      {
        text: "La proposta di matrimonio al tramonto sulla spiaggia con i petali di rosa rossi",
        isCorrect: true,
        sortOrder: 0,
        imageUrl: IMG("sunset-proposal", 500, 400),
        imageThumbnailUrl: IMG("sunset-proposal", 500, 400),
      },
      {
        text: "Il primo ballo insieme alla festa di laurea sotto le luci colorate con la musica dal vivo",
        isCorrect: false,
        sortOrder: 1,
        imageUrl: IMG("first-dance", 400, 500),
        imageThumbnailUrl: IMG("first-dance", 400, 500),
      },
      {
        text: "Quando abbiamo adottato il nostro primo gattino dal rifugio e gli abbiamo dato il nome",
        isCorrect: false,
        sortOrder: 2,
      },
    ],
  },

  // ── STRESS: Very wide answer images (panoramic 3:1) ──
  {
    text: "Quale panorama è il più bello?",
    answers: [
      {
        text: "Mare",
        isCorrect: true,
        sortOrder: 0,
        imageUrl: IMG("pano-sea", 900, 300),
        imageThumbnailUrl: IMG("pano-sea", 900, 300),
      },
      {
        text: "Montagna",
        isCorrect: false,
        sortOrder: 1,
        imageUrl: IMG("pano-mountain", 900, 300),
        imageThumbnailUrl: IMG("pano-mountain", 900, 300),
      },
      {
        text: "Città",
        isCorrect: false,
        sortOrder: 2,
        imageUrl: IMG("pano-city", 900, 300),
        imageThumbnailUrl: IMG("pano-city", 900, 300),
      },
      {
        text: "Campagna",
        isCorrect: false,
        sortOrder: 3,
        imageUrl: IMG("pano-country", 900, 300),
        imageThumbnailUrl: IMG("pano-country", 900, 300),
      },
    ],
  },

  // ── STRESS: Emoji and special characters in text ──
  {
    text: "Quale emoji usiamo di più nelle chat? 💬",
    answers: [
      { text: "❤️ Cuore rosso", isCorrect: true, sortOrder: 0 },
      { text: "😂 Lacrime di gioia", isCorrect: false, sortOrder: 1 },
      {
        text: "🥰 Faccina innamorata con cuoricini",
        isCorrect: false,
        sortOrder: 2,
      },
      { text: "🔥 Fuoco", isCorrect: false, sortOrder: 3 },
    ],
  },

  // ── NORMAL: Clean 3-answer with question image ──
  {
    text: "Cosa stavamo mangiando?",
    imageUrl: IMG("food-plate", 800, 600),
    imageThumbnailUrl: IMG("food-plate", 800, 600),
    answers: [
      { text: "Pizza", isCorrect: true, sortOrder: 0 },
      { text: "Sushi", isCorrect: false, sortOrder: 1 },
      { text: "Hamburger", isCorrect: false, sortOrder: 2 },
    ],
  },

  // ── STRESS: Extreme tall question image (1:4 ratio) ──
  {
    text: "Cosa vedi in questa immagine lunghissima?",
    imageUrl: IMG("extreme-tall-question", 600, 2400),
    imageThumbnailUrl: IMG("extreme-tall-question", 600, 2400),
    answers: [
      { text: "Una torre", isCorrect: true, sortOrder: 0 },
      { text: "Un grattacielo", isCorrect: false, sortOrder: 1 },
      { text: "Una scala", isCorrect: false, sortOrder: 2 },
    ],
  },

  // ── STRESS: Extreme tall answer images (1:4 and 1:6 ratios) ──
  {
    text: "Quale screenshot del telefono è il nostro?",
    answers: [
      {
        text: "Questo",
        isCorrect: true,
        sortOrder: 0,
        imageUrl: IMG("extreme-tall-answer-1", 400, 1600),
        imageThumbnailUrl: IMG("extreme-tall-answer-1", 400, 1600),
      },
      {
        text: "Quello",
        isCorrect: false,
        sortOrder: 1,
        imageUrl: IMG("extreme-tall-answer-2", 300, 1800),
        imageThumbnailUrl: IMG("extreme-tall-answer-2", 300, 1800),
      },
      {
        text: "Nessuno dei due",
        isCorrect: false,
        sortOrder: 2,
      },
    ],
  },

  // ── STRESS: Phone screenshot dimensions (1080×3000) question + answers ──
  {
    text: "Riconosci questo screenshot del telefono?",
    imageUrl: IMG("phone-screenshot-q", 1080, 3000),
    imageThumbnailUrl: IMG("phone-screenshot-q", 1080, 3000),
    answers: [
      {
        text: "Chat di WhatsApp",
        isCorrect: true,
        sortOrder: 0,
        imageUrl: IMG("phone-screenshot-a1", 1080, 3000),
        imageThumbnailUrl: IMG("phone-screenshot-a1", 1080, 3000),
      },
      {
        text: "Feed di Instagram",
        isCorrect: false,
        sortOrder: 1,
        imageUrl: IMG("phone-screenshot-a2", 1080, 3000),
        imageThumbnailUrl: IMG("phone-screenshot-a2", 1080, 3000),
      },
    ],
  },
];

async function seed() {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true, name: true },
  });

  if (!admin) {
    console.error("No admin user found");
    process.exit(1);
  }

  // Clear existing quiz data
  console.log("Clearing existing quiz questions...");
  await prisma.quizAnswer.deleteMany();
  await prisma.quizQuestion.deleteMany();

  console.log(`Seeding as ${admin.name} (${admin.id})`);

  for (const q of questions) {
    const created = await createQuizQuestion({
      text: q.text,
      createdBy: admin.id,
      imageUrl: q.imageUrl,
      imageThumbnailUrl: q.imageThumbnailUrl,
      answers: q.answers,
    });
    console.log(`  + ${created.id}: ${q.text.slice(0, 60)}...`);
  }

  console.log(`\nSeeded ${questions.length} quiz questions`);
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
