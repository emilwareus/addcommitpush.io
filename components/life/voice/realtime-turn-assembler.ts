'use client';

import type { RealtimeTurnRequest } from '@/lib/life/contracts';
import { RealtimeProtocolError } from './realtime-events';

type ProviderResponseStatus = 'completed' | 'cancelled' | 'failed' | 'incomplete';
export type DurableCommitStatus = 'speaking' | 'committing' | 'saved' | 'not_saved' | 'conflict';

interface ConversationNode {
  kind: 'user' | 'assistant' | 'function_call' | 'function_call_output' | 'system';
  previousItemId: string | null;
  callId?: string;
}

interface ResponseLedger {
  responseId: string;
  order: number;
  outputItemIds: Set<string>;
  assistantItemId?: string;
  assistantDelta: string;
  assistantTranscript?: string;
  providerStatus?: ProviderResponseStatus;
  directCitationIds: Set<string>;
  commitStatus: DurableCommitStatus;
  commitPayload?: RealtimeTurnRequest;
  commitError?: string;
}

export interface VoiceTurnView {
  responseId: string;
  userTranscript?: string;
  assistantTranscript: string;
  assistantIsPartial: boolean;
  providerStatus?: ProviderResponseStatus;
  citedMemoryIds: string[];
  commitStatus: DurableCommitStatus;
  commitError?: string;
}

export interface ProvisionalInputView {
  itemId: string;
  transcript: string;
  complete: boolean;
}

export interface TurnAssemblerSnapshot {
  turns: VoiceTurnView[];
  provisionalInputs: ProvisionalInputView[];
}

export class RealtimeTurnAssembler {
  private readonly nodes = new Map<string, ConversationNode>();
  private readonly inputDeltas = new Map<string, string>();
  private readonly inputTranscripts = new Map<string, string>();
  private readonly responses = new Map<string, ResponseLedger>();
  private readonly responseIdsByOutputItem = new Map<string, string>();
  private readonly citationIdsByItem = new Map<string, Set<string>>();
  private readonly citationIdsByCall = new Map<string, Set<string>>();
  private nextOrder = 0;

  addConversationItem(input: {
    itemId: string;
    type: 'message' | 'function_call' | 'function_call_output';
    role?: 'user' | 'assistant' | 'system';
    callId?: string;
    previousItemId?: string | null;
  }): void {
    const kind = this.nodeKind(input.type, input.role);
    const existing = this.nodes.get(input.itemId);
    const node: ConversationNode = {
      kind,
      previousItemId: input.previousItemId ?? null,
      ...(input.callId ? { callId: input.callId } : {}),
    };
    if (existing && !this.nodesMatch(existing, node)) {
      throw new RealtimeProtocolError(`Conversation item ${input.itemId} changed identity.`);
    }
    this.nodes.set(input.itemId, node);

    if (input.callId) {
      const citations = this.citationIdsByCall.get(input.callId);
      if (citations) this.addItemCitations(input.itemId, citations);
    }
  }

  addInputDelta(itemId: string, delta: string): void {
    if (this.inputTranscripts.has(itemId)) return;
    this.inputDeltas.set(itemId, `${this.inputDeltas.get(itemId) ?? ''}${delta}`);
  }

  completeInputTranscript(itemId: string, transcript: string): void {
    const existing = this.inputTranscripts.get(itemId);
    if (existing !== undefined && existing !== transcript) {
      throw new RealtimeProtocolError(`Input transcript ${itemId} changed after completion.`);
    }
    this.inputTranscripts.set(itemId, transcript);
    this.inputDeltas.delete(itemId);
  }

  linkOutputItem(responseId: string, itemId: string): void {
    const existingResponseId = this.responseIdsByOutputItem.get(itemId);
    if (existingResponseId && existingResponseId !== responseId) {
      throw new RealtimeProtocolError(`Output item ${itemId} belongs to two responses.`);
    }
    this.responseIdsByOutputItem.set(itemId, responseId);
    this.getResponse(responseId).outputItemIds.add(itemId);
  }

  addAssistantDelta(responseId: string, itemId: string, delta: string): void {
    this.linkOutputItem(responseId, itemId);
    const response = this.getResponse(responseId);
    if (response.assistantTranscript !== undefined) return;
    this.assignAssistantItem(response, itemId);
    response.assistantDelta += delta;
  }

  completeAssistantTranscript(responseId: string, itemId: string, transcript: string): void {
    this.linkOutputItem(responseId, itemId);
    const response = this.getResponse(responseId);
    this.assignAssistantItem(response, itemId);
    if (response.assistantTranscript !== undefined && response.assistantTranscript !== transcript) {
      throw new RealtimeProtocolError(
        `Assistant transcript ${responseId} changed after completion.`
      );
    }
    response.assistantTranscript = transcript;
    response.assistantDelta = '';
  }

  completeResponse(responseId: string, status: ProviderResponseStatus): void {
    const response = this.getResponse(responseId);
    if (response.providerStatus && response.providerStatus !== status) {
      throw new RealtimeProtocolError(`Response ${responseId} changed terminal status.`);
    }
    response.providerStatus = status;
    if (status !== 'completed' && response.commitStatus !== 'saved') {
      response.commitStatus = 'not_saved';
      response.commitError = 'The provider response was interrupted and is not eligible to save.';
    }
  }

  recordToolResult(input: {
    responseId: string;
    functionItemId: string;
    callId: string;
    memoryIds: readonly string[];
  }): void {
    const response = this.getResponse(input.responseId);
    const callCitations = this.citationIdsByCall.get(input.callId) ?? new Set<string>();
    for (const memoryId of input.memoryIds) {
      response.directCitationIds.add(memoryId);
      callCitations.add(memoryId);
    }
    this.citationIdsByCall.set(input.callId, callCitations);
    this.addItemCitations(input.functionItemId, callCitations);
    for (const [itemId, node] of this.nodes) {
      if (node.callId === input.callId) this.addItemCitations(itemId, callCitations);
    }
  }

  takeReadyCommits(): RealtimeTurnRequest[] {
    const commits: RealtimeTurnRequest[] = [];
    for (const response of this.responses.values()) {
      if (response.commitStatus !== 'speaking') continue;
      const payload = this.buildCommitPayload(response);
      if (!payload) continue;
      response.commitPayload = payload;
      response.commitStatus = 'committing';
      commits.push(payload);
    }
    return commits;
  }

  beginRetry(responseId: string): RealtimeTurnRequest | null {
    const response = this.responses.get(responseId);
    if (!response?.commitPayload || response.commitStatus !== 'not_saved') return null;
    response.commitStatus = 'committing';
    response.commitError = undefined;
    return response.commitPayload;
  }

  markSaved(responseId: string): void {
    const response = this.requireResponse(responseId);
    response.commitStatus = 'saved';
    response.commitError = undefined;
  }

  markNotSaved(responseId: string, message: string): void {
    const response = this.requireResponse(responseId);
    response.commitStatus = 'not_saved';
    response.commitError = message;
  }

  markConflict(responseId: string): void {
    const response = this.requireResponse(responseId);
    response.commitStatus = 'conflict';
    response.commitError =
      'Life reported a commit conflict, but the provider response is absent from the durable transcript.';
  }

  snapshot(): TurnAssemblerSnapshot {
    const visibleResponses = [...this.responses.values()]
      .sort((left, right) => left.order - right.order)
      .filter(
        (response) =>
          response.assistantDelta.length > 0 || response.assistantTranscript !== undefined
      );
    const attachedInputIds = new Set<string>();
    const turns = visibleResponses.map((response) => {
      const origin = this.findOrigin(response);
      if (origin.userItemId) attachedInputIds.add(origin.userItemId);
      return {
        responseId: response.responseId,
        ...(origin.userItemId
          ? { userTranscript: this.inputTranscripts.get(origin.userItemId) }
          : {}),
        assistantTranscript: response.assistantTranscript ?? response.assistantDelta,
        assistantIsPartial: response.assistantTranscript === undefined,
        ...(response.providerStatus ? { providerStatus: response.providerStatus } : {}),
        citedMemoryIds: [...origin.citationIds].sort(),
        commitStatus: response.commitStatus,
        ...(response.commitError ? { commitError: response.commitError } : {}),
      };
    });

    const provisionalInputs = [
      ...new Set([...this.inputDeltas.keys(), ...this.inputTranscripts.keys()]),
    ]
      .filter((itemId) => !attachedInputIds.has(itemId))
      .map((itemId) => ({
        itemId,
        transcript: this.inputTranscripts.get(itemId) ?? this.inputDeltas.get(itemId) ?? '',
        complete: this.inputTranscripts.has(itemId),
      }))
      .filter((input) => input.transcript.length > 0);

    return { turns, provisionalInputs };
  }

  private getResponse(responseId: string): ResponseLedger {
    const existing = this.responses.get(responseId);
    if (existing) return existing;
    const response: ResponseLedger = {
      responseId,
      order: this.nextOrder++,
      outputItemIds: new Set(),
      assistantDelta: '',
      directCitationIds: new Set(),
      commitStatus: 'speaking',
    };
    this.responses.set(responseId, response);
    return response;
  }

  private requireResponse(responseId: string): ResponseLedger {
    const response = this.responses.get(responseId);
    if (!response) throw new RealtimeProtocolError(`Response ${responseId} is not in the ledger.`);
    return response;
  }

  private assignAssistantItem(response: ResponseLedger, itemId: string): void {
    if (response.assistantItemId && response.assistantItemId !== itemId) {
      throw new RealtimeProtocolError(
        `Response ${response.responseId} has multiple audio messages.`
      );
    }
    response.assistantItemId = itemId;
  }

  private buildCommitPayload(response: ResponseLedger): RealtimeTurnRequest | null {
    if (response.providerStatus !== 'completed' || response.assistantTranscript === undefined) {
      return null;
    }
    const origin = this.findOrigin(response);
    if (!origin.userItemId) return null;
    const userTranscript = this.inputTranscripts.get(origin.userItemId);
    if (userTranscript === undefined) return null;
    return {
      user_transcript: userTranscript,
      assistant_transcript: response.assistantTranscript,
      provider_response_id: response.responseId,
      cited_memory_ids: [...origin.citationIds].sort(),
    };
  }

  private findOrigin(response: ResponseLedger): {
    userItemId?: string;
    citationIds: Set<string>;
  } {
    const citationIds = new Set(response.directCitationIds);
    const startItemId = response.assistantItemId;
    if (!startItemId) return { citationIds };

    let itemId: string | null = startItemId;
    const visited = new Set<string>();
    while (itemId) {
      if (visited.has(itemId)) {
        throw new RealtimeProtocolError('OpenAI sent a cyclic conversation item chain.');
      }
      visited.add(itemId);
      for (const memoryId of this.citationIdsByItem.get(itemId) ?? []) {
        citationIds.add(memoryId);
      }
      const node = this.nodes.get(itemId);
      if (!node) return { citationIds };
      if (node.kind === 'user') return { userItemId: itemId, citationIds };
      itemId = node.previousItemId;
    }
    return { citationIds };
  }

  private addItemCitations(itemId: string, citations: ReadonlySet<string>): void {
    const itemCitations = this.citationIdsByItem.get(itemId) ?? new Set<string>();
    for (const memoryId of citations) itemCitations.add(memoryId);
    this.citationIdsByItem.set(itemId, itemCitations);
  }

  private nodeKind(
    type: 'message' | 'function_call' | 'function_call_output',
    role?: 'user' | 'assistant' | 'system'
  ): ConversationNode['kind'] {
    if (type === 'function_call') return 'function_call';
    if (type === 'function_call_output') return 'function_call_output';
    if (role === 'user') return 'user';
    if (role === 'assistant') return 'assistant';
    return 'system';
  }

  private nodesMatch(left: ConversationNode, right: ConversationNode): boolean {
    return (
      left.kind === right.kind &&
      left.previousItemId === right.previousItemId &&
      left.callId === right.callId
    );
  }
}
