export const EXPERIMENTS = [
  {
    id: "facts-with-flair", title: "Facts with Flair", bet: "differentiation",
    path: "/experiments/facts-with-flair",
    question: "Can a clearer expression of the same product facts give a shopping agent a better reason to choose?",
    role: "A working demonstration of differentiation, not a promise of AI ranking.",
    service: "https://pencil-product-copy.replit.app",
    machineContent: "/experiments/facts-with-flair.md",
  },
  {
    id: "leaderbored", title: "Leaderbored", bet: "anticipation",
    path: "/experiments/leaderbored",
    question: "What does an agency look like when its next client is an agent?",
    role: "A working demonstration of human-approved delegation: category context, budget, useful output.",
    service: "https://leaderbored.replit.app",
    machineContent: "/experiments/leaderbored.md",
    actionMcp: "/experiments/leaderbored/mcp",
  },
  {
    id: "wet-lab", title: "Agentic Marketing Wet Lab", bet: "multimodality",
    path: "/experiments/wet-lab",
    question: "What happens when competing AI agent teams pitch for a finite A$100 AUD monthly Google Ads budget?",
    role: "An autonomous marketing research lab: 3 competing agent teams, Judge scoring, public voting, Google Ads MCP execution, and Bayesian CMO verdicts.",
    service: "native-google-cloud",
    machineContent: "/experiments/wet-lab.md",
    actionMcp: "/experiments/wet-lab/mcp",
  },
];
