/* =========================================================
   EDUBOOK LMS — MOCK / SEED DATA
   Everything here is sample content only, used to seed
   localStorage on first run (see app.js -> seedIfNeeded).
========================================================= */

const SEED = {

  users: {
    "student@edubook.test": {
      password: "student123", role: "student", id: "STU-2025-0142",
      name: "Juan Dela Cruz", firstName: "Juan",
      grade: "Grade 10", section: "Einstein",
      email: "student@edubook.test", subjects: ["ttl"]
    },
    "teacher@edubook.test": {
      password: "teacher123", role: "teacher", id: "TCH-2019-0031",
      name: "Maria Santos", firstName: "Maria",
      department: "Science & Technology",
      email: "teacher@edubook.test", subjects: ["ttl"]
    },
    "admin@edubook.test": {
      password: "admin123", role: "admin", id: "ADM-0007",
      name: "Ramon Aquino", firstName: "Ramon",
      title: "System Administrator",
      email: "admin@edubook.test"
    }
  },

  subjects: {
    ttl: {
      id: "ttl", name: "Technology for Teaching and Learning", teacher: "Maria Santos", color: ["#4338CA", "#7C3AED"],
      initial: "TT",
      coverImage: "assets/ttl_cover.png",
      description: "Explores the social, ethical, and legal responsibilities involved in using technology tools and resources in education, including digital citizenship, intellectual property, online safety, and responsible participation in digital learning communities.",
      objectives: [
        "Explain and apply the principles of digital citizenship, netiquette, digital safety, and responsible online behavior in creating a safe, respectful, and productive digital learning environment.",
        "Analyze and evaluate situations involving intellectual property rights, cyberbullying, and social, ethical, and legal responsibilities in the use of technology, and determine appropriate actions as responsible educators and netizens.",
        "Design and implement responsible technology-based practices using educational sites, portals, and online communities of learning while observing ethical, legal, and safety standards."
      ],
      moduleIds: ["m-ttl-1"]
    }
  },

  modules: {
    "m-ttl-1": {
      id: "m-ttl-1", subjectId: "ttl", number: 1,
      title: "Social, Ethical, and Legal Responsibilities in the Use of Technology Tools and Resources",
      description: "Covers digital citizenship, intellectual property rights, digital safety rules, cyberbullying, netizens in cyberspace, netiquette, educational sites and portals, and online communities of learning.",
      coverImage: "assets/ttl_cover.png",
      readingMins: 35, quizId: "q-ttl-1",
      steps: ["Read Lesson Pages", "Watch Video", "Complete Activity", "Take Quiz", "Complete Lesson"],
      pages: [
        { type: "cover", title: "Social, Ethical, and Legal Responsibilities in the Use of Technology Tools and Resources", sub: "Module 1 · Technology for Teaching and Learning", coverImage: "assets/ttl_cover.png" },
        {
          type: "objectives", heading: "Learning Objectives", items: [
            "Explain and apply the principles of digital citizenship, netiquette, digital safety, and responsible online behavior in creating a safe, respectful, and productive digital learning environment.",
            "Analyze and evaluate situations involving intellectual property rights, cyberbullying, and social, ethical, and legal responsibilities in the use of technology, and determine appropriate actions as responsible educators and netizens.",
            "Design and implement responsible technology-based practices using educational sites, portals, and online communities of learning while observing ethical, legal, and safety standards."
          ]
        },
        {
          type: "lesson", heading: "Digital Citizenship", body: [
            "Digital citizenship refers to the responsible, ethical, and safe use of digital technologies, encompassing how we interact, create, share, and behave online.",
            "It involves respecting others, protecting personal information, following online rules, and using digital resources appropriately. In education, digital citizenship helps learners use technology responsibly while promoting a safe, respectful, and positive online learning environment."
          ]
        },
        {
          type: "lesson", heading: "Social, Ethical and Legal Responsibilities in the Use of Technology", body: [
            "Using technology responsibly means respecting other people, protecting personal information, and using digital resources in an honest and appropriate way.",
            "It also means following laws and rules related to privacy, copyright, intellectual property, and online behavior. Responsible technology users think about the possible effects of their actions before posting, sharing, or using digital content."
          ]
        },
        {
          type: "lesson", heading: "Intellectual Property Rights", body: [
            "Intellectual Property Rights (IPR) refer to the legal rights that protect original creations of individuals or organizations in education, this may include books, articles, research papers, photographs, videos, presentations, instructional materials, and computer programs.",
            "Availability of information online does not mean it is free to copy, modify, or distribute. Copyright protects original creative works and gives creators rights over how their works are reproduced, distributed, or otherwise used.",
            "Copying an article and submitting it as one's own work is plagiarism and violates academic integrity. In the Philippines, intellectual property is primarily protected under Republic Act No. 8293, the Intellectual Property Code of the Philippines."
          ], note: "For future teachers: practice proper citation and attribution, and teach learners to respect the work of others."
        },
        {
          type: "lesson", heading: "Digital Safety Rules", body: [
            "Digital technology exposes users to risks such as privacy violations, scams, malware, identity theft, and misuse of personal information. Digital safety requires practicing precautions when using technology.",
            "a. Protect personal information avoid sharing passwords, addresses, and financial details with untrusted individuals or sites.",
            "b. Use strong and secure passwords avoid birthdays, names, or common words; never share passwords.",
            "c. Think before you click — verify the source of unfamiliar links, attachments, or pop-ups before opening.",
            "d. Download only from trusted sources to minimize security risks.",
            "e. Check privacy settings on social media and online platforms regularly.",
            "f. Be careful when using public Wi-Fi — avoid entering sensitive information over unsecured networks.",
            "g. Think before posting or sharing online content can be copied, saved, and redistributed.",
            "h. Respect other people's privacy don't share their photos, messages, or personal information without permission.",
            "i. Maintain a positive digital footprint — online activity can affect personal, academic, and professional reputation.",
            "j. Report suspicious or harmful activities to the appropriate platform, teacher, or authority.",
            "k. Keep devices and applications updated to improve protection against security threats.",
            "l. Practice responsible digital citizenship — use technology with respect, responsibility, and good judgment."
          ], note: "Republic Act No. 10173, the Data Privacy Act of 2012, provides the legal framework for protecting personal information in the Philippines."
        },
        {
          type: "lesson", heading: "Cyberbullying", body: [
            "Cyberbullying is a form of bullying that occurs through digital technologies — social media, text messaging, email, online games, and messaging apps — involving harmful, threatening, humiliating, or offensive content about another person.",
            "It may include: spreading rumors or false information online; posting embarrassing photos or videos without permission; sending threatening or insulting messages; creating fake accounts to ridicule someone; deliberately excluding someone from online groups; and repeatedly sending harmful or intimidating messages.",
            "Preventing it requires students to communicate respectfully, avoid harmful behavior, and report incidents, while teachers maintain a safe learning environment."
          ], note: "Republic Act No. 10627, the Anti-Bullying Act of 2013, gives schools a legal basis for preventing and addressing bullying, including through electronic means."
        },
        {
          type: "lesson", heading: "Netizens in Cyberspace", body: [
            "Importance of Netizens: Netizens play an important role in spreading information and connecting people — using the internet for education, communication, entertainment, and social awareness, and helping bring attention to important issues.",
            "Responsibilities of Netizens: Being a responsible netizen means thinking carefully before posting or sharing information, respecting others, protecting privacy, avoiding cyberbullying, checking whether information is reliable, and following online rules."
          ]
        },
        {
          type: "presentation", heading: "Netiquette: The 10 Core Rules", slides: [
            "Netiquette is the proper and respectful way of communicating and behaving when using the internet.",
            "Rule 1: Remember the human.",
            "Rule 2: Adhere to the same standards of behavior online that you follow in real life.",
            "Rule 3: Know where you are in cyberspace.",
            "Rule 4: Respect other people's time and bandwidth.",
            "Rule 5: Make yourself look good online.",
            "Rule 6: Share expert knowledge.",
            "Rule 7: Help keep flame wars under control.",
            "Rule 8: Respect other people's privacy.",
            "Rule 9: Don't abuse your power.",
            "Rule 10: Be forgiving of other people's mistakes.",
            "(Based on Virginia Shea's Netiquette guide.)"
          ]
        },
        {
          type: "lesson", heading: "Educational Sites and Portals", body: [
            "Educational sites and portals let students learn anytime and anywhere — watching videos, reading articles, answering quizzes, submitting assignments, and reviewing lessons at their own pace.",
            "Using them also requires responsibility: not everything online is accurate, so students should learn to identify trustworthy sources, avoid copying information without understanding it, and use proper online behavior with teachers and classmates."
          ]
        },
        {
          type: "lesson", heading: "Online Communities of Learning", body: [
            "An online community of learning is a group of people who use digital platforms to learn, communicate, and share knowledge — including students, teachers, and other learners interacting through discussion boards, group chats, video meetings, or learning platforms.",
            "These communities require responsible and respectful behavior: avoiding false information, protecting personal information, and communicating politely.",
            "Examples include students using Google Classroom or class group chats to discuss assignments, or online study groups sharing notes and explaining difficult topics."
          ]
        },
        {
          type: "video", heading: "Movie Analysis: Cyberbullying Awareness", videoUrl: "https://www.youtube.com/watch?v=be6gjjWdUw4",
          description: "Watch this movie and pay attention to how the characters use (or misuse) technology and social media, and how it affects the people around them. You will analyze it in the activity that follows."
        },
        {
          type: "activity", heading: "Activity: Movie Analysis", instructions: [
            "How did the characters in the movie demonstrate responsible or irresponsible use of technology and social media?",
            "What social and ethical responsibilities were ignored when hurtful comments, rumors, and personal information were shared online?",
            "How did the misuse of technology affect the victim, her family, friends, and the people involved in the cyberbullying?",
            "What legal or privacy issues can be identified from the hacking, sharing of personal information, and creation or use of online accounts shown in the movie?",
            "If you were in the situation of the characters, what responsible actions would you take to prevent cyberbullying and promote safe, ethical, and respectful use of technology?",
            "Submit your written analysis to your teacher through the Assignments section — it will be graded using the Movie Analysis rubric (Understanding of the Movie, Analysis of Cyberbullying, Character and Theme Analysis, Critical Thinking and Personal Reflection, and Evidence/Organization/Writing)."
          ]
        }
      ]
    }
  },

  quizzes: {
    "q-ttl-1": {
      id: "q-ttl-1", moduleId: "m-ttl-1", subjectId: "ttl", title: "30-Item Quiz: Social, Ethical, and Legal Responsibilities in Technology", questions: [
        { q: "Digital citizenship refers to the responsible, ethical, and legal use of technology and the internet.", choices: ["True", "False"], answer: 0, type: "tf" },
        { q: "A good digital citizen respects the rights, privacy, and dignity of others online.", choices: ["True", "False"], answer: 0, type: "tf" },
        { q: "Social responsibility in technology use means using digital tools only for personal benefit and not for helping others.", choices: ["True", "False"], answer: 1, type: "tf" },
        { q: "Legal responsibility includes following copyright laws and internet regulations when using digital resources.", choices: ["True", "False"], answer: 0, type: "tf" },
        { q: "Intellectual Property Rights (IPR) protect original works such as writings, images, videos, and software created by someone.", choices: ["True", "False"], answer: 0, type: "tf" },
        { q: "It is always acceptable to download and use any image from the internet without asking permission or giving credit.", choices: ["True", "False"], answer: 1, type: "tf" },
        { q: "Plagiarism — copying someone else's work and claiming it as your own — is a violation of Intellectual Property Rights.", choices: ["True", "False"], answer: 0, type: "tf" },
        { q: "Fair use allows limited use of copyrighted material for educational purposes without needing the creator's permission, under certain conditions.", choices: ["True", "False"], answer: 0, type: "tf" },
        { q: "Digital safety rules are only for children and not necessary for teachers or adult learners.", choices: ["True", "False"], answer: 1, type: "tf" },
        { q: "Creating strong, unique passwords and keeping them private is one important digital safety practice.", choices: ["True", "False"], answer: 0, type: "tf" },
        { q: "Sharing personal information like home address, phone number, or school name publicly online is safe and recommended.", choices: ["True", "False"], answer: 1, type: "tf" },
        { q: "Cyberbullying is the use of digital devices to harass, threaten, embarrass, or target another person intentionally.", choices: ["True", "False"], answer: 0, type: "tf" },
        { q: "Cyberbullying is not a serious issue because it happens online and not in person.", choices: ["True", "False"], answer: 1, type: "tf" },
        { q: "Spreading rumors, sharing embarrassing photos without consent, and sending hurtful messages are all forms of cyberbullying.", choices: ["True", "False"], answer: 0, type: "tf" },
        { q: "Netizens are people who actively use and participate in the internet and online communities.", choices: ["True", "False"], answer: 0, type: "tf" },
        { q: "Netiquette refers to the set of rules and guidelines for polite and respectful behavior in cyberspace.", choices: ["True", "False"], answer: 0, type: "tf" },
        { q: "Using ALL CAPS in online messages is considered polite and means you are being friendly.", choices: ["True", "False"], answer: 1, type: "tf" },
        { q: "You should always check facts and verify information before sharing it on social media or online platforms.", choices: ["True", "False"], answer: 0, type: "tf" },
        { q: "Educational sites and portals are designed specifically to support teaching and learning activities.", choices: ["True", "False"], answer: 0, type: "tf" },
        { q: "Any website found through a search engine is reliable and safe to use for academic research.", choices: ["True", "False"], answer: 1, type: "tf" },
        { q: "Online communities of learning allow students and educators to collaborate, share ideas, and learn together regardless of location.", choices: ["True", "False"], answer: 0, type: "tf" },
        { q: "When participating in online learning communities, you should treat others with the same respect you would in a physical classroom.", choices: ["True", "False"], answer: 0, type: "tf" },
        { q: "Citing the source of the information you get from the internet is optional and not required in school works.", choices: ["True", "False"], answer: 1, type: "tf" },
        { q: "Respecting the privacy of others means not sharing their messages, photos, or personal details without their consent.", choices: ["True", "False"], answer: 0, type: "tf" },
        { q: "Digital safety guidelines include logging out of accounts after using shared or public devices.", choices: ["True", "False"], answer: 0, type: "tf" },
        { q: "It is ethical to modify someone else's work and present it as your own original creation.", choices: ["True", "False"], answer: 1, type: "tf" },
        { q: "Teachers and learners have the responsibility to teach and practice safe, legal, and ethical technology use.", choices: ["True", "False"], answer: 0, type: "tf" },
        { q: "If you see cyberbullying happening online, the best thing to do is ignore it and not get involved.", choices: ["True", "False"], answer: 1, type: "tf" },
        { q: "Compliance with Intellectual Property Rights helps protect the creativity and effort of content creators.", choices: ["True", "False"], answer: 0, type: "tf" },
        { q: "Being a responsible digital citizen means thinking critically, acting kindly, and respecting laws whenever you use technology.", choices: ["True", "False"], answer: 0, type: "tf" }
      ]
    }
  },

  assignments: [
    { id: "a-ttl-1", subjectId: "ttl", title: "Movie Analysis: Cyberbullying Awareness", due: "2026-09-15", status: "pending", points: 25 }
  ],

  announcements: [
    {
      id: "ann-ttl-1", subjectId: "ttl", type: "material",
      title: "New Module Available: Social, Ethical, and Legal Responsibilities in Technology",
      body: "Module 1 for Technology for Teaching and Learning is now live on EduBook. It covers digital citizenship, intellectual property rights, digital safety, cyberbullying, netiquette, and online learning communities. Please complete the reading pages and watch the linked video before attempting the quiz and movie analysis activity.",
      author: "Maria Santos", date: Date.now(), pinned: true
    }
  ],

  teacherStudents: [
    {
      id: "STU-2025-0142",
      name: "Juan Dela Cruz",
      section: "Einstein",
      avgScore: 0,
      progress: 0,
      email: "student@edubook.test",
      moduleProgress: {}
    }
  ]
};

const ICONS = {
  book: '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
  quiz: '<svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  page: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>',
  award: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M8.2 13.5L7 22l5-3 5 3-1.2-8.5"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 3v13m0 0l-4-4m4 4l4-4"/><path d="M4 19h16"/></svg>',
  megaphone: '<svg viewBox="0 0 24 24"><path d="M21 3L3 10l7 3m11-10v13M10 13l2 7"/><path d="M3 10v7"/></svg>',
  play: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/></svg>',
  slides: '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
  image: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>'
};

function svgIcon(name) { return ICONS[name] || ""; }