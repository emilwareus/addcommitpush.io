export interface PatentFiling {
  id: string;
  url: string;
}

export interface Patent {
  title: string;
  summary: string;
  filings: PatentFiling[];
  assignee: string;
}

export const patents: Patent[] = [
  {
    title: 'Method for linking CVE with synthetic CPE',
    summary:
      'Uses NLP to automatically link vulnerability databases (CVE) with platform enumerations (CPE) by extracting information and building synthetic mappings.',
    filings: [
      {
        id: 'SE2050302A1',
        url: 'https://worldwide.espacenet.com/patent/search?q=pn%3DSE2050302A1',
      },
      {
        id: 'US12339972B2',
        url: 'https://worldwide.espacenet.com/patent/search?q=pn%3DUS12339972B2',
      },
    ],
    assignee: 'Debricked AB',
  },
  {
    title: 'Method for finding vulnerabilities in software projects',
    summary:
      'Parses dependency files, generates CPE identifiers, and matches against vulnerability databases using confidence scoring to identify relevant security issues.',
    filings: [
      {
        id: 'US12386975B2',
        url: 'https://worldwide.espacenet.com/patent/search?q=pn%3DUS12386975B2',
      },
    ],
    assignee: 'Debricked AB',
  },
  {
    title: 'Method for assessing quality of open source projects',
    summary:
      'Determines quality metrics for open-source projects by extracting features from project data, applying statistical transforms, and weighting relative to similar projects.',
    filings: [
      {
        id: 'US2023367591A1',
        url: 'https://worldwide.espacenet.com/patent/search?q=pn%3DUS2023367591A1',
      },
    ],
    assignee: 'Debricked AB',
  },
  {
    title: 'Method for identifying vulnerabilities in code',
    summary:
      'Automates vulnerability detection using NLP on open-source issue discussions with hierarchical attention networks and virtual adversarial training.',
    filings: [
      {
        id: 'US12265612B2',
        url: 'https://worldwide.espacenet.com/patent/search?q=pn%3DUS12265612B2',
      },
    ],
    assignee: 'Debricked AB',
  },
  {
    title: 'Learning-based identification of vulnerable functions',
    summary:
      'Identifies vulnerable functions in code using call graph analysis and ML models that map CVE data to specific functions.',
    filings: [
      {
        id: 'US2024241963A1',
        url: 'https://worldwide.espacenet.com/patent/search?q=pn%3DUS2024241963A1',
      },
    ],
    assignee: 'Micro Focus LLC',
  },
  {
    title: 'Software vulnerability remediation',
    summary:
      'Maps package dependencies to non-vulnerable versions, ensuring compatibility across interdependent packages while eliminating security risks.',
    filings: [
      {
        id: 'US12314403B2',
        url: 'https://worldwide.espacenet.com/patent/search?q=pn%3DUS12314403B2',
      },
    ],
    assignee: 'Micro Focus LLC',
  },
  {
    title: 'Identification of relevant code blocks via embeddings',
    summary:
      'Uses code embeddings and functionality clustering to locate relevant code blocks within software packages based on queries.',
    filings: [
      {
        id: 'US12443396B2',
        url: 'https://worldwide.espacenet.com/patent/search?q=pn%3DUS12443396B2',
      },
    ],
    assignee: 'Micro Focus LLC',
  },
  {
    title: 'Detection of malicious packages using ML',
    summary:
      'Combines malicious code classifiers with community behavior analysis to detect malicious software packages using machine learning.',
    filings: [
      {
        id: 'US2024419793A1',
        url: 'https://worldwide.espacenet.com/patent/search?q=pn%3DUS2024419793A1',
      },
    ],
    assignee: 'Micro Focus LLC',
  },
  {
    title: 'Automated patch generation for software flaws',
    summary:
      'Uses ML to identify vulnerabilities in databases, locate affected code, and auto-generate patches from version deltas where issues were fixed.',
    filings: [
      {
        id: 'US2024385823A1',
        url: 'https://worldwide.espacenet.com/patent/search?q=pn%3DUS2024385823A1',
      },
    ],
    assignee: 'Micro Focus LLC',
  },
  {
    title: 'License analysis for AI-generated content',
    summary:
      'Analyzes AI-generated compositions to identify training data sources and automatically assigns appropriate licensing based on source material licenses.',
    filings: [
      {
        id: 'US2025190858A1',
        url: 'https://worldwide.espacenet.com/patent/search?q=pn%3DUS2025190858A1',
      },
    ],
    assignee: 'Micro Focus LLC',
  },
  {
    title: 'Comprehensive software supply chain analysis',
    summary:
      'Monitors external component updates, analyzes API changes, identifies new vulnerabilities, and generates composite quality scores for developers.',
    filings: [
      {
        id: 'US2024193276A1',
        url: 'https://worldwide.espacenet.com/patent/search?q=pn%3DUS2024193276A1',
      },
    ],
    assignee: 'Micro Focus LLC',
  },
  {
    title: 'Controlling source code use in AI training',
    summary:
      'Manages licensing for AI models trained on licensed source code, tracking and attributing licenses to AI-generated output code.',
    filings: [
      {
        id: 'US2025173802A1',
        url: 'https://worldwide.espacenet.com/patent/search?q=pn%3DUS2025173802A1',
      },
    ],
    assignee: 'Micro Focus LLC',
  },
];
