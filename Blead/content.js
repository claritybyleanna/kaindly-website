export const bleadContent = {
  site: {
    title: "Leadership Learning Hub",
    descriptor: "AI Leadership Program",
    intendedPath: "/Blead/",
    heroBody:
      "Your starting point for the program. Explore the learning plan, find available materials, and see what comes next.",
    supportingLine:
      "Program information will be updated here as materials become available.",
    overview:
      "Use this hub to understand the program, explore the sample learning plan, and recognize what is available now.",
    enabledModules: {
      materials: true,
      updates: true,
      help: true,
    },
    nextStep: {
      label: "Start here",
      title: "Explore the learning plan",
      description:
        "Review the weekly outline and open any materials marked available.",
      actionLabel: "Go to the program plan",
      destination: "#program-plan",
    },
    policyLinks: [
      { label: "Privacy Policy", href: "/privacy/" },
      { label: "Terms of Service", href: "/terms/" },
    ],
  },
  themes: [
    {
      id: "theme-learn",
      title: "Learn",
      body: "Build a shared understanding of AI concepts and possibilities",
    },
    {
      id: "theme-reflect",
      title: "Reflect",
      body: "Consider the questions leaders need to ask",
    },
    {
      id: "theme-apply",
      title: "Apply",
      body: "Turn learning into thoughtful next steps",
    },
  ],
  usageSteps: [
    "Start with the program plan.",
    "Open the week you want to review.",
    "Use the materials marked available.",
    "Check the updates section for approved changes.",
  ],
  weeks: [
    {
      id: "week-01",
      order: 1,
      label: "Week 01",
      title: "AI foundations",
      summary: "Build a shared language for discussing AI",
      state: "available",
      focus:
        "Explore foundational ideas and practice asking useful questions about AI-generated information.",
      objectives: [
        "Recognize common AI terms",
        "Discuss where human judgment matters",
        "Identify questions to ask about an AI-generated response",
      ],
      preparation: "Bring a general question about AI.",
      reflection: "Write down one idea you want to explore further.",
      resources: ["resource-guide"],
      nextWeekId: "week-02",
      sample: true,
    },
    {
      id: "week-02",
      order: 2,
      label: "Week 02",
      title: "Leading thoughtful adoption",
      summary: "Explore the questions that support responsible decisions",
      state: "overview",
      focus:
        "Consider how leaders can make room for learning while setting clear expectations.",
      objectives: [
        "Discuss the role of leadership in learning and experimentation",
        "Recognize the value of clear expectations",
        "Consider how to evaluate information before acting",
      ],
      resources: ["resource-materials"],
      nextWeekId: "week-03",
      sample: true,
    },
    {
      id: "week-03",
      order: 3,
      label: "Week 03",
      title: "From learning to next steps",
      summary: "Reflect on learning and identify a practical next step",
      state: "upcoming",
      resources: [],
      sample: true,
    },
  ],
  resources: [
    {
      id: "resource-guide",
      type: "Guide",
      title: "Learning guide",
      description:
        "Key ideas and reflection prompts for this part of the program",
      weekId: "week-01",
      availability: "available",
      accessMode: "public-review",
      publicUrl: null,
      sample: true,
    },
    {
      id: "resource-materials",
      type: "Session materials",
      title: "Session materials",
      description: "Materials will appear here when they are ready",
      weekId: "week-02",
      availability: "upcoming",
      accessMode: "none",
      publicUrl: null,
      sample: true,
    },
    {
      id: "resource-unavailable",
      type: "Learning resource",
      title: "Learning resource",
      description: "This resource is temporarily unavailable",
      weekId: null,
      availability: "unavailable",
      accessMode: "none",
      publicUrl: null,
      sample: true,
    },
    {
      id: "resource-recording",
      type: "Recording",
      title: "Session recording",
      description: "Open the recording in the approved platform",
      accessNote: "An authorized account may be required",
      weekId: null,
      availability: "external",
      accessMode: "authorized-account",
      publicUrl: null,
      sample: true,
    },
  ],
  updates: [
    {
      id: "update-materials",
      title: "New materials available",
      body: "An approved resource has been added to the materials section.",
      actionLabel: "View materials",
      destination: "#materials",
      sample: true,
    },
  ],
  faqs: [
    {
      id: "faq-start",
      question: "Where should I start?",
      answer: "Start with the program plan and open the first available week.",
    },
    {
      id: "faq-more",
      question: "Will more information be added?",
      answer:
        "The hub can be updated as the program develops. Check the availability labels for the latest published materials.",
    },
    {
      id: "faq-resource",
      question: "Why can I not open a resource?",
      answer:
        "Some resources may require an authorized account in another platform. Use the approved support route if you need help.",
    },
    {
      id: "faq-share",
      question: "Can I share materials?",
      answer:
        "Follow the access and sharing instructions provided with each resource.",
    },
    {
      id: "faq-help",
      question: "Where can I get help?",
      answer:
        "Use the support details provided through your approved program channel.",
    },
  ],
};
