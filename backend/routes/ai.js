import express from 'express';

const router = express.Router();

// Mock experts dataset for backend matching
const backendExperts = [
  {
    id: "exp-1",
    name: "Dr. Aris Thorne",
    role: "Principal AI & LLM Systems Architect",
    company: "Ex-Google DeepMind / Anthropic Fellow",
    category: "AI & Machine Learning",
    hourlyRate: 350,
    tags: ["Generative AI", "RAG Systems", "PyTorch", "System Architecture", "OpenAI"]
  },
  {
    id: "exp-2",
    name: "Elena Rostova",
    role: "VP of Product Design & Design Systems",
    company: "Ex-Stripe / Figma Ambassador",
    category: "Design & UX",
    hourlyRate: 275,
    tags: ["Design Systems", "UI/UX", "Figma", "SaaS Growth", "Design Tokens"]
  },
  {
    id: "exp-3",
    name: "Marcus Sterling",
    role: "Distinguished Cloud Infrastructure Architect",
    company: "Ex-AWS Solutions Architect / Kubernetes Maintainer",
    category: "Cloud & DevOps",
    hourlyRate: 310,
    tags: ["Kubernetes", "AWS Cloud", "Terraform", "Cost Optimization", "DevOps"]
  },
  {
    id: "exp-4",
    name: "Sophia Chen",
    role: "Fractional CMO & B2B SaaS Growth Lead",
    company: "Scale-Up Advisor / Y Combinator Alumni",
    category: "Marketing & Growth",
    hourlyRate: 260,
    tags: ["Product-Led Growth", "SaaS Pricing", "B2B Marketing", "Conversion Funnels"]
  },
  {
    id: "exp-5",
    name: "Tariq Mansoor",
    role: "Lead Smart Contract & Web3 Security Auditor",
    company: "CertiK / OpenZeppelin Contributor",
    category: "Security & Blockchain",
    hourlyRate: 380,
    tags: ["Solidity", "Security Auditing", "Ethereum", "ZK Proofs", "Rust"]
  },
  {
    id: "exp-6",
    name: "Jessica Miller",
    role: "Full-Stack Tech Lead & Next.js Core Specialist",
    company: "Vercel Community Leader / Author",
    category: "Engineering & Code",
    hourlyRate: 230,
    tags: ["React 19", "Next.js", "TypeScript", "Performance", "Full-Stack"]
  }
];

// POST /api/ai/match
router.post('/match', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'A prompt string is required for AI matching.' });
    }

    const lower = prompt.toLowerCase();

    // Semantic relevance scoring
    const matches = backendExperts.map((exp) => {
      let score = 70;
      let reasons = [];

      exp.tags.forEach((t) => {
        if (lower.includes(t.toLowerCase())) {
          score += 8;
          reasons.push(`Direct skill overlap on "${t}"`);
        }
      });

      if (lower.includes('ai') || lower.includes('llm') || lower.includes('agent') || lower.includes('vector') || lower.includes('rag')) {
        if (exp.category === 'AI & Machine Learning') {
          score += 18;
          reasons.push("Deep-learning production systems background aligns with requirements");
        }
      }

      if (lower.includes('design') || lower.includes('figma') || lower.includes('ux') || lower.includes('ui') || lower.includes('token')) {
        if (exp.category === 'Design & UX') {
          score += 18;
          reasons.push("Design systems and tokenization specialist");
        }
      }

      if (lower.includes('cloud') || lower.includes('k8s') || lower.includes('kubernetes') || lower.includes('aws') || lower.includes('cost')) {
        if (exp.category === 'Cloud & DevOps') {
          score += 18;
          reasons.push("Proven cloud infra architecture and finops optimization track record");
        }
      }

      if (lower.includes('contract') || lower.includes('audit') || lower.includes('security') || lower.includes('web3')) {
        if (exp.category === 'Security & Blockchain') {
          score += 18;
          reasons.push("Specialized smart contract formal verification specialist");
        }
      }

      const clampedScore = Math.min(Math.max(score, 72), 99);
      return {
        expertId: exp.id,
        name: exp.name,
        role: exp.role,
        company: exp.company,
        category: exp.category,
        hourlyRate: exp.hourlyRate,
        matchScore: clampedScore,
        reasons: reasons.length ? reasons : ["General senior advisory fit based on track record"]
      };
    }).sort((a, b) => b.matchScore - a.matchScore);

    return res.json({
      status: 'success',
      query: prompt,
      matchedCount: matches.length,
      topMatches: matches.slice(0, 3)
    });
  } catch (err) {
    console.error('AI matching error:', err);
    res.status(500).json({ error: 'Internal AI matching error' });
  }
});

export default router;
