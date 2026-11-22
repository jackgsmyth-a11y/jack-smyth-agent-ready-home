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
    id: "field-lab", title: "Agentic Field Lab", bet: "multimodality",
    path: "/experiments/field-lab",
    question: "Frontier AI labs make researchers pitch for compute. What happens when competing AI agent teams pitch for a finite A$100 AUD monthly media grant?",
    role: "An autonomous marketing field lab: 3 competing agent teams pitch falsifiable Google Ads tests for a A$100/mo grant, get scored by a calibrated Judge Agent, and publish honest Bayesian verdicts for CMOs.",
    service: "native-google-cloud",
    machineContent: "/experiments/field-lab.md",
    actionMcp: "/experiments/field-lab/mcp",
  },
];
