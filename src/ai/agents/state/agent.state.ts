import { BaseMessage } from '@langchain/core/messages';
import { Annotation } from '@langchain/langgraph';
import { Citation } from '../../../common/types';
import { ToolExecutionRecord } from '../../tools/tool.interface';

export interface AgentStateData {
  messages: BaseMessage[];
  userId?: string;
  applicationId: string;
  tenantId: string;
  query: string;
  systemInstruction?: string;
  retrievedContext: string;
  citations: Citation[];
  toolResults: ToolExecutionRecord[];
  finalResponse: string;
  metadata: Record<string, any>;
  nextAction: 'retrieve' | 'tool_call' | 'respond' | 'end';
}

export const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  userId: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  applicationId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),
  tenantId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),
  query: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),
  systemInstruction: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
  retrievedContext: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),
  citations: Annotation<Citation[]>({
    reducer: (x, y) => (y ? y : x),
    default: () => [],
  }),
  toolResults: Annotation<ToolExecutionRecord[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  finalResponse: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),
  metadata: Annotation<Record<string, any>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  nextAction: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => 'classify',
  }),
});
