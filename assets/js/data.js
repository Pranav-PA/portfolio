/* ─────────────────────────────────────────────────────────────
   data.js — every piece of content the interactive layers read.
   Edit here to update the site; nothing else needs to change.
   ───────────────────────────────────────────────────────────── */
(function (PP) {
  'use strict';

  PP.me = {
    name: 'Pranav P Aradhya',
    email: 'pranavparadhya1@gmail.com',
    phone: '+91 81472 38214',
    location: 'Mysuru, Karnataka, India',
    github: 'https://github.com/Pranav-PA',
    linkedin: 'https://www.linkedin.com/in/pranav-p-aradhya/',
    roles: [
      'GenAI / Agentic AI Engineer',
      'AI Engineer Intern @ Mphasis · Applied AI',
      'author of observix — pip install observix',
      'LangChain · LangGraph · AgentScope',
      'I make agents traceable.'
    ]
  };

  /* ── hero agent-graph: the nav is a state machine ───────────── */
  PP.graphNodes = [
    { id: 'hero',    label: 'root',     kind: 'entry',  r: 12, x: .50, y: .48 },
    { id: 'about',   label: 'system',   kind: 'prompt', r: 9,  x: .78, y: .18 },
    { id: 'stack',   label: 'stack',    kind: 'tool',   r: 9,  x: .92, y: .56 },
    { id: 'trace',   label: 'trace',    kind: 'agent',  r: 10, x: .66, y: .88 },
    { id: 'work',    label: 'work',     kind: 'tool',   r: 9,  x: .30, y: .82 },
    { id: 'contact', label: 'exit',     kind: 'exit',   r: 9,  x: .16, y: .34 }
  ];
  PP.graphEdges = [
    ['hero', 'about'], ['about', 'stack'], ['stack', 'trace'],
    ['trace', 'work'], ['work', 'contact'], ['hero', 'trace'],
    ['hero', 'work'], ['about', 'trace'], ['hero', 'contact']
  ];

  /* ── skills: clusters become gravity wells ──────────────────── */
  PP.clusters = [
    { id: 'genai',  name: 'GenAI / Agents',  color: '#35e0e8' },
    { id: 'obs',    name: 'Observability',   color: '#8b5cf6' },
    { id: 'lang',   name: 'Languages',       color: '#b6f24a' },
    { id: 'web',    name: 'Web & Backend',   color: '#ffb443' },
    { id: 'infra',  name: 'Cloud & DevOps',  color: '#ff5c7a' },
    { id: 'cs',     name: 'Fundamentals',    color: '#7f8aa3' }
  ];

  /* w = weight (1–3) → node radius; note = tooltip detail */
  PP.skills = [
    { n: 'LangChain',      c: 'genai', w: 3, note: 'LLM orchestration, chains, tool calling' },
    { n: 'LangGraph',      c: 'genai', w: 3, note: 'Stateful multi-step agent graphs' },
    { n: 'AgentScope',     c: 'genai', w: 2, note: 'Migrated agent components for multi-agent orchestration' },
    { n: 'OpenAI API',     c: 'genai', w: 3, note: 'Chat + vision models in production' },
    { n: 'Tool Calling',   c: 'genai', w: 3, note: 'Function schemas, routing, retries' },
    { n: 'ReAct Agents',   c: 'genai', w: 2, note: 'Reason–act loops with observation feedback' },
    { n: 'Prompt Eng.',    c: 'genai', w: 2, note: 'Zero-shot, few-shot, structured output' },

    { n: 'OpenTelemetry',  c: 'obs',   w: 3, note: 'Spans, resources, semantic conventions' },
    { n: 'OTLP',           c: 'obs',   w: 2, note: 'The wire protocol Observix exports over' },
    { n: 'Distributed Tracing', c: 'obs', w: 3, note: 'Trace context across agent hops' },
    { n: 'Langfuse',       c: 'obs',   w: 2, note: 'LLM-native tracing sink' },
    { n: 'MLflow',         c: 'obs',   w: 2, note: 'Found + fixed a missing native cost field' },
    { n: 'Phoenix',        c: 'obs',   w: 2, note: 'OpenInference; caught span-to-project misrouting' },

    { n: 'Python',         c: 'lang',  w: 3, note: 'Primary language — Observix is written in it' },
    { n: 'JavaScript',     c: 'lang',  w: 3, note: 'Everything that runs in a browser' },
    { n: 'TypeScript',     c: 'lang',  w: 2, note: 'Typed front ends and API layers' },
    { n: 'Java',           c: 'lang',  w: 2, note: 'OOP coursework and DSA' },
    { n: 'C',              c: 'lang',  w: 1, note: 'Systems fundamentals' },

    { n: 'React',          c: 'web',   w: 3, note: 'Component architecture, hooks' },
    { n: 'Next.js',        c: 'web',   w: 3, note: 'QPGen is built on it' },
    { n: 'Node.js',        c: 'web',   w: 2, note: 'Server-side JS runtime' },
    { n: 'Express',        c: 'web',   w: 2, note: 'REST API design' },
    { n: 'Tailwind CSS',   c: 'web',   w: 2, note: 'Utility-first styling' },
    { n: 'PostgreSQL',     c: 'web',   w: 2, note: 'Relational modelling via Supabase' },
    { n: 'Supabase',       c: 'web',   w: 2, note: 'Auth + Postgres + storage for QPGen' },
    { n: 'MongoDB',        c: 'web',   w: 2, note: 'Document store for full-stack work' },
    { n: 'Redis',          c: 'web',   w: 1, note: 'Caching and ephemeral state' },

    { n: 'AWS',            c: 'infra', w: 2, note: 'Deployment target for GenAI services' },
    { n: 'Docker',         c: 'infra', w: 2, note: 'Reproducible environments' },
    { n: 'Kubernetes',     c: 'infra', w: 1, note: 'Container orchestration' },
    { n: 'GitLab CI/CD',   c: 'infra', w: 3, note: 'Automated build, test, deploy at Mphasis' },
    { n: 'Git / GitHub',   c: 'infra', w: 3, note: 'Daily driver' },
    { n: 'Vercel',         c: 'infra', w: 2, note: 'Where QPGen lives' },

    { n: 'Data Structures',c: 'cs',    w: 2, note: 'Coursework foundation' },
    { n: 'DBMS',           c: 'cs',    w: 2, note: 'Relational theory, indexing, transactions' },
    { n: 'TCP/IP',         c: 'cs',    w: 2, note: 'Client–server architecture, networking' },
    { n: 'OS Concepts',    c: 'cs',    w: 1, note: 'Processes, memory, scheduling' },
    { n: 'Cloud Computing',c: 'cs',    w: 1, note: 'Service models and deployment' }
  ];

  /* ── trace waterfall ─────────────────────────────────────────
     t is measured in months from 2023-08 (t0). Aug 2026 = 36.  */
  PP.T0 = 0;
  PP.T1 = 47;          // ~Jul 2027
  PP.TNOW = 36.5;
  PP.years = [
    { t: 0,  y: '2023' }, { t: 5,  y: '2024' }, { t: 17, y: '2025' },
    { t: 29, y: '2026' }, { t: 41, y: '2027' }
  ];

  PP.spans = [
    {
      id: 'root', depth: 0, t: 0, d: 47, live: true, color: '#e9edf5',
      name: 'career.pranav_aradhya', kind: 'ROOT', kindColor: '#e9edf5',
      title: 'Becoming a GenAI Engineer',
      org: '2023 → 2027 · Mysuru, India',
      attrs: [
        ['service.name', 'pranav.aradhya'],
        ['span.count', '4 children'],
        ['status', 'in progress'],
        ['objective', 'GenAI / Agentic AI Engineer']
      ],
      events: [
        'Started as an Information Science undergraduate with a systems bias — networks, OS, DBMS.',
        'Moved into full-stack, then into GenAI once it became clear that orchestration, not modelling, was the hard part.',
        'Now shipping agent workflows professionally and publishing the tooling I wished existed.'
      ]
    },
    {
      id: 'edu', depth: 1, t: 0, d: 47, live: true, color: '#7f8aa3',
      name: 'education.nie_mysuru', kind: 'EDU', kindColor: '#7f8aa3',
      title: 'B.E. Information Science & Engineering',
      org: 'The National Institute of Engineering, Mysuru',
      attrs: [
        ['degree', 'B.E. ISE'],
        ['duration', '2023 – 2027 (expected)'],
        ['institution', 'NIE Mysuru']
      ],
      events: [
        'Coursework: Data Structures, DBMS, Object-Oriented Programming, Computer Networks, Cloud Computing.',
        'The networking and OS grounding is why distributed tracing felt natural rather than foreign.'
      ]
    },
    {
      id: 'qpgen', depth: 1, t: 28, d: 6, color: '#35e0e8',
      name: 'project.qpgen', kind: 'PROJECT', kindColor: '#35e0e8',
      title: 'QPGen — AI Question Paper Generator',
      org: 'Next.js · Supabase · PostgreSQL · OpenAI Vision · Vercel',
      link: { label: 'jump to case study', href: '#work' },
      attrs: [
        ['span.kind', 'full-stack GenAI'],
        ['users', 'teachers'],
        ['scope', 'JEE / NEET / Board'],
        ['deployed', 'vercel · production']
      ],
      events: [
        'Built and deployed a full-stack GenAI web app that generates chapter-scoped exam papers with complete answer keys.',
        'Designed a two-pass pipeline: an initial AI pass drafts questions, then a second pass independently re-solves them and flags any answer it cannot confirm before a teacher ever sees it.',
        'Implemented reference-paper upload with diagram extraction, plus PDF export of the paper and a separate answer key on institution letterhead — mathematical notation rendered properly.'
      ]
    },
    {
      id: 'observix', depth: 1, t: 29.5, d: 6.5, color: '#8b5cf6',
      name: 'project.observix', kind: 'OSS', kindColor: '#8b5cf6',
      title: 'Observix — Provider-Agnostic LLM Observability',
      org: 'Python · OpenTelemetry · published on PyPI',
      link: { label: 'jump to case study', href: '#work' },
      attrs: [
        ['package', 'observix (PyPI)'],
        ['sinks', 'phoenix · langfuse · mlflow · datadog'],
        ['overhead', 'sub-µs unconfigured'],
        ['bugs caught pre-release', '2']
      ],
      events: [
        'Published an open-source Python library that instruments an AI application once and exports native telemetry to Phoenix, Langfuse, MLflow and Datadog simultaneously — resolving the mismatch between each backend\'s attribute vocabulary.',
        'Wrote a live integration suite against running Phoenix and MLflow instances rather than settling for in-memory unit tests. It caught two real bugs before release: incorrect span-to-project routing in Phoenix, and a missing native cost field in MLflow.',
        'Built a conformance test that diffs hardcoded attribute names against upstream OpenTelemetry/OpenInference semantic-convention packages, and benchmarked instrumentation overhead at sub-microsecond when unconfigured.'
      ]
    },
    {
      id: 'mphasis', depth: 1, t: 32, d: 4.5, live: true, color: '#b6f24a',
      name: 'work.mphasis.applied_ai', kind: 'WORK', kindColor: '#b6f24a',
      title: 'AI Engineer Intern — Applied AI Team',
      org: 'Mphasis · April 2026 → present',
      attrs: [
        ['team', 'Applied AI'],
        ['frameworks', 'LangChain · LangGraph · AgentScope'],
        ['ci/cd', 'GitLab → AWS'],
        ['status', 'ongoing']
      ],
      events: [
        'Work across the development and testing lifecycle of GenAI-based applications within the Applied AI team.',
        'Build and orchestrate LLM-driven agent workflows with tool calling using LangChain and LangGraph.',
        'Contributed to migrating agent components over to AgentScope for improved multi-agent orchestration.',
        'Use GitLab for version control and CI/CD pipelines supporting automated build, test and deployment workflows on AWS.'
      ]
    },
    {
      id: 'mph1', depth: 2, t: 32.4, d: 4.1, live: true, color: '#8fbf3a',
      name: '↳ agent.orchestration', kind: 'TASK', kindColor: '#b6f24a',
      title: 'Agent orchestration & tool calling',
      org: 'LangChain → LangGraph → AgentScope',
      attrs: [['pattern', 'ReAct + tool calling'], ['migration', 'to AgentScope'], ['goal', 'multi-agent']],
      events: [
        'Compose LLM-driven workflows where the model decides which tool to reach for, and the graph decides what happens next.',
        'Migration work focused on getting cleaner multi-agent orchestration than a single chain allows.'
      ]
    },
    {
      id: 'mph2', depth: 2, t: 33.2, d: 3.3, live: true, color: '#6f9a2c',
      name: '↳ cicd.gitlab_aws', kind: 'TASK', kindColor: '#b6f24a',
      title: 'CI/CD pipelines on AWS',
      org: 'GitLab CI · automated build/test/deploy',
      attrs: [['vcs', 'GitLab'], ['target', 'AWS'], ['scope', 'build · test · deploy']],
      events: [
        'Version control and pipeline work supporting automated build, test and deployment of GenAI services.'
      ]
    }
  ];

  /* ── Observix fan-out diagram ────────────────────────────────── */
  PP.sinks = [
    { id: 'phoenix',  name: 'Phoenix',  color: '#35e0e8', vocab: 'OpenInference' },
    { id: 'langfuse', name: 'Langfuse', color: '#8b5cf6', vocab: 'Langfuse SDK' },
    { id: 'mlflow',   name: 'MLflow',   color: '#b6f24a', vocab: 'MLflow tracing' },
    { id: 'datadog',  name: 'Datadog',  color: '#ffb443', vocab: 'DD APM / OTLP' }
  ];

  /* ── command palette ─────────────────────────────────────────── */
  PP.commands = [
    { icon: '◉', label: 'Root span — the graph',      hint: 'hero',    go: 'hero' },
    { icon: '❯', label: 'System prompt — about me',   hint: 'about',   go: 'about' },
    { icon: '✳', label: 'Embedding space — skills',   hint: 'stack',   go: 'stack' },
    { icon: '▤', label: 'The waterfall — experience', hint: 'trace',   go: 'trace' },
    { icon: '◫', label: 'QPGen — case study',         hint: 'work',    go: 'work' },
    { icon: '◈', label: 'Observix — case study',      hint: 'work',    go: 'work' },
    { icon: '⌘', label: 'Terminal — get in touch',    hint: 'contact', go: 'contact' },
    { icon: '✉', label: 'Email Pranav',               hint: 'mailto',  url: 'mailto:pranavparadhya1@gmail.com' },
    { icon: '⎔', label: 'GitHub — Pranav-PA',         hint: 'external', url: 'https://github.com/Pranav-PA' },
    { icon: 'in', label: 'LinkedIn — pranav-p-aradhya', hint: 'external', url: 'https://www.linkedin.com/in/pranav-p-aradhya/' }
  ];

})(window.PP);
