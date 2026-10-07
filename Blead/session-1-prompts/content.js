export const promptPackContent = {
  title: "Build Your AI Brain",
  subtitle: "Prompt Pack for Microsoft Copilot",
  eyebrow: "BRACCO LEADERSHIP ACCELERATOR · SESSION 1",
  introduction: [
    "This pack holds every prompt you need to build your AI operating system in Copilot. It starts with one master prompt that builds the whole thing in a single conversation. The prompts after it break the same work into steps, then take you further: a prompt library, a personal AI chief of staff, and a shared team notebook.",
    "Your AI brain is what Copilot knows about you. Your AI operating system is how you and Copilot work together every day. This pack builds both.",
  ],
  paths: [
    {
      name: "Path A: The Master Prompt",
      prompts: "Prompt 1, then Prompt 2 to test",
      time: "45 to 60 minutes in one conversation",
      bestFor: "Working on your own, or if a step stalls",
      outcome: "Manual, custom instructions, memories, prompt library and chief of staff starter list",
      href: "#prompt-01",
    },
    {
      name: "Path B: Step by step",
      prompts: "Prompts 2 to 7, in order",
      time: "About 75 minutes, as in the session",
      bestFor: "Working in the room, one step at a time",
      outcome: "Manual, custom instructions and memories",
      href: "#prompt-02",
    },
  ],
  habits: [
    {
      title: "Your brain stays private.",
      body: "Never put your Operating Manual in a shared notebook or a shared folder.",
    },
    {
      title: "Edit before you save.",
      body: "Copilot drafts. You check that every line is true, current and safe.",
    },
    {
      title: "Keep confidential figures out.",
      body: "No revenue numbers, personnel matters or deal terms in your manual, instructions or memories.",
    },
  ],
  prompts: [
    {
      id: "prompt-01",
      number: 1,
      title: "The Master Prompt: Build Your AI Operating System",
      useWhen: "You want to build the whole system in one conversation, or the step-by-step path stalls.",
      time: "45 to 60 minutes. Start in a new chat.",
      fields: [
        { id: "title", label: "Your title", token: "[YOUR TITLE: e.g., “VP, Commercial Analytics”]", placeholder: "VP, Commercial Analytics" },
        { id: "team", label: "Your team", token: "[YOUR TEAM: e.g., “a team of 12 covering forecasting, insights and field analytics”]", placeholder: "A team of 12 covering forecasting, insights and field analytics" },
      ],
      prompt: `ROLE
You are an executive coach and chief of staff who helps senior commercial leaders in diagnostics and life sciences set up AI that works the way they think.

CONTEXT
I am [YOUR TITLE: e.g., “VP, Commercial Analytics”] at Bracco Diagnostics, leading [YOUR TEAM: e.g., “a team of 12 covering forecasting, insights and field analytics”]. I am building my AI operating system in Microsoft Copilot. Its foundation is my AI Operating Manual: a document that tells Copilot who I am, what I’m driving, how I think and how I want it to work with me. The manual will feed my custom instructions, my saved memories, my prompt library and, later, a personal agent that acts as my AI chief of staff.

ACTION
Work through three phases.

Phase 1, Mine. Review my emails, documents, meetings and Teams chats from the last 60 days. Summarize my writing style and my current work. Label each point “seen in my content” or “inferred.” Then list what you can’t tell from my content.

Phase 2, Interview. Interview me to fill the gaps. Ask one question at a time and wait for my answer. Ask no more than two questions per section, and skip anything Phase 1 already answered. Cover nine sections:
1. Who I am: role, scope and the decisions I own
2. What I’m driving now: top priorities, ranked, and what can wait
3. My people: who I report to, work with and get pushback from
4. How I think: decision principles and the trade-offs I default to
5. What good looks like: my standards and examples of my best work
6. Our language: Bracco products, systems, acronyms and terms
7. How I communicate: my voice
8. How I want AI to work with me: format, length, when to push back
9. Boundaries: what AI shouldn’t decide and what never goes in

Phase 3, Build. When I say “draft it,” write the full manual, then add four appendices:
A. Custom instructions: under 1,500 characters, in the first person, ending with this line: “My full AI Operating Manual is a Word doc in SharePoint. When a task needs more context than this, ask me to share it.”
B. Saved memories: 5 to 10 stable facts, each written as a “Remember that…” sentence.
C. Prompt library: five reusable prompts for the work I do most often, each with a role, context, action, format and tone.
D. Chief of staff starter list: three recurring tasks an AI chief of staff could take on for me, and what it would need from me to do each one.

FORMAT
Create the final output as a Word document titled “My AI Operating Manual.” Write it in the first person, with a heading for each section and appendix. Mark anything you inferred rather than heard from me with [Inferred].

TONE
Plain, direct language with no corporate filler. When my answer is vague, ask a follow-up instead of filling the gap yourself. Leave out confidential figures, personnel matters and deal terms.`,
      exampleIntro: "Jordan Patel, VP of Commercial Analytics (fictional), fills in the context and runs the prompt.",
      exampleParts: [
        { label: "Filled in", text: "I am VP, Commercial Analytics at Bracco Diagnostics, leading a team of 12 covering forecasting, insights and field analytics." },
        { label: "Phase 2, a moment from the interview", text: "Copilot: Your calendar shows weekly meetings with sales operations and marketing. When their requests compete, how do you decide which comes first? Jordan: Whatever moves the next-best-action engine forward wins. If a request doesn’t help reps act on a recommendation this quarter, it waits." },
        { label: "Phase 3, an excerpt from the Word document", text: "4. How I think. I rank work by whether it helps reps act on next-best-action recommendations this quarter. I want the trade-off before the recommendation. [Inferred] I distrust numbers without a named source." },
        { label: "Appendix A, first lines", text: "I’m VP, Commercial Analytics at Bracco Diagnostics. Lead with the answer, then the evidence. Keep it under 250 words unless I ask for more…" },
      ],
      tip: "If Copilot answers in the chat instead of creating a file, reply “Create this as a Word document,” or copy the text into Word. Save it in your private My AI OS folder in SharePoint, then use Appendices A and B with Prompts 6 and 7’s install steps.",
    },
    {
      id: "prompt-02",
      number: 2,
      title: "The Before-and-After Test",
      useWhen: "You want proof of the difference. Run it before you personalize anything, and again in a new chat afterward.",
      time: "5 minutes each time.",
      fields: [],
      prompt: `ROLE
You are my chief of staff, preparing me for a leadership meeting.

CONTEXT
I have five minutes at our next commercial leadership meeting to give an update on my area.

ACTION
Before you start, tell me in two or three lines what you’re assuming about me: my role, my team and what I’m focused on right now. Then give me:
1. The three points I should lead with, in priority order, and why each one matters to the business
2. The toughest question I should expect from my peers, and how I’d answer it
3. One risk or blind spot I may be underplaying
4. A 60-second opening I could say out loud, in my own voice

FORMAT
Keep it in the format and length that works best for me.`,
      exampleIntro: "Jordan runs the prompt twice, once before and once after personalizing.",
      exampleParts: [
        { label: "Before (excerpt)", text: "I’m assuming you lead a commercial function and want a concise, high-level update. 1. Highlight key wins this quarter. 2. Address challenges and mitigation plans…" },
        { label: "After (excerpt)", text: "You lead commercial analytics and you’re focused on rep adoption of next-best-action recommendations. Lead with adoption, not accuracy: the model is ready, the field isn’t acting on it yet…" },
      ],
      tip: "Do not change this prompt between runs. The only thing that should change is what Copilot knows about you. After the second run, hover over the prompt and select the save icon. It becomes the first entry in your prompt library.",
    },
    {
      id: "prompt-03",
      number: 3,
      title: "Mine Your Writing Style",
      useWhen: "You want Copilot to draft in your voice but find it hard to describe your own style.",
      time: "5 minutes.",
      fields: [
        { id: "time-period", label: "Time period to review", token: "[TIME PERIOD: e.g., “60 days”]", placeholder: "60 days" },
      ],
      prompt: `ROLE
You are an editor who studies how senior executives write.

CONTEXT
I’m setting up custom instructions so Copilot drafts in my voice.

ACTION
Look at emails and documents I’ve written over the last [TIME PERIOD: e.g., “60 days”]. Describe my writing style precisely enough that someone else could imitate it: tone, sentence length, how I open and close, how I structure updates, phrases I use often, and anything I seem to avoid.

FORMAT
A short style profile with one heading per element. Then a “Voice” description of about 100 words that I can paste into my custom instructions.

TONE
Use only what you can see in my content. If you’re inferring something, say so.`,
      exampleIntro: "Jordan runs the prompt on 60 days of email.",
      exampleParts: [
        { label: "Voice description (excerpt)", text: "I write short, direct emails that open with the answer. I use numbered lists for anything with more than two parts. I close with a named owner and a date. I avoid exclamation points and phrases like “circle back.” [Inferred] I soften feedback to peers more than feedback to my team." },
      ],
      tip: "If Copilot can’t see your email, attach two or three things you wrote, or type / and pick them, and point the prompt at those.",
    },
    {
      id: "prompt-04",
      number: 4,
      title: "Map Your Work",
      useWhen: "You want Copilot to show what it already knows about your work, and what it can’t see.",
      time: "5 minutes.",
      fields: [],
      prompt: `ROLE
You are a new chief of staff in your first week, learning how I work.

CONTEXT
I’m building an AI Operating Manual so Copilot understands my priorities and the people I work with.

ACTION
Based on my meetings, emails and Teams chats over the last 30 days, draft a profile of my work: what I seem focused on, the people and teams I work with most, recurring topics or issues, and decisions I appear to be driving. Then list what you can’t tell from my content that I should add myself.

FORMAT
A table with three columns: Item, Evidence, and Seen or inferred. Then a short list titled “What I can’t tell.”

TONE
Leave out confidential figures. Don’t guess at priorities. Mark anything you inferred.`,
      exampleIntro: "Jordan runs the prompt and reads the last list closely.",
      exampleParts: [
        { label: "What I can’t tell (excerpt)", text: "Which of your three recurring topics matters most this quarter. Why you declined the forecasting vendor demo twice. Who you go to when you need a decision fast. How you want bad news delivered." },
      ],
      tip: "The “What I can’t tell” list is the most valuable part. Those are the sections only you can write, and they create the biggest difference in your After.",
    },
    {
      id: "prompt-05",
      number: 5,
      title: "The Operating Manual Interview",
      useWhen: "You’ve run Prompts 3 and 4 and are ready to build your manual.",
      time: "20 to 25 minutes. Start in a new chat.",
      fields: [
        { id: "prompt-results", label: "Results from Prompts 3 and 4", token: "[PASTE YOUR PROMPT 3 AND 4 RESULTS HERE]", placeholder: "Paste your writing style and work profile results here", multiline: true },
      ],
      prompt: `ROLE
You are an executive coach running an intake interview with a senior leader.

CONTEXT
I want to build my AI Operating Manual: a document that gives Copilot the context to work like a thinking partner who knows me. My style and work profiles are below [OR: type / and pick your manual doc].

ACTION
Interview me to build the manual. Ask one question at a time and wait for my answer. Ask no more than two questions per section, and skip questions my profiles already answer. Cover these sections: Who I am, What I’m driving now, My people, How I think, What good looks like, Our language, How I communicate, How I want AI to work with me, Boundaries.

FORMAT
When I say “draft it,” create a Word document titled “My AI Operating Manual,” in the first person, with a heading for each section. Mark anything you inferred rather than heard from me.

TONE
Keep questions short. If my answer is vague, ask for a specific example.

[PASTE YOUR PROMPT 3 AND 4 RESULTS HERE]`,
      exampleIntro: "Jordan gets stuck on How I think and uses a sentence starter.",
      exampleParts: [
        { label: "A moment from the interview", text: "Copilot: What does a great update from your team always include? Jordan: The decision we need, the one number that matters, and what we’d do if we’re wrong." },
        { label: "In the drafted manual", text: "5. What good looks like. A great update names the decision needed, gives one number that matters, and says what we’ll do if we’re wrong." },
      ],
      tip: "Stuck on a question? Finish one of these sentences: When two priorities collide, I usually… The fastest way to lose me in a meeting is… I’m most often wrong when… At 20 minutes, type “draft it” even if you’re mid-interview.",
    },
    {
      id: "prompt-06",
      number: 6,
      title: "Compress Into Custom Instructions",
      useWhen: "Your manual is edited and you’re ready to install it.",
      time: "5 minutes.",
      fields: [],
      prompt: `ROLE
You are an expert in configuring Microsoft Copilot for senior leaders.

CONTEXT
My AI Operating Manual is below [OR: type / and pick your manual]. Copilot applies custom instructions to every new chat, so they need to carry what matters most in very little space.

ACTION
Turn my manual into custom instructions. Keep only what should shape every answer: my role, my top three priorities, how I think, my voice and how I want answers.

FORMAT
First person, short direct statements, under 1,500 characters. End with this line: “My full AI Operating Manual is a Word doc in SharePoint. When a task needs more context than this, ask me to share it.”

TONE
Leave out anything confidential and anything that changes week to week.`,
      exampleIntro: "Jordan compresses a four-page manual.",
      exampleParts: [
        { label: "Custom instructions (excerpt)", text: "I lead Commercial Analytics at Bracco Diagnostics. My top priority this quarter is rep adoption of next-best-action recommendations. Lead with the answer, then the evidence. Give me the trade-off before the recommendation. Write in short, plain sentences…" },
      ],
      tip: "Paste the result into Copilot Chat › Settings › Personalization › Custom instructions and save. Keep a copy in your manual. If it won’t save or gets cut off, ask Copilot for a version half as long.",
    },
    {
      id: "prompt-07",
      number: 7,
      title: "Extract Your Saved Memories",
      useWhen: "Your custom instructions are saved and you want Copilot to keep a few stable facts.",
      time: "5 minutes.",
      fields: [],
      prompt: `ROLE
You are an expert in configuring Microsoft Copilot for senior leaders.

CONTEXT
My AI Operating Manual is below [OR: type / and pick your manual]. Saved memories are facts Copilot keeps across every chat.

ACTION
List 5 to 10 stable facts worth saving as memories, such as key people, terms and standing preferences.

FORMAT
Write each one as a “Remember that…” sentence I can paste into chat.

TONE
Only facts that stay true for months. Nothing confidential.`,
      exampleIntro: "Jordan’s list includes stable facts and preferences.",
      exampleParts: [
        { label: "Examples", text: "Remember that NBA means our next-best-action engine, not the basketball league. Remember that I want the trade-off before the recommendation. Remember that my weekly team update goes out on Monday mornings." },
      ],
      tip: "Send each sentence to Copilot. Check them in Settings › Personalization, where you can edit or delete any of them. Review your memories after two weeks and delete anything that’s wrong.",
    },
    {
      id: "prompt-08",
      number: 8,
      title: "Build Your Prompt Library",
      useWhen: "Your brain is set up and you want routines you can run again and again.",
      time: "15 minutes.",
      fields: [
        { id: "recurring-tasks", label: "Your recurring tasks", token: "[YOUR RECURRING TASKS: e.g., “weekly team update, quarterly business review prep, one-on-one prep with my directs”]", placeholder: "Weekly team update, quarterly business review prep, one-on-one prep with my directs", multiline: true },
      ],
      prompt: `ROLE
You are a prompt designer who builds reusable prompts for senior commercial leaders.

CONTEXT
Using / My AI Operating Manual. I want a library of prompts I can save in Copilot’s Prompt Gallery and reuse every week. My most frequent recurring work is [YOUR RECURRING TASKS: e.g., “weekly team update, quarterly business review prep, one-on-one prep with my directs”].

ACTION
Write one reusable prompt for each task. Each prompt should start with a role and context, then the action, format and tone. Put anything that changes each time in [brackets].

FORMAT
A numbered list. For each prompt: a short name, when to use it, and the prompt itself, ready to copy.

TONE
Match my voice and standards from the manual. Keep each prompt under 150 words.`,
      exampleIntro: "Jordan’s first library entry shows the format.",
      exampleParts: [
        { label: "Monday team update (excerpt)", text: "You are my chief of staff. Using my notes from last week [NOTES], draft my Monday update to my team: the one decision we need this week, the number that matters, and who owns what by Friday. Under 200 words, in my voice." },
      ],
      tip: "Run each prompt once, then hover over it and select the save icon. It appears in the Prompt Gallery under Your prompts, and you can reuse it in Copilot Chat, Teams and Outlook. Copilot doesn’t support custom slash commands, so saved prompts are your shortcuts.",
    },
    {
      id: "prompt-09",
      number: 9,
      title: "Brief Your AI Chief of Staff",
      useWhen: "You’re ready to move from a brain that knows you to a chief of staff that acts on what it knows.",
      time: "20 minutes, plus setup in Copilot’s agent builder.",
      fields: [
        { id: "chief-of-staff-jobs", label: "Chief of staff jobs", token: "[CHIEF OF STAFF JOBS: e.g., “meeting prep, tracking my commitments, drafting follow-ups, a Friday check on my priorities”]", placeholder: "Meeting prep, tracking commitments, drafting follow-ups, Friday priority check", multiline: true },
      ],
      prompt: `ROLE
You are an expert in designing Microsoft Copilot agents for executives.

CONTEXT
Using / My AI Operating Manual. I’m creating a personal Copilot agent that acts as my AI chief of staff. It will use my manual, saved in SharePoint, as its knowledge. Agent instructions can be up to 8,000 characters.

ACTION
Write the agent instructions. Cover its purpose, a summary of who I am and what I’m driving, the jobs it does for me ([CHIEF OF STAFF JOBS: e.g., “meeting prep, tracking my commitments, drafting follow-ups, a Friday check on my priorities”]), how it should work with me, and what it must never do. Then suggest a name, a one-line description and four conversation starters.

FORMAT
Headings for each part. Instructions in the second person (“You are Jordan’s chief of staff…”), under 8,000 characters.

TONE
It drafts and recommends. It never sends, commits or decides on my behalf. It flags uncertainty and asks when context is missing.`,
      exampleIntro: "Jordan’s agent turns the manual into repeatable support.",
      exampleParts: [
        { label: "Agent excerpt", text: "Name: Jordan’s Chief of Staff. Conversation starter: “Prep me for my next three meetings.” From the instructions: Before each prep, check my priorities in the manual. Flag any meeting that doesn’t connect to a top-three priority and ask whether I still need to attend…" },
      ],
      tip: "In Copilot’s agent builder, paste the instructions, add your manual from SharePoint as a knowledge source, and save. Keep the agent private to you.",
    },
    {
      id: "prompt-10",
      number: 10,
      title: "Create Your Team Objectives Page",
      useWhen: "Your team is building a shared Copilot Notebook of everyone’s objectives.",
      time: "10 minutes.",
      fields: [
        { id: "name", label: "Your name", token: "[YOUR NAME]", placeholder: "Your name" },
        { id: "year", label: "Objectives year", token: "[YEAR]", placeholder: "2026" },
      ],
      prompt: `ROLE
You are a chief of staff preparing material that my peers on the leadership team will read.

CONTEXT
Using / My AI Operating Manual. Our commercial leadership team is building a shared Copilot Notebook that holds each leader’s objectives, so we can see dependencies and conflicts across the team.

ACTION
Draft my one-page objectives page with five parts: 1. my top three objectives this year, 2. how each one is measured, 3. what I need from my peers, 4. what my peers need from me, 5. the biggest risk to hitting my objectives.

FORMAT
A one-page Word document titled “[YOUR NAME]: Objectives [YEAR]”, with the five parts as headings.

TONE
Written for peers. Use nothing from the private sections of my manual (How I think, Boundaries, or anything about specific people). No confidential figures.`,
      exampleIntro: "Jordan’s page makes dependencies visible without sharing the private manual.",
      exampleParts: [
        { label: "What I need from my peers (excerpt)", text: "From sales operations: territory changes two weeks before they go live, so recommendations stay accurate. From marketing: campaign calendars in one shared place…" },
      ],
      tip: "This page goes in the shared team notebook. Your Operating Manual does not. Everyone you invite to a notebook gets full editing access, so agree as a team that each leader edits only their own page.",
    },
    {
      id: "prompt-11",
      number: 11,
      title: "The Quarterly Refresh",
      useWhen: "A quarter has passed, or your priorities changed.",
      time: "15 minutes.",
      fields: [
        { id: "date", label: "Last updated", token: "[DATE: e.g., “in October”]", placeholder: "In October" },
      ],
      prompt: `ROLE
You are my chief of staff running a quarterly review of how I work.

CONTEXT
Using / My AI Operating Manual. It was last updated [DATE: e.g., “in October”]. My priorities and people may have changed since then.

ACTION
Compare my manual with my emails, meetings and Teams chats from the last 90 days. Find what’s out of date: priorities, people, language and standards. Propose updated text for each section that changed. Then rewrite my custom instructions to match.

FORMAT
A table with three columns: Section, What changed, and Proposed update. Then the new custom instructions, under 1,500 characters.

TONE
Flag anything you inferred. Don’t change a section without evidence from my content or my answer.`,
      exampleIntro: "Jordan’s refresh identifies only changes supported by evidence.",
      exampleParts: [
        { label: "Refresh excerpt", text: "Section: What I’m driving now. What changed: adoption reviews moved from monthly to weekly, and a new pricing analytics project appears in 14 meetings. Proposed update: Add pricing analytics as priority two…" },
      ],
      tip: "Update the manual, save the new custom instructions, and review your saved memories at the same time.",
    },
  ],
  afterToday: [
    { when: "Every quarter", action: "Run Prompt 11 and update What I’m driving now" },
    { when: "After each update", action: "Save your new custom instructions" },
    { when: "Two weeks from today", action: "Review your saved memories and delete anything that’s wrong" },
    { when: "Every week", action: "Save one new prompt to your library" },
    { when: "Next session", action: "We start building your AI chief of staff on top of your manual" },
  ],
};
