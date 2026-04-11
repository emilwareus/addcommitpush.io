import type { ResearchStage, ResearchState } from "./manifest";

export interface StatusSummary {
  research: {
    id: string;
    slug: string;
    title: string;
  };
  status: {
    stage: ResearchStage;
    state: ResearchState;
  };
  openQuestions: string[];
  inventory: {
    sources: number;
    insights: number;
    analysis: number;
    reports: number;
  };
  freshnessDebt: {
    count: number;
    windowDays: number;
    lastSourceSyncAt: string | null;
    staleSources: string[];
  };
  verificationDebt: {
    count: number;
    unsupportedInsights: string[];
    unsupportedReports: string[];
    contradictedAnalysis: string[];
    analysisWithOpenQuestions: string[];
    blockedReports: string[];
  };
  impacted: {
    insights: string[];
    analysis: string[];
    reports: string[];
  };
  nextRecommendedAction: string;
}

export const STATUS_SUMMARY_SCHEMA = {
  $id: "https://addcommitpush.io/researcher/schemas/status-summary.schema.json",
  type: "object",
  required: [
    "research",
    "status",
    "openQuestions",
    "inventory",
    "freshnessDebt",
    "verificationDebt",
    "impacted",
    "nextRecommendedAction",
  ],
  properties: {
    research: {
      type: "object",
      required: ["id", "slug", "title"],
      properties: {
        id: {
          type: "string",
          pattern: "^RES-[0-9]{8}-[a-z0-9]+(?:-[a-z0-9]+)*$",
        },
        slug: {
          type: "string",
          pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
        },
        title: {
          type: "string",
          minLength: 1,
        },
      },
      additionalProperties: false,
    },
    status: {
      type: "object",
      required: ["stage", "state"],
      properties: {
        stage: {
          type: "string",
          enum: ["intake", "harvest", "extract", "synthesize", "package", "refresh"],
        },
        state: {
          type: "string",
          enum: ["active", "paused", "archived"],
        },
      },
      additionalProperties: false,
    },
    openQuestions: {
      type: "array",
      items: {
        type: "string",
      },
    },
    inventory: {
      type: "object",
      required: ["sources", "insights", "analysis", "reports"],
      properties: {
        sources: {
          type: "integer",
          minimum: 0,
        },
        insights: {
          type: "integer",
          minimum: 0,
        },
        analysis: {
          type: "integer",
          minimum: 0,
        },
        reports: {
          type: "integer",
          minimum: 0,
        },
      },
      additionalProperties: false,
    },
    freshnessDebt: {
      type: "object",
      required: ["count", "windowDays", "lastSourceSyncAt", "staleSources"],
      properties: {
        count: {
          type: "integer",
          minimum: 0,
        },
        windowDays: {
          type: "integer",
          minimum: 1,
        },
        lastSourceSyncAt: {
          type: ["string", "null"],
          format: "date-time",
        },
        staleSources: {
          type: "array",
          uniqueItems: true,
          items: {
            type: "string",
            pattern: "^SRC-[0-9]{4}$",
          },
        },
      },
      additionalProperties: false,
    },
    verificationDebt: {
      type: "object",
      required: [
        "count",
        "unsupportedInsights",
        "unsupportedReports",
        "contradictedAnalysis",
        "analysisWithOpenQuestions",
        "blockedReports",
      ],
      properties: {
        count: {
          type: "integer",
          minimum: 0,
        },
        unsupportedInsights: {
          type: "array",
          uniqueItems: true,
          items: {
            type: "string",
            pattern: "^INS-[0-9]{4}$",
          },
        },
        unsupportedReports: {
          type: "array",
          uniqueItems: true,
          items: {
            type: "string",
            pattern: "^RPT-[0-9]{4}$",
          },
        },
        contradictedAnalysis: {
          type: "array",
          uniqueItems: true,
          items: {
            type: "string",
            pattern: "^ANL-[0-9]{4}$",
          },
        },
        analysisWithOpenQuestions: {
          type: "array",
          uniqueItems: true,
          items: {
            type: "string",
            pattern: "^ANL-[0-9]{4}$",
          },
        },
        blockedReports: {
          type: "array",
          uniqueItems: true,
          items: {
            type: "string",
            pattern: "^RPT-[0-9]{4}$",
          },
        },
      },
      additionalProperties: false,
    },
    impacted: {
      type: "object",
      required: ["insights", "analysis", "reports"],
      properties: {
        insights: {
          type: "array",
          uniqueItems: true,
          items: {
            type: "string",
            pattern: "^INS-[0-9]{4}$",
          },
        },
        analysis: {
          type: "array",
          uniqueItems: true,
          items: {
            type: "string",
            pattern: "^ANL-[0-9]{4}$",
          },
        },
        reports: {
          type: "array",
          uniqueItems: true,
          items: {
            type: "string",
            pattern: "^RPT-[0-9]{4}$",
          },
        },
      },
      additionalProperties: false,
    },
    nextRecommendedAction: {
      type: "string",
      minLength: 1,
    },
  },
  additionalProperties: false,
} as const;
