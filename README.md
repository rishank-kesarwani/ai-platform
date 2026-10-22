# Portfolio AI Platform Service

> **Enterprise-grade, application-agnostic AI backend service powered by TypeScript, Node.js, NestJS, Google Gemini, LangChain JS, LangGraph JS, Redis, BullMQ, Qdrant, and MongoDB.**

---


## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Application Ecosystem & Portfolio Integrations](#2-application-ecosystem--portfolio-integrations)
3. [Why This Service Exists](#3-why-this-service-exists)
4. [Architecture](#4-architecture)
5. [Architecture Diagram](#5-architecture-diagram)
6. [RAG Architecture](#6-rag-architecture)
7. [RAG Ingestion Flow](#7-rag-ingestion-flow)
8. [RAG Query Flow](#8-rag-query-flow)
9. [LangChain Architecture](#9-langchain-architecture)
10. [LangGraph Architecture](#10-langgraph-architecture)
11. [Redis Architecture](#11-redis-architecture)
12. [BullMQ Architecture](#12-bullmq-architecture)
13. [MongoDB Schema](#13-mongodb-schema)
14. [Qdrant Schema](#14-qdrant-schema)
15. [Multi-Tenancy & Isolation](#15-multi-tenancy--isolation)
16. [Security](#16-security)
17. [Authentication](#17-authentication)
18. [API Documentation](#18-api-documentation)
19. [Local Setup](#19-local-setup)
20. [Docker Setup](#20-docker-setup)
21. [Environment Variables](#21-environment-variables)
22. [Gemini Setup](#22-gemini-setup)
23. [Qdrant Setup](#23-qdrant-setup)
24. [Redis Setup](#24-redis-setup)
25. [Testing](#25-testing)
26. [CI/CD Pipeline](#26-cicd-pipeline)
27. [Production Deployment](#27-production-deployment)
28. [Performance Considerations](#28-performance-considerations)
29. [Caching Strategy](#29-caching-strategy)
30. [Retry Strategy](#30-retry-strategy)
31. [Failure Scenarios & Resilience](#31-failure-scenarios--resilience)
32. [Observability & Telemetry](#32-observability--telemetry)
33. [RAG Evaluation Framework](#33-rag-evaluation-framework)
34. [Cost Considerations](#34-cost-considerations)
35. [Future Improvements](#35-future-improvements)

---

## 1. Project Overview

`portfolio-ai-platform` is a centralized, high-performance AI infrastructure service designed to power a portfolio of specialized consumer-facing and engineering AI applications:

1. **ai-travel-planner** (Itinerary generation, destination recommendations, and budget planning)
2. **ai-movie-matcher** (Conversational movie discovery, mood-based matching, and semantic recommendation)
3. **ai-sports-tracker** (Real-time game intelligence, odds analysis, and match commentary)
4. **ai-study-spot-finder** (Study location discovery, noise level analysis, and study concierge)
5. **ai-hiking-explorer** (Trail discovery, difficulty ratings, terrain advice, and hiking concierge)
6. **ai-pipeline-observability** (Multi-agent AI pipeline telemetry, trace diagnostics, and automated root-cause analysis)
7. **ai-model-regression-detection** (LLM evaluation, prompt regression testing, and output drift scoring)
8. **ai-pr-review-platform** (Automated GitHub PR code analysis, security auditing, and quality reviews)
9. **ai-cost-routing-autopilot** (Multi-provider model routing, budget enforcement, and cost optimization)
10. **ai-output-arbitration** (Multi-model consensus evaluation, hallucination detection, and factual arbitration)
11. **ai-rag-quality-ops** (Vector search retrieval quality benchmarking, latency monitoring, and RAG metric operationalization)
12. **ai-prompt-experiment-manager** (Prompt engineering experimentation, A/B variant testing, and prompt version control)

The platform is **application-agnostic**. It contains **zero** domain-specific business logic. Instead, client backend services supply their context (`applicationId`, `tenantId`, `userId`, documents, tools, prompts) while the platform provides unified AI infrastructure:
- LLM inference & streaming (Google Gemini `gemini-1.5-flash` / `gemini-1.5-pro`)
- Embedding generation (Gemini Embeddings `text-embedding-004`)
- Production RAG pipeline with strict multi-tenant vector retrieval (Qdrant)
- Agent workflow execution with LangGraph state graphs
- Multi-tier memory (sliding conversation windows + structured long-term user memories)
- Distributed caching and locking (Redis)
- Resilient asynchronous background processing (BullMQ)
- Observability and benchmark evaluations

---

## 2. Application Ecosystem & Portfolio Integrations

The AI Platform sits at the center of a decoupled multi-application architecture. Rather than having each domain application maintain its own vector database, embedding pipeline, Redis lock coordination, and LLM retry policies, client applications communicate with `ai-platform` via authenticated service-to-service REST and SSE endpoints.

### 2.1 Verified AI Platform Consumer Applications

The following applications have verified backend implementations actively consuming the shared AI Platform:

| Application | Purpose | Live Demo | Source Code | AI Platform Integration |
|---|---|---|---|---|
| **AI Travel Planner** | AI-assisted trip planning, itinerary synthesis, and destination guides | [Live Demo](https://travel-planner.rishankkesharwani.com/plan-trip) | [GitHub](https://github.com/rishank-kesarwani/ai-travel-planner) | **Verified Consumer**: Backend `AiPlatformClient` connects to `/api/v1/ai/chat` for conversational trip planning and dispatches travel guide vectors via BullMQ trip-indexing processors. |
| **AI Movie Matcher** | Movie discovery, mood-based matching, and semantic recommendation | [Live Demo](https://movie-matcher.rishankkesharwani.com/) | [GitHub](https://github.com/rishank-kesarwani/ai-movie-matcher) | **Verified Consumer**: Consumes `/api/v1/ai/chat` and embedding services via backend `AiPlatformClient` for personalized movie matching. |
| **AI Sports Tracker** | Real-time game intelligence, odds analysis, and match summaries | [Live Demo](https://sports-tracker.rishankkesharwani.com/) | [GitHub](https://github.com/rishank-kesarwani/ai-sports-tracker) | **Verified Consumer**: Consumes chat endpoints via backend `AiPlatformClient` with circuit-breaker protection for automated game summaries. |
| **AI Study Spot Finder** | Campus and city study location discovery, amenity filtering, and noise analysis | [Live Demo](https://study-spot-finder.rishankkesharwani.com/) | [GitHub](https://github.com/rishank-kesarwani/ai-study-spot-finder) | **Verified Consumer**: Integrates via `AiStudyConciergeService` and `AiPlatformClient` for conversational study spot recommendations. |
| **AI Hiking Explorer** | Hiking trail discovery, elevation/terrain analysis, and trail advice | [Live Demo](https://hiking-explorer.rishankkesharwani.com/nearby) | [GitHub](https://github.com/rishank-kesarwani/ai-hiking-explorer) | **Verified Consumer**: Calls AI Platform via `AiPlatformClient` using `AI_PLATFORM_HIKING_API_KEY` for trail recommendations, with local heuristic engine fallback. |
| **AI Pipeline Observability** | Multi-agent AI pipeline telemetry, trace diagnostics, and automated root-cause analysis | [Live Demo](https://pipeline-observability.rishankkesharwani.com/) | [GitHub](https://github.com/rishank-kesarwani/ai-pipeline-observability) | **Verified Consumer**: Transmits failed workflow traces to `/api/v1/ai/chat` using `AI_PLATFORM_OBSERVABILITY_API_KEY` for LLM-powered incident diagnostics. |
| **AI Model Regression Detection** | LLM evaluation, prompt regression testing, output drift detection, and benchmark scoring | [Live Demo](https://model-regression.rishankkesharwani.com/) | [GitHub](https://github.com/rishank-kesarwani/ai-model-regression-detection) | **Verified Consumer**: Routes benchmark evaluation requests to the shared platform via `AI_PLATFORM_MODEL_REGRESSION_API_KEY`. |
| **AI PR Review** | Automated GitHub pull request code review, security scanning, and anti-pattern analysis | [Live Demo](https://ai-pr-review.rishankkesharwani.com/reviews) | [GitHub](https://github.com/rishank-kesarwani/ai-pr-review-platform) | **Verified Consumer**: Orchestrator calls `AiPlatformService` via `AI_PLATFORM_PR_REVIEW_API_KEY` to generate structured code review findings with Gemini fallback. |
| **AI Cost Routing Autopilot** | Multi-provider model routing, cost optimization, and budget enforcement | [Live Demo](https://ai-cost-routing-autopilot.rishankkesharwani.com/) | [GitHub](https://github.com/rishank-kesarwani/ai-cost-routing-autopilot) | **Verified Consumer**: Backend `AiPlatformClient` within `RoutingService` routes execution traffic and monitors provider health. |
| **AI Output Arbitration** | Multi-model consensus evaluation, hallucination detection, and factual arbitration | [Live Demo](https://ai-output-arbitration.rishankkesharwani.com/) | [GitHub](https://github.com/rishank-kesarwani/ai-output-arbitration) | **Verified Consumer**: Backend `AiPlatformClient` dispatches judge evaluations to `/ai/chat` to compare candidate outputs against evidence context. |
| **AI RAG Quality Ops** | Vector search quality benchmarking, retrieval latency monitoring, and RAG metric operationalization | [Live Demo](https://ai-rag-quality-ops.rishankkesharwani.com/) | [GitHub](https://github.com/rishank-kesarwani/ai-rag-quality-ops) | **Verified Consumer**: Backend `AiPlatformClient` dispatches live RAG queries to `/api/v1/rag/query` to evaluate retrieval precision and citation faithfulness. |
| **AI Prompt Experiment Manager** | Prompt engineering experimentation, A/B variant testing, and prompt version control | [Live Demo](https://prompt-experiment.rishankkesharwani.com/) | [GitHub](https://github.com/rishank-kesarwani/ai-prompt-experiment-manager) | **Verified Consumer**: Backend `AiPlatformClient` dispatches prompt execution runs to `/api/v1/ai/chat` to benchmark prompt variations across model parameters. |

### 2.2 Broader Portfolio Ecosystem (Independent / Companion Services)

The portfolio includes additional live services that operate alongside the platform:

| Application / Service | Purpose | Live Demo | Source Code | Relationship to AI Platform |
|---|---|---|---|---|
| **AI Document Intelligence** | Multi-format document parsing, OCR extraction, and structured information workflows | [Live Demo](https://document-intelligence.rishankkesharwani.com/) | [GitHub](https://github.com/rishank-kesarwani/ai-document-intelligence) | **Independent / Non-Consumer**: Evaluates environment configuration for `AI_PLATFORM_API_KEY` to surface modality limitations in health checks, but executes primary document extraction locally via embedded PDF and OCR tools without dispatching active HTTP requests to the platform. |
| **Notification Service** | Shared notification backend supporting email and push channels with queueing and circuit breakers | N/A (Internal API) | [GitHub](https://github.com/rishank-kesarwani/notification-service) | **Companion Service**: Provides asynchronous delivery infrastructure (email, FCM push) consumed by portfolio applications in coordination with AI Platform workflows. |

---

## 3. Why This Service Exists

When building multiple AI-driven applications, engineering teams frequently duplicate foundational AI plumbing:
- Fragmented vector database connections and non-standardized chunking.
- Inconsistent security boundaries leading to data leakage across tenants or users.
- Fragile LLM rate limit handling, lack of retries, and high latency.
- Disconnected memory implementations and redundant token consumption.

This platform consolidates all AI capabilities into a single, scalable, audited, and resilient service-to-service backend.

---

## 4. Architecture

```
+-------------------------------------------------------------+
|                     Client Application                      |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|             Consumer Application Backend (Auth)             |
|   (Authenticates end-user, assigns tenantId & userId)       |
+-------------------------------------------------------------+
                              |
                              | Authenticated Service-to-Service Request
                              | [Header: x-api-key]
                              v
+=============================================================+
|                      AI Platform Service                    |
|                                                             |
|  +---------------------+  +-------------------------------+ |
|  | ServiceAuthGuard    |  | CorrelationId / Pino Logging  | |
|  +---------------------+  +-------------------------------+ |
|  | Throttler (RateLim) |  | Global Exception Sanitizer    | |
|  +---------------------+  +-------------------------------+ |
|                                                             |
|  [ Modules ]                                                |
|  - Chat Engine & SSE Streaming                              |
|  - RAG Ingestion & Multi-Tenant Retrieval Engine            |
|  - LangGraph Generic Agent Orchestrator                     |
|  - Memory Management (Sliding History & Long-Term Memory)   |
|  - Prompt Management & Versioning                           |
|  - AI Response Caching & Distributed Locks                  |
|  - Automated RAG Quality Evaluations                        |
+=============================================================+
      |               |             |             |
      v               v             v             v
+-----------+   +-----------+ +-----------+ +-----------+
|  Gemini   |   |   Redis   | |   Qdrant  | |  MongoDB  |
|  LLM &    |   |  Cache,   | |  Vector   | | Metadata, |
| Embedding |   |  Locks &  | |   Store   | | History & |
|    API    |   |  BullMQ   | | (Cosine)  | | Executions|
+-----------+   +-----------+ +-----------+ +-----------+
```

---

## 5. Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientLayer ["Consumer Applications & Systems"]
        App1["AI Travel Planner<br/>(Itineraries & Concierge)"]
        App2["AI Movie Matcher<br/>(Discovery & Recommendations)"]
        App3["AI Sports Tracker<br/>(Game Intelligence)"]
        App4["AI PR Review & Observability<br/>(Engineering Automation)"]
        App5["AI RAG Quality Ops & Arbitration<br/>(Evaluation & Arbitration)"]
    end

    subgraph AppBackends ["App Backend Gateways"]
        Backend["App Backend Server<br/>(Authenticates End User)"]
    end

    subgraph AIPlatform ["AI Platform Service"]
        AuthGuard["ServiceAuthGuard & RateLimiter<br/>(App-Specific API Keys)"]
        ChatController["Chat & Streaming Controllers"]
        RagController["RAG Controller"]
        AgentController["LangGraph Agent Controller"]
        
        CacheService[("Redis Cache & Locks<br/>(ai:response, distributed locks)")]
        QueueService["BullMQ Queues<br/>(rag-ingestion)"]
        
        RagEngine["RAG Ingestion & Multi-Tenant Retrieval"]
        LangGraphEngine["LangGraph State Workflow Engine"]
        MemoryEngine["Conversation & User Memory Service"]
    end

    subgraph ExternalServices ["External Providers & Data Stores"]
        GeminiLLM["Google Gemini LLM<br/>(gemini-1.5-flash)"]
        GeminiEmbed["Google Gemini Embeddings<br/>(text-embedding-004)"]
        QdrantDB[("Qdrant Vector DB<br/>(768-dim, Cosine)")]
        MongoDB[("MongoDB Document DB<br/>(Documents, Chunks, Executions)")]
    end

    App1 --> Backend
    App2 --> Backend
    App3 --> Backend
    App4 --> Backend
    App5 --> Backend

    Backend -->|x-api-key| AuthGuard
    AuthGuard --> ChatController
    AuthGuard --> RagController
    AuthGuard --> AgentController

    ChatController --> CacheService
    ChatController --> MemoryEngine
    ChatController --> RagEngine
    ChatController --> GeminiLLM

    RagController --> QueueService
    QueueService --> RagEngine

    RagEngine --> GeminiEmbed
    RagEngine --> QdrantDB
    RagEngine --> MongoDB

    AgentController --> LangGraphEngine
    LangGraphEngine --> RagEngine
    LangGraphEngine --> GeminiLLM

    MemoryEngine --> MongoDB
    ChatController --> MongoDB
```

---

## 6. RAG Architecture

The Retrieval-Augmented Generation (RAG) architecture is decoupled into two distinct pipelines:
1. **Asynchronous Ingestion Pipeline**: Handles document normalization, recursive chunking, batch embedding generation, stale version invalidation, vector indexing, and metadata persistence via BullMQ.
2. **Synchronous Query Pipeline**: Executes query embedding, multi-tenant filtered vector search with tenant/user isolation, context formatting, and citation generation.

---

## 7. RAG Ingestion Flow

The ingestion pipeline is designed for **high throughput, idempotency, and zero client blocking**. Client requests receive an immediate `202 Accepted` acknowledgement while document chunking, embedding, and vector indexing happen asynchronously with automatic retries.

### 7.1 Ingestion Pipeline Architecture

```mermaid
flowchart TD
    subgraph Ingress ["1. Fast Ingress & Staging"]
        ClientReq["Client POST /api/v1/rag/documents<br/>(docId, title, content, metadata)"]
        RagCtrl["RagController & IngestionService"]
        MongoStage[("MongoDB: ai_documents<br/>Save Metadata, Version N+1<br/>Status: queued")]
        BullQueue["BullMQ: rag-ingestion Queue<br/>Job ID: rag:app:tenant:doc:vN"]
        Ack["Return 202 Accepted<br/>{ documentId, status: 'queued', version: N }"]
    end

    subgraph WorkerProcess ["2. Asynchronous Worker Processing"]
        Worker["RagIngestionProcessor (BullMQ Worker)"]
        MongoProc[("MongoDB: ai_documents<br/>Update Status: processing")]
        Chunker["RecursiveCharacterChunker<br/>(Chunk Size: 800, Overlap: 150)"]
        Chunks["Deterministic Chunk List<br/>chunkId: app:tenant:doc:vN:index"]
    end

    subgraph EmbeddingGen ["3. Batch Vector Embedding"]
        GeminiService["GeminiEmbeddingService"]
        GeminiAPI["Google Gemini API<br/>(text-embedding-004, 768-dim)"]
        Vectors["Generated 768-dim Vectors"]
    end

    subgraph AtomicIndexing ["4. Atomic Indexing & Version Cleanup"]
        QdrantPurge["Qdrant: Delete Prior Version Chunks<br/>(docId = X AND version &lt; N)"]
        QdrantUpsert["Qdrant: Upsert New Vector Points<br/>(Payload: app, tenant, user, text, meta)"]
        MongoChunks[("MongoDB: ai_chunks<br/>Purge Old Chunks & Insert New Chunks")]
        MongoFinal[("MongoDB: ai_documents<br/>Status: indexed, chunkCount: K")]
    end

    ClientReq --> RagCtrl
    RagCtrl --> MongoStage
    RagCtrl --> BullQueue
    RagCtrl --> Ack

    BullQueue --> Worker
    Worker --> MongoProc
    Worker --> Chunker
    Chunker --> Chunks
    Chunks --> GeminiService
    GeminiService --> GeminiAPI
    GeminiAPI --> Vectors

    Vectors --> QdrantPurge
    QdrantPurge --> QdrantUpsert
    QdrantUpsert --> MongoChunks
    MongoChunks --> MongoFinal
```

### 7.2 Detailed Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor App as Consumer Application
    participant Ctrl as RAG Controller
    participant Mongo as MongoDB
    participant Queue as BullMQ Queue
    participant Worker as Ingestion Worker
    participant Chunker as Text Chunker
    participant Gemini as Gemini Embeddings
    participant Qdrant as Qdrant Vector DB

    Note over App,Queue: Stage 1: Fast Ingestion Request & Job Staging
    App->>Ctrl: POST /api/v1/rag/documents (Doc Payload)
    Ctrl->>Mongo: Upsert ai_documents (version = N+1, status = "queued")
    Mongo-->>Ctrl: Document Staged
    Ctrl->>Queue: Add Job (ID: rag:appId:tenantId:docId:vN)
    Ctrl-->>App: 202 Accepted { documentId, status: "queued", version: N }

    Note over Queue,Qdrant: Stage 2: Asynchronous Chunking & Batch Embedding
    Queue->>Worker: Consume Ingestion Job
    Worker->>Mongo: Update ai_documents (status = "processing")
    Worker->>Chunker: Split Content (chunkSize=800, overlap=150)
    Chunker-->>Worker: Return Chunks with Deterministic IDs
    Worker->>Gemini: Request Batch Embeddings (Batch size = 20)
    Gemini-->>Worker: Return 768-dim Embeddings

    Note over Worker,Qdrant: Stage 3: Atomic Storage & Stale Chunk Invalidation
    alt If Document Version > 1
        Worker->>Qdrant: Delete Previous Version Points (version < N)
        Worker->>Mongo: Delete Previous Version Chunks from ai_chunks
    end
    Worker->>Qdrant: Upsert New Vector Points + Filter Metadata
    Qdrant-->>Worker: Points Indexed
    Worker->>Mongo: Insert New Records into ai_chunks
    Worker->>Mongo: Update ai_documents (status = "indexed", chunkCount)
    Worker-->>Queue: Job Completed Successfully
```

### 7.3 Ingestion Lifecycle Breakdown

| Stage | Action | Description |
|---|---|---|
| **1. Validation & Staging** | Controller & MongoDB | Validates payload, increments document version, stores document in `ai_documents` with `status: "queued"`. |
| **2. Idempotent Enqueuing** | BullMQ | Creates a job with deterministic ID `rag:{appId}:{tenantId}:{docId}:v{version}` with 3 automatic exponential retries. |
| **3. Recursive Chunking** | `RecursiveCharacterChunker` | Normalizes text and creates chunks bounded by `RAG_CHUNK_SIZE` (800 chars) with `RAG_CHUNK_OVERLAP` (150 chars). |
| **4. Batch Embedding** | Gemini API | Embeds chunks in batches of 20 using `text-embedding-004` to minimize latency. |
| **5. Stale Version Purge** | Qdrant & MongoDB | Atomically purges prior version chunks (`version < N`) to prevent duplicate or stale search results. |
| **6. Vector & Chunk Storage** | Qdrant & MongoDB | Upserts 768-dim vector points with multi-tenant payload filters into Qdrant and saves chunk entities to `ai_chunks`. |
| **7. Final Confirmation** | MongoDB | Updates document record with `status: "indexed"` and total chunk count. |

---

## 8. RAG Query Flow

```mermaid
sequenceDiagram
    autonumber
    actor Client as Consumer Application
    participant Chat as Chat & Query Service
    participant Embed as Gemini Embeddings
    participant Qdrant as Qdrant Vector DB
    participant LLM as Google Gemini LLM

    Client->>Chat: POST /api/v1/ai/chat (useRag=true, query)
    Chat->>Embed: Embed Query String
    Embed-->>Chat: 768-dim Query Vector
    Chat->>Qdrant: Filtered Vector Search (appId, tenantId, userId, scoreThreshold)
    Qdrant-->>Chat: Return Top-K Ranked Chunks + Payloads + Scores
    Chat->>Chat: Format Grounded Context Snippets & Extract Verifiable Citations
    Chat->>LLM: Generate Answer with System Prompt & Context
    LLM-->>Chat: Answer Text + Token Usage
    Chat-->>Client: { answer, citations: [{ documentId, source, chunkId, score }], usage, latencyMs }
```

---

## 9. LangChain Architecture

LangChain JS is leveraged for:
- Standardized message abstraction (`HumanMessage`, `AIMessage`, `SystemMessage`).
- Dynamic prompt templates and parameter variable interpolation.
- Chat model bindings with structured output constraints.
- Tool schemas and dynamic structured tools.

---

## 10. LangGraph Architecture

The agent workflow engine uses `@langchain/langgraph` to construct a state machine (`AgentState`):

```mermaid
stateDiagram-v2
    [*] --> Classify: User Query
    Classify --> Retrieve: Needs Knowledge
    Classify --> Reason: Needs Live Tools
    Classify --> Respond: Conversational

    Retrieve --> Reason: Context Appended
    Reason --> ToolCall: Tool Selected
    Reason --> Respond: Ready to Answer

    ToolCall --> Respond: Tool Result Added
    Respond --> Validate: Draft Output
    Validate --> [*]: Final Response
```

**State Nodes:**
- **classify**: Evaluates intent using structured generation to determine if RAG or tools are needed.
- **retrieve**: Executes multi-tenant RAG search.
- **reason**: Evaluates whether external registered tools must be executed.
- **tool_call**: Dynamically executes tools registered in `ToolRegistry`.
- **validate**: Inspects response quality and safety.
- **respond**: Generates the final synthesized answer.

---

## 11. Redis Architecture

Redis is utilized as a centralized high-speed cache and coordination engine:
- **Semantic/Response Cache**: Key schema `ai:response:{applicationId}:{tenantId}:{userId}:{hash}`.
- **Distributed Locks**: Key schema `ai:lock:{resource}` with atomic Lua script release.
- **Queue Broker**: Powers BullMQ queues with reliable acknowledgment.
- **Rate Limiting**: Throttler token bucket tracking.

---

## 12. BullMQ Architecture

BullMQ manages asynchronous workloads across dedicated queues:
1. `rag-ingestion`: Ingests, chunks, embeds, and indexes documents.
2. `embedding`: Processes batch embedding generation.
3. `memory`: Extracts user preferences and attributes asynchronously from conversation turns.
4. `ai-generation`: Handles background or asynchronous AI generation jobs.
5. `cleanup`: Prunes stale vectors, orphan chunks, and expired cache locks.

All jobs feature:
- **Deterministic Job IDs** (`rag:{applicationId}:{tenantId}:{documentId}:v{version}`) to prevent duplicate processing.
- **Exponential Backoff Retries**: 3 attempts with 2s initial delay.

---

## 13. MongoDB Schema

The platform persists documents, chunks, conversations, messages, memories, prompts, and execution logs in MongoDB.

### Collections & Indexes
1. `ai_documents`:
   - `[applicationId, userId, documentId]` (Compound Index)
   - `[applicationId, documentType]` (Compound Index)
   - `[tenantId, applicationId]` (Compound Index)
   - `[documentId, version]` (Compound Index)
2. `ai_chunks`:
   - `chunkId` (Unique Index)
   - `[documentId, documentVersion]` (Compound Index)
   - `[applicationId, tenantId]` (Compound Index)
   - `[tenantId, applicationId, userId]` (Compound Index)
3. `conversations`:
   - `conversationId` (Unique Index)
   - `[tenantId, applicationId, userId]` (Compound Index)
   - `[applicationId, userId]` (Compound Index)
4. `messages`:
   - `messageId` (Unique Index)
   - `[conversationId, createdAt]` (Compound Index)
   - `[tenantId, applicationId, userId]` (Compound Index)
5. `user_memories`:
   - `[tenantId, applicationId, userId, key]` (Unique Compound Index)
   - `[tenantId, applicationId, userId]` (Compound Index)
6. `ai_executions`:
   - `requestId` (Unique Index)
   - `[applicationId, tenantId, createdAt]` (Compound Index)
7. `prompts`:
   - `[applicationId, promptName, version]` (Unique Compound Index)
   - `[applicationId, promptName, isActive]` (Compound Index)

---

## 14. Qdrant Schema

- **Collection Name**: `ai_platform_documents` (configurable via `QDRANT_COLLECTION`).
- **Vector Dimension**: `768` (configurable via `EMBEDDING_DIMENSION`).
- **Distance Metric**: `Cosine`.
- **Payload Keyword Indexes**:
  - `applicationId`
  - `tenantId`
  - `userId`
  - `documentId`
  - `documentVersion`
  - `documentType`
  - `visibility` (`public`, `tenant`, `user`)

---

## 15. Multi-Tenancy & Isolation

The platform enforces multi-tenancy at every layer:
1. **Network & Ingress**: Incoming requests are validated via service-to-service credentials.
2. **RAG Vector Search**: All Qdrant queries apply a boolean filter combining:
   - `applicationId == <currentApp>`
   - `tenantId == <currentTenant>`
   - `visibility IN ['public', 'tenant']` OR `(visibility == 'user' AND userId == <currentUser>)`
3. **Conversations & History**: Scoped strictly by `tenantId`, `applicationId`, and `userId`.
4. **Cache Keys**: Include application, tenant, and user identifiers to prevent cache pollution.

---

## 16. Security

- **Helmet**: Secures HTTP headers.
- **CORS**: Configurable cross-origin resource sharing.
- **Service Authentication**: `ServiceAuthGuard` validates application-specific API keys (`AI_PLATFORM_*_API_KEY` dynamic discovery, plus legacy fallback) using constant-time comparison (`crypto.timingSafeEqual`) over SHA-256 digests.
- **Credential Protection**: Zero credentials in code, logs, or client responses.
- **Sanitized Exception Filter**: Redacts internal stack traces and prompt structures.
- **Rate Limiting**: IP and service key throttling via `@nestjs/throttler`.

---

## 17. Authentication

Client application backends authenticate end-users, then call the AI Platform using the `x-api-key` header (or `Authorization: Bearer <key>`) with their designated application credential.

### Dynamic Service Key Discovery
The platform automatically scans environment variables matching `AI_PLATFORM_<SERVICE>_API_KEY` and maps each key to its corresponding lowercase service identifier (e.g. `AI_PLATFORM_TRAVEL_API_KEY` &rarr; `travel`, `AI_PLATFORM_ARBITRATION_API_KEY` &rarr; `arbitration`). This enables adding new consumer applications dynamically via environment variables without requiring code changes.

### Application Credentials
| Application | Environment Variable | Service Identifier | Role |
|---|---|---|---|
| `ai-travel-planner` | `AI_PLATFORM_TRAVEL_API_KEY` | `travel` | Itinerary generation & travel concierge |
| `ai-movie-matcher` | `AI_PLATFORM_MOVIE_API_KEY` | `movie` | Movie recommendations & semantic search |
| `ai-sports-tracker` | `AI_PLATFORM_SPORTS_API_KEY` | `sports` | Game intelligence & match commentary |
| `ai-study-spot-finder` | `AI_PLATFORM_STUDY_API_KEY` | `study` | Study spot concierge & amenity analysis |
| `ai-hiking-explorer` | `AI_PLATFORM_HIKING_API_KEY` | `hiking` | Trail recommendations & route advice |
| `ai-pipeline-observability` | `AI_PLATFORM_OBSERVABILITY_API_KEY` | `observability` | Workflow trace incident diagnostics |
| `ai-model-regression-detection` | `AI_PLATFORM_MODEL_REGRESSION_API_KEY` | `model-regression` | Model benchmark & regression evaluation |
| `ai-pr-review-platform` | `AI_PLATFORM_PR_REVIEW_API_KEY` | `pr-review` | Automated GitHub PR code review |
| `ai-cost-routing-autopilot` | `AI_PLATFORM_ROUTING_API_KEY` / `AI_PLATFORM_API_KEY` | `routing` | Provider routing & model health check |
| `ai-output-arbitration` | `AI_PLATFORM_ARBITRATION_API_KEY` / `AI_PLATFORM_API_KEY` | `arbitration` | LLM judge output arbitration |
| `ai-rag-quality-ops` | `AI_PLATFORM_RAG_QUALITY_OPS_API_KEY` / `AI_PLATFORM_API_KEY` | `rag-quality-ops` | Vector retrieval quality benchmarking |
| `ai-prompt-experiment-manager` | `AI_PLATFORM_PROMPT_EXPERIMENT_API_KEY` / `AI_PLATFORM_API_KEY` | `prompt-experiment` | Prompt variant evaluation & testing |
| *Dynamic Applications* | `AI_PLATFORM_<NAME>_API_KEY` | `<name>` | Any new consumer application |
| *Legacy Fallback* | `AI_SERVICE_API_KEY` | `legacy-fallback` | Backward-compatible shared credential |

> **Security Notice**: Service API keys must be kept strictly on consumer application backends. They must **never** be shipped to browser clients or checked into source code.

```http
POST /api/v1/ai/chat HTTP/1.1
Host: ai-platform.local
Content-Type: application/json
x-api-key: your-application-specific-key
x-correlation-id: 7f3b610c-967a-4284-95da-78c77eb05943

{
  "applicationId": "ai-travel-planner",
  "tenantId": "tenant-101",
  "userId": "usr-8890",
  "message": "Find boutique hotels in Shibuya under $200"
}
```

---

## 18. API Documentation

Interactive Swagger documentation is available at `/docs`.

### Core Endpoints

| Method | Endpoint | Description | Status Code |
|---|---|---|---|
| `POST` | `/api/v1/ai/chat` | Synchronous AI chat with RAG, Memory, and Cache | `200 OK` |
| `POST` | `/api/v1/ai/chat/stream` | Server-Sent Events (SSE) AI streaming | `200 OK` |
| `POST` | `/api/v1/ai/agents/run` | Execute LangGraph multi-step agent workflow | `200 OK` |
| `POST` | `/api/v1/rag/documents` | Asynchronously ingest document into vector index | `202 Accepted` |
| `DELETE` | `/api/v1/rag/documents/:documentId` | Delete document and vector chunks | `200 OK` |
| `POST` | `/api/v1/rag/query` | Direct vector search with metadata filtering | `200 OK` |
| `POST` | `/api/v1/ai/evaluation/run` | Run automated RAG quality evaluation suite | `200 OK` |
| `GET` | `/health` | Basic service ping | `200 OK` |
| `GET` | `/health/live` | Kubernetes liveness probe | `200 OK` |
| `GET` | `/health/ready` | Readiness probe (MongoDB, Redis, Qdrant) | `200 OK` / `503` |

---

## 19. Local Setup

### Prerequisites
- Node.js `v20+` or `v22+`
- Docker & Docker Compose
- Google Gemini API Key

### Steps
1. Clone the repository and install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
2. Create your environment file:
   ```bash
   cp .env.example .env
   ```
   Add your valid `GEMINI_API_KEY` in `.env`.
3. Start infrastructure (MongoDB, Redis, Qdrant):
   ```bash
   docker compose up -d mongodb redis qdrant
   ```
4. Start the NestJS application in development mode:
   ```bash
   npm run start:dev
   ```
5. Open Swagger UI at `http://localhost:4000/docs`.

---

## 20. Docker Setup

To run the full stack (AI Platform + MongoDB + Redis + Qdrant) inside Docker:

```bash
# 1. Export Gemini API Key
export GEMINI_API_KEY="your-gemini-api-key"

# 2. Build and launch all containers
docker compose up --build -d

# 3. Check health
curl http://localhost:4000/health/ready
```

---

## 21. Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Runtime environment (`development`, `production`, `test`) |
| `PORT` | `4000` | Application HTTP port |
| `API_PREFIX` | `api/v1` | Global API prefix |
| `LOG_LEVEL` | `info` | Pino log level |
| `AI_PLATFORM_<APP>_API_KEY` | (optional) | Application-specific credentials with dynamic discovery (e.g. `AI_PLATFORM_TRAVEL_API_KEY`, `AI_PLATFORM_MOVIE_API_KEY`, `AI_PLATFORM_SPORTS_API_KEY`, `AI_PLATFORM_STUDY_API_KEY`, etc.) |
| `AI_SERVICE_API_KEY` | (optional) | Comma-separated legacy fallback service API keys |
| `MONGODB_URI` | `mongodb://...` | MongoDB connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant REST URL |
| `QDRANT_API_KEY` | (empty) | Qdrant API Key (if cloud-hosted) |
| `QDRANT_COLLECTION` | `ai_platform_documents` | Main Qdrant collection name |
| `GEMINI_API_KEY` | (required) | Google Gemini API Key |
| `GEMINI_MODEL` | `gemini-1.5-flash` | Gemini model name |
| `GEMINI_EMBEDDING_MODEL` | `text-embedding-004` | Gemini embedding model |
| `EMBEDDING_DIMENSION` | `768` | Embedding vector dimension |
| `RAG_CHUNK_SIZE` | `800` | Character chunk size |
| `RAG_CHUNK_OVERLAP` | `150` | Character chunk overlap |
| `RAG_TOP_K` | `5` | Default number of vector chunks to retrieve |
| `RAG_MIN_SCORE` | `0.5` | Minimum cosine similarity threshold |
| `AI_CACHE_ENABLED` | `true` | Enable Redis response caching |
| `AI_CACHE_TTL_SECONDS` | `300` | Redis response cache TTL |
| `THROTTLE_TTL` | `60000` | Throttler time window in ms |
| `THROTTLE_LIMIT` | `120` | Max requests per time window |

---

## 22. Gemini Setup

1. Obtain an API key from Google AI Studio ([https://aistudio.google.com/](https://aistudio.google.com/)).
2. Set `GEMINI_API_KEY` in `.env`.
3. Models can be customized via `GEMINI_MODEL` (e.g. `gemini-1.5-pro` or `gemini-1.5-flash`).

---

## 23. Qdrant Setup

- Default local port: `6333` (HTTP) and `6334` (gRPC).
- On platform startup, `QdrantVectorStoreService` automatically checks and initializes the collection and creates payload keyword indexes for multi-tenant fields.

---

## 24. Redis Setup

- Default local port: `6379`.
- Used concurrently by `ioredis` for AI cache/distributed locks and by `BullMQ` for queue processing.

---

## 25. Testing

### Run Unit Tests
```bash
npm test
```

### Run E2E Integration Tests
```bash
npm run test:e2e
```

### Run Coverage Report
```bash
npm run test:cov
```

---

## 26. CI/CD Pipeline

The `.github/workflows/ci.yml` pipeline runs on every push and pull request:
1. Starts MongoDB, Redis, and Qdrant container services.
2. Installs dependencies (`npm ci --legacy-peer-deps`).
3. Runs linter (`npm run lint`).
4. Executes unit test suite (`npm test`).
5. Executes end-to-end test suite (`npm run test:e2e`).
6. Builds the production bundle (`npm run build`).

---

## 27. Production Deployment

- Run using the multi-stage `Dockerfile`.
- Set `NODE_ENV=production`.
- Configure managed database clusters (MongoDB Atlas, Redis Cloud/ElastiCache, Qdrant Cloud).
- Use container orchestrators (Kubernetes, AWS ECS, GCP Cloud Run) targeting `/health/live` and `/health/ready`.

---

## 28. Performance Considerations

- **SSE Streaming**: Sends tokens with zero buffering for instantaneous time-to-first-token.
- **Batch Embeddings**: Chunks are embedded in batches of 20 to minimize HTTP round-trips.
- **Connection Pooling**: Mongoose and ioredis maintain persistent connection pools.
- **Indexed Payloads**: Qdrant payload filters run on pre-indexed keyword fields.

---

## 29. Caching Strategy

1. **Deterministic Request Hashing**: Sha256 hash of `input + systemPrompt + model + temperature`.
2. **Strict Multi-Tenant Scoping**: User-specific queries are scoped by `userId`, preventing cross-user cache hits.
3. **Selective Cache Bypass**: Sensitive or private endpoints set `cacheable: false`.

---

## 30. Retry Strategy

- **BullMQ Exponential Backoff**: Ingestion jobs automatically retry up to 3 times with exponential backoff on transient network or rate limit errors.
- **Idempotent Ingestion**: Job ID format `rag:{appId}:{tenantId}:{docId}:v{version}` ensures no document version is processed more than once.

---

## 31. Failure Scenarios & Resilience

| Scenario | Behavior |
|---|---|
| Gemini API Rate Limit (429) | Caught by `GeminiLLMProvider`, mapped to HTTP 429; async queues retry with backoff. |
| Redis Unavailable | Caching fails open (requests bypass cache without crashing); locks fail gracefully. |
| Qdrant Unavailable | Chat continues gracefully with empty RAG context; `/health/ready` reports 503. |
| MongoDB Unavailable | Handled with HTTP 500; `/health/ready` reports 503. |

---

## 32. Observability & Telemetry

Every AI execution is recorded in the `ai_executions` collection with:
- `requestId` (correlation ID)
- `applicationId`, `tenantId`, `userId`
- `operation` (`chat`, `agent_run`, `rag_query`)
- `model`
- `latencyMs`
- `tokenUsage` (`promptTokens`, `completionTokens`, `totalTokens`)
- `cacheHit` (boolean)
- `retrievalCount` (number of chunks retrieved)
- `status` (`success`, `cached`, `failure`)

---

## 33. RAG Evaluation Framework

Automated benchmark evaluation endpoint: `POST /api/v1/ai/evaluation/run`.
Evaluates 4 core dimensions on a scale of `0.0` to `1.0`:
1. **Retrieval Relevance**: Relevance of vector chunks to the input question.
2. **Context Relevance**: Sufficiency of context to answer the question.
3. **Answer Relevance**: Faithfulness and accuracy of the generated answer compared to ground truth.
4. **Citation Correctness**: Verification that claims are supported without hallucinations.

---

## 34. Cost Considerations

- **Gemini 1.5 Flash**: Delivers sub-second latency with low per-token cost.
- **Redis Response Caching**: Bypasses duplicate LLM completions for identical request payloads by serving cached responses directly from Redis with configurable TTL.
- **Sliding Window History**: Retains the last 8-10 messages plus a summary, bounding conversation token growth.

---

## 35. Future Improvements

- MongoDB Atlas Vector Search adapter for `VectorStoreFactory`.
- Hybrid search (BM25 + Dense vector embeddings with reciprocal rank fusion).
- Fine-grained semantic reranking (e.g. Cohere or BGE Reranker).
- OpenTelemetry tracing exporters.

---

## License

UNLICENSED. Portfolio Enterprise Platform.
