export const bleadContent = {
  site: {
    title: "AI Leadership Accelerator",
    descriptor: "BRACCO",
    intendedPath: "/Blead/",
    heroBody:
      "Your hub for the Bracco AI Leadership Accelerator. Review the engagement plan, complete required preparation, and access approved materials.",
    supportingLine:
      "Program information will be updated here as materials become available.",
    overview:
      "The accelerator combines four hands-on cohort sessions with role-based discovery, individual support, executive leadership coaching, and a full-team closeout.",
    enabledModules: {
      materials: true,
      updates: true,
      help: true,
    },
    assessment: {
      label: "Before Session 1",
      title: "Complete your AI Readiness Assessment",
      description:
        "Each participant should complete the assessment before the first cohort session on October 7, 2026.",
      actionLabel: "Take the AI Readiness Assessment",
      href: "https://diagnostic.kaindly.ai",
    },
    policyLinks: [
      { label: "Privacy Policy", href: "/privacy/" },
      { label: "Terms of Service", href: "/terms/" },
    ],
  },
  themes: [
    {
      id: "theme-cohort",
      title: "Cohort learning",
      body: "Four hands-on sessions focused on personal proficiency, team enablement, judgment, and stewardship",
    },
    {
      id: "theme-individual",
      title: "Individual support",
      body: "Discovery plus two role-based one-to-one sessions for each participating leader",
    },
    {
      id: "theme-executive",
      title: "Executive leadership",
      body: "Four executive coaching sessions coupled to what the cohort surfaces across the engagement",
    },
  ],
  usageSteps: [
    "Complete the AI Readiness Assessment before Session 1.",
    "Review the engagement plan and open the stage you need.",
    "Download materials when they are marked available.",
    "Check program updates for changes.",
  ],
  weeks: [
    {
      id: "week-01",
      order: 1,
      label: "KICKOFF",
      title: "Kickoff, readiness, and discovery",
      summary: "Establish the starting point for a program grounded in Bracco's commercial reality",
      state: "available",
      statusLabel: "Assessment open",
      focus:
        "Build the program baseline through the AI Readiness Assessment, kickoff alignment, and role-based discovery conversations.",
      objectives: [
        "Complete the AI Readiness Assessment before Session 1",
        "Surface priority workflows and practical opportunities",
        "Establish a shared starting point for the cohort",
      ],
      preparation:
        "Complete the assessment and come prepared to discuss one recurring workflow where better use of AI could create meaningful value.",
      resources: ["resource-kickoff"],
      nextWeekId: "week-02",
      sample: false,
    },
    {
      id: "week-02",
      order: 2,
      label: "SESSION 01",
      title: "Personal AI proficiency",
      summary: "Hands-on practice grounded in each leader's own work",
      state: "scheduled",
      statusLabel: "October 7, 2026",
      focus:
        "Strengthen personal fluency and use AI more deliberately in the work leaders already do.",
      objectives: [
        "Apply AI to a real leadership workflow",
        "Practice giving useful context and direction",
        "Recognize where human judgment remains essential",
      ],
      preparation:
        "Complete the readiness assessment and bring one real, non-restricted work example to explore.",
      reflection:
        "Identify one practice you will test before the next cohort session.",
      resources: ["resource-session-01"],
      nextWeekId: "week-03",
      sample: false,
    },
    {
      id: "week-03",
      order: 3,
      label: "SESSION 02",
      title: "Team workflows and enablement",
      summary: "Move from individual experimentation to thoughtful team workflows",
      state: "upcoming",
      statusLabel: "To be scheduled",
      focus:
        "Translate personal practice into repeatable team workflows and identify where AI can create meaningful leverage.",
      objectives: [
        "Map a priority workflow",
        "Identify friction, risk, and opportunity",
        "Define what useful enablement looks like for a team",
      ],
      resources: ["resource-workflow-guide"],
      nextWeekId: "week-04",
      sample: false,
    },
    {
      id: "week-04",
      order: 4,
      label: "SESSION 03",
      title: "Evaluation and judgment",
      summary: "Build the judgment to evaluate AI-supported work and investments",
      state: "upcoming",
      statusLabel: "To be scheduled",
      focus:
        "Use clear criteria to evaluate outputs, opportunities, and decisions against the outcomes that matter.",
      objectives: [
        "Assess quality and usefulness",
        "Recognize where additional verification is needed",
        "Connect AI choices to defensible business outcomes",
      ],
      resources: ["resource-evaluation-guide"],
      nextWeekId: "week-05",
      sample: false,
    },
    {
      id: "week-05",
      order: 5,
      label: "SESSION 04",
      title: "Stewardship and leadership",
      summary: "Lead the shifts in behavior, expectations, and accountability that AI creates",
      state: "upcoming",
      statusLabel: "To be scheduled",
      focus:
        "Turn learning into leadership practices that support responsible experimentation, clear expectations, and durable capability.",
      objectives: [
        "Define leadership expectations for AI-supported work",
        "Strengthen stewardship and accountability",
        "Prepare to sustain progress after the cohort",
      ],
      resources: ["resource-stewardship-guide"],
      nextWeekId: "week-06",
      sample: false,
    },
    {
      id: "week-06",
      order: 6,
      label: "CLOSEOUT",
      title: "Leadership closeout",
      summary: "Recognize shifts, surface remaining gaps, and establish the path forward",
      state: "upcoming",
      statusLabel: "To be scheduled",
      focus:
        "Bring the full leadership experience together through a facilitated in-person closeout and a shared view of next steps.",
      objectives: [
        "Showcase meaningful shifts and applications",
        "Identify gaps that still need attention",
        "Establish an ongoing stewardship rhythm",
      ],
      resources: ["resource-closeout"],
      sample: false,
    },
  ],
  resources: [
    {
      id: "resource-kickoff",
      type: "Assessment",
      title: "AI Readiness Assessment",
      description: "Complete the assessment before the first cohort session on October 7, 2026.",
      weekId: "week-01",
      availability: "external",
      accessMode: "external",
      publicUrl: "https://diagnostic.kaindly.ai",
      sample: false,
    },
    {
      id: "resource-session-01",
      type: "Session materials",
      title: "Session 1 materials",
      description: "Approved preparation and follow-up materials for personal AI proficiency",
      weekId: "week-02",
      availability: "upcoming",
      accessMode: "none",
      publicUrl: null,
      sample: false,
    },
    {
      id: "resource-workflow-guide",
      type: "Working guide",
      title: "Workflow enablement materials",
      description: "Approved tools for mapping team workflows and opportunities",
      weekId: "week-03",
      availability: "upcoming",
      accessMode: "none",
      publicUrl: null,
      sample: false,
    },
    {
      id: "resource-evaluation-guide",
      type: "Working guide",
      title: "Evaluation and judgment materials",
      description: "Approved tools for evaluating AI-supported work and opportunities",
      weekId: "week-04",
      availability: "upcoming",
      accessMode: "none",
      publicUrl: null,
      sample: false,
    },
    {
      id: "resource-stewardship-guide",
      type: "Reflection tool",
      title: "Stewardship materials",
      description: "Approved reflection and planning tools for leadership practice",
      weekId: "week-05",
      availability: "upcoming",
      accessMode: "none",
      publicUrl: null,
      sample: false,
    },
    {
      id: "resource-closeout",
      type: "Closeout materials",
      title: "Leadership closeout materials",
      description: "Approved closeout materials will appear here when they are ready",
      weekId: "week-06",
      availability: "upcoming",
      accessMode: "none",
      publicUrl: null,
      sample: false,
    },
  ],
  updates: [
    {
      id: "update-assessment",
      title: "AI Readiness Assessment available",
      body: "Complete the assessment before the first cohort session on October 7, 2026.",
      actionLabel: "Take the assessment",
      destination: "https://diagnostic.kaindly.ai",
      sample: false,
    },
  ],
  faqs: [
    {
      id: "faq-start",
      question: "Where should I start?",
      answer:
        "Complete the AI Readiness Assessment before Session 1 on October 7, then review the engagement plan.",
    },
    {
      id: "faq-more",
      question: "Will more information be added?",
      answer:
        "Yes. Approved preparation, session, and follow-up materials will be added as the engagement progresses.",
    },
    {
      id: "faq-resource",
      question: "Why can I not download a resource?",
      answer:
        "A download becomes active only after the material has been approved and added to this hub.",
    },
    {
      id: "faq-share",
      question: "Can I share materials?",
      answer:
        "Use materials only within the approved Bracco engagement and follow any sharing instructions provided with the resource.",
    },
    {
      id: "faq-help",
      question: "Where can I get help?",
      answer:
        "Use the approved engagement support channel if you need help with access, scheduling, or materials.",
    },
  ],
};
