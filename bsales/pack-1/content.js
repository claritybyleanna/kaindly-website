export const packOneContent = {
  slug: "prompt-pack-1",
  number: 1,
  eyebrow: "BRACCO SALES TEAM · AI WORKING SESSION",
  title: "Demystifying AI and Your AI Brain",
  subtitle: "Prompt Pack 1",
  introduction: "Seven prompts, numbered in the order you use them. The number on each prompt matches the number on the slide.",
  guidance: "Keep every answer in one Word document, “My AI Operating Manual,” in a private SharePoint folder called “My AI OS.” It is your proof of the difference, and the start of your AI brain.",
  download: "/bsales/materials/Kaindly_Bracco_Prompt_Pack_1_Demystifying_AI_and_Your_AI_Brain.docx",
  safety: [
    "Initials only. Never enter a rep’s full name.",
    "No customer names, pricing or patient information. Describe the account type instead.",
    "Leave out confidential figures, personnel matters and deal terms from your manual and instructions.",
    "You own the output. Copilot drafts. You check every line before you use it.",
  ],
  setup: [],
  prompts: [
    {
      number: 1,
      title: "The Everyday Prompt",
      useWhen: "Round 1, at the start of the session before CRAFT-I.",
      time: "5 minutes",
      prompt: `I rode with one of my sales reps this week. He missed the close on a few key accounts, struggled in his conversations with the staff, and we left the client with less confidence in us. He also didn’t use the information he had available to plan the calls. Help me draft a guide for coaching him.`,
    },
    {
      number: 2,
      title: "The CRAFT-I Coaching Prompt",
      useWhen: "Round 2, then again word for word in a new chat after you build your AI brain.",
      time: "10 minutes each round, including the interview",
      prompt: `CONTEXT  I’m a [YOUR ROLE] at Bracco Diagnostics. I rode with [REP INITIALS], who has been in the role [LENGTH OF TIME]. We called on [TYPE OF ACCOUNT]. What the rep said or asked: [AS CLOSE TO VERBATIM AS YOU CAN GET]. How the customer responded: [THEIR WORDS, WHAT THEY COMMITTED TO OR DIDN’T]. What the rep used to prepare: [WHAT INFORMATION THEY USED AND WHAT THEY SKIPPED]. We last worked on [PRIOR DEVELOPMENT AREA]. I want the rep to leave with a plan they own and to feel supported.
ROLE  You are an experienced sales coach who works with field sales teams selling medical imaging products in a regulated environment.
ACTION  Draft a guide for my coaching conversation with this rep. A good guide here includes:
1. Two strengths, each backed by evidence from what I observed
2. One development priority, not a list
3. One question I can ask the rep to get to the real cause
4. A specific action with a date, plus what I will commit to doing to support them
Coach the behavior I describe, not my conclusions about it. Don’t invent details I haven’t given you.
FORMAT  Under 200 words, in the order above. Then add one opening line I could say out loud to start the conversation.
TONE  Direct and supportive. This is coaching, not performance management. Write it the way I’d actually speak to this person.
INTERVIEW ME  Before you draft, ask me for any additional context you need to give fair, balanced and clear feedback. Ask one question at a time and wait for my answer. If my answer is a judgment rather than something I saw or heard, ask what actually happened. Up to four questions, then draft.`,
    },
    {
      number: 3,
      title: "Your Writing Style",
      useWhen: "After Round 2, in a new chat.",
      time: "5 minutes",
      prompt: `Look at emails and documents I’ve written over the last 60 days. Describe my writing style precisely enough that someone else could imitate it: tone, sentence length, how I open and close, how I structure updates, phrases I use often, and anything I seem to avoid.
Then turn it into a “Voice” description of about 100 words that I can paste into my custom instructions. Use only what you can see in my content, and if you’re inferring something, say so.`,
    },
    {
      number: 4,
      title: "Your Work Map",
      useWhen: "Right after Prompt 3, in the same chat.",
      time: "5 minutes",
      prompt: `Based on my meetings, emails and Teams chats over the last 30 days, draft a profile of my work: what I seem focused on, the people and teams I work with most, recurring topics or issues, and decisions I appear to be driving. Label each item “seen in my content” or “inferred.” Leave out confidential figures.
Then list what you can’t tell from my content that I should add myself.`,
    },
    {
      number: 5,
      title: "The Operating Manual Interview",
      useWhen: "In a new chat, after Prompts 3 and 4.",
      time: "25 minutes. At 20 minutes, type “draft it.”",
      prompt: `I want to build my AI Operating Manual: a document that gives Copilot the context to work like a thinking partner who knows me. Interview me to build it.
Ask one question at a time and wait for my answer. Ask no more than two questions per section. Cover these sections: Who I am, What I’m driving now, My people, How I think, What good looks like, Our language, How I communicate, How I want AI to work with me, Boundaries.
Use the style and work profiles below as a starting point, and skip questions they already answer. When I say “draft it,” write the manual in the first person with a heading for each section. Mark anything you inferred rather than heard from me.
[PASTE YOUR PROMPT 3 AND PROMPT 4 RESULTS HERE]`,
    },
    {
      number: 6,
      title: "Your Custom Instructions",
      useWhen: "After the human edit, in the same chat as your manual or with the manual attached.",
      time: "5 minutes",
      prompt: `Turn my Operating Manual into custom instructions for Copilot. Keep only what should shape every answer: my role, my top three priorities, how I think, my voice and how I want answers. Write it in the first person, as short direct statements, under 1,500 characters. Leave out anything confidential and anything that changes week to week. End with this line: “My full AI Operating Manual is a Word doc in SharePoint. When a task needs more context than this, ask me to share it.”
[PASTE YOUR EDITED MANUAL HERE]`,
    },
    {
      number: 7,
      title: "Your Saved Memories",
      useWhen: "Right after Prompt 6.",
      time: "5 minutes",
      prompt: `From my Operating Manual, list 5 to 10 stable facts worth saving as Copilot memories, such as key people, terms and standing preferences. Write each one as a “Remember that…” sentence I can paste into chat.`,
    },
  ],
};
