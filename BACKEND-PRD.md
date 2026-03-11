# AA IRELAND

## Motor Insurance Document Validation

### Backend Service PRD — .NET 8 / C# / Azure

| Version | 4.0  |
| --- | --- |
| **Author** | Fernando Hermida — Senior Software Developer / Solution Architect |
| **Runtime** | .NET 8 LTS  ·  C# 12  ·  ASP.NET Core Minimal API |
| **OCR Provider** | Azure Document Intelligence (AI Services) |
| **LLM** | Azure OpenAI — GPT-4o |
| **Orchestration** | Plain C# orchestration with MediatR |
| **Storage** | Azure Cosmos DB (persistence) + Azure Redis (real-time state) |
| **Resilience** | Polly (retry, circuit breaker, timeout) |
| **Observability** | Application Insights + Serilog |
| **Authentication** | Azure AD B2C / API Key middleware |
| **Date** | March 2026 |

---

## 1. Overview

This document specifies the production-ready backend service for the AA Ireland Motor Insurance Document Validation portal.

This service processes uploaded insurance documents through a resilient, observable, and cost-optimized pipeline: it receives files via authenticated endpoints, runs them through Azure Document Intelligence for OCR, applies pre-LLM guardrails to avoid unnecessary token costs, then uses a **single optimized GPT-4o call** for combined extraction and validation reasoning. The system uses **Azure Cosmos DB for durable audit history** and **Azure Redis for real-time job state and SSE coordination**. Every operation is instrumented, every external call is protected by resilience policies, and every prompt is externalized for rapid iteration without redeployment.

| What the frontend already does  |  |
| --- | --- |
| **Client-side file validation** | MIME type, max 10MB, PDF/JPG/PNG only |
| **Document type selection** | NCB / Gap in Cover / Policy Schedule |
| **SSE consumption** | maps PipelineEvent.State to UploadState visual transitions |
| **OcrResult display** | renders SUCCESS summary card or REJECTED reason in plain English |

---

## 2. System Architecture

### 2.1 Layers

| Layer | Responsibility |
| --- | --- |
| **API Layer** | ASP.NET Core Minimal API — multipart upload endpoint, SSE status stream, result retrieval |
| **Authentication Layer** | API Key middleware or Azure AD B2C token validation; rate limiting per user/key |
| **Application Layer** | MediatR command handler — SubmitDocumentCommand orchestrates the pipeline via IDocumentPipeline |
| **Pipeline Orchestrator** | Plain C# orchestration — coordinates 5 steps: Ingest → Pre-Guardrails → Extract+Validate → Post-Guardrails → Emit |
| **Azure DI Adapter** | Calls Azure Document Intelligence Prebuilt-Read model with Polly resilience; streams file directly |
| **Azure OpenAI Adapter** | Single GPT-4o call via Semantic Kernel; structured output for extraction+validation combined |
| **Pre-LLM Guardrails** | Deterministic checks before LLM call: confidence threshold, document length, basic pattern validation |
| **Post-LLM Guardrails** | Validation after LLM: date plausibility, schema completeness, contradiction detection |
| **Prompt Repository** | Cosmos DB container — stores versioned prompts per document type for A/B testing |
| **Audit Layer** | Immutable per-job AuditTrail written to Cosmos DB — every step's input, output, latency, token usage |
| **Job State Store** | Azure Redis — holds ephemeral job state + SSE channel coordination; TTL auto-cleanup |
| **Job History Store** | Cosmos DB — permanent job records with partition key by userId/date for efficient queries |
| **Observability** | Application Insights for metrics/traces; Serilog for structured logging with correlation IDs |

### 2.2 Storage Architecture

#### 2.2.1 Dual-Storage Strategy

| Store | Technology | Purpose | TTL | Data |
| --- | --- | --- | --- | --- |
| **Real-time State** | Azure Redis | In-progress job state, SSE coordination, progress updates | 1 hour | JobState, progress, current step |
| **Permanent History** | Cosmos DB | Completed jobs, audit trails, analytics | Infinite | JobRecord, AuditTrail, OcrResult |

**Why both?**
- **Redis**: Low-latency reads for SSE streaming, automatic TTL cleanup, pub/sub for distributed SSE
- **Cosmos DB**: Durable audit trail, queryable history, compliance, cost-effective for cold data

#### 2.2.2 Redis Schema

```csharp
// OcrPortal.Infrastructure/Redis/RedisJobStateStore.cs

public sealed class RedisJobStateStore : IJobStateStore
{
    private readonly IConnectionMultiplexer _redis;

    public async Task<string> CreateJobAsync(string userId, DocumentType docType)
    {
        var jobId = Guid.NewGuid().ToString();
        var state = new JobState
        {
            JobId = jobId,
            UserId = userId,
            DocType = docType,
            Status = UploadState.Uploading,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var db = _redis.GetDatabase();
        await db.StringSetAsync(
            $"job:{jobId}",
            JsonSerializer.Serialize(state),
            TimeSpan.FromHours(1)  // Auto-cleanup after 1 hour
        );

        return jobId;
    }

    public async Task UpdateProgressAsync(string jobId, int progress, UploadState status)
    {
        var db = _redis.GetDatabase();
        var key = $"job:{jobId}";

        var json = await db.StringGetAsync(key);
        if (json.IsNullOrEmpty) throw new JobNotFoundException(jobId);

        var state = JsonSerializer.Deserialize<JobState>(json!)!;
        state.Progress = progress;
        state.Status = status;
        state.UpdatedAt = DateTimeOffset.UtcNow;

        await db.StringSetAsync(key, JsonSerializer.Serialize(state), TimeSpan.FromHours(1));

        // Publish to Redis pub/sub for distributed SSE
        await db.PublishAsync($"job:events:{jobId}", JsonSerializer.Serialize(new PipelineEvent
        {
            State = status,
            Progress = progress,
            Timestamp = DateTimeOffset.UtcNow
        }));
    }
}
```

#### 2.2.3 Cosmos DB Schema

**Container: `jobs`**
- Partition Key: `/userId` (enables efficient per-user queries)
- Indexed properties: `status`, `createdAt`, `docType`

```csharp
public sealed record JobRecord
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = Guid.NewGuid().ToString();  // Cosmos requires 'id'

    public string JobId { get; init; } = null!;  // Same as Id, for consistency
    public string UserId { get; init; } = null!;  // Partition key
    public DocumentType DocType { get; init; }
    public UploadState Status { get; init; }
    public OcrResult? Result { get; init; }
    public List<AuditEntry> AuditTrail { get; init; } = [];
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset CompletedAt { get; init; }
    public TimeSpan TotalDuration { get; init; }

    // Indexed for queries
    public bool IsSuccess { get; init; }
    public RejectionReason? RejectionReason { get; init; }
}
```

**Container: `prompts`**
- Partition Key: `/documentType`
- Enables versioning and A/B testing

```csharp
public sealed record PromptTemplate
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = Guid.NewGuid().ToString();

    public DocumentType DocumentType { get; init; }  // Partition key
    public int Version { get; init; }
    public string SystemPrompt { get; init; } = null!;
    public string UserPromptTemplate { get; init; } = null!;  // Contains {documentText} placeholder
    public JsonDocument ResponseSchema { get; init; } = null!;
    public bool IsActive { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public string CreatedBy { get; init; } = null!;
}
```

### 2.3 Request Flow

1. Frontend POSTs multipart/form-data to `POST /api/documents` with Authorization header (API key or JWT)
2. **Authentication middleware** validates credentials; extracts `userId` from token/key
3. **Rate limiter** checks user quota (max 100 jobs/hour per user)
4. API layer creates job in **Redis** (ephemeral state) and returns 202 Accepted with `jobId` + `streamUrl`
5. Frontend opens `GET /api/documents/{jobId}/status` — SSE stream subscribes to Redis pub/sub channel
6. `SubmitDocumentCommand` is dispatched to MediatR; pipeline starts on background Task
7. **Ingest step**: streams `IFormFile` directly to Azure DI (no buffering); emits `UPLOADING` event to Redis
8. **Pre-Guardrails**: checks document length, basic patterns; may short-circuit before LLM call
9. **Azure Document Intelligence step**: Polly-wrapped call to Prebuilt-Read; receives text + confidence; emits `SCANNING {stage:'READING'}`
10. **Confidence check**: if below threshold, rejects immediately (saves LLM tokens)
11. **Prompt Repository**: fetches active prompt template from Cosmos DB for document type
12. **Azure OpenAI single call**: GPT-4o extracts fields AND validates in one call; emits `SCANNING {stage:'VERIFYING'}`
13. **Post-Guardrails**: validates extracted fields for hallucination, logical contradictions
14. **Result persisted**: writes `JobRecord` with full `AuditTrail` to Cosmos DB; removes from Redis after 5 min grace period
15. **SSE stream completes**: Redis pub/sub sends terminal event; channel closed

### 2.4 Pipeline Orchestration Alternatives

The v4.0 architecture uses plain C# orchestration with MediatR for simplicity and rapid delivery. However, as the system evolves, alternative patterns may provide benefits.

#### 2.4.1 Current Approach Enhancements (Quick Wins)

**Fluent Pipeline Builder Pattern**

Wrap each pipeline step with automatic audit logging, centralized error handling, and progress updates with minimal refactoring (2-3 days effort).

```csharp
var pipeline = new PipelineBuilder()
    .AddStep("Ingest", IngestStepAsync)
    .AddStep("PreGuardrails", PreGuardrailsStepAsync)
    .AddStep("AzureOcr", AzureOcrStepAsync)
    .AddStep("GptAnalysis", GptAnalysisStepAsync);

return await pipeline.ExecuteAsync(context);
```

**Step Middleware Pattern**

Compose reusable cross-cutting concerns (retry, audit, progress tracking) as middleware layers around each step.

Benefits:
- ✅ Zero infrastructure cost
- ✅ Low complexity increase
- ✅ Improved maintainability
- ✅ Easy to unit test

#### 2.4.2 Future Alternative: Azure Durable Functions

For high-volume scenarios (100K+ documents/month) or when human-in-the-loop approval is needed, consider migrating to **Durable Task Framework**.

**Key Advantages:**
- **Checkpointing**: Resume from failed step without re-running expensive operations (e.g., skip OCR retry if it succeeded)
- **Human approval**: Built-in support for external events (wait for manual review)
- **Automatic retries**: Framework handles retry logic per activity
- **State persistence**: Survives server crashes/restarts

**When to Consider:**
- Volume exceeds 100K documents/month
- Implementing human-in-the-loop review (PRD Section 17.3)
- Need guaranteed completion for compliance requirements

**Migration Effort:** ~5-7 days to wrap existing steps as Durable Activities

**Cost Impact:** $0 (uses existing Azure Storage or Cosmos DB for state)

**Comparison Matrix:**

| Approach | Complexity | Best For | Migration Effort | Cost |
|----------|-----------|----------|------------------|------|
| **Plain C# (Current)** | Low | Simple linear pipelines | N/A | $0 |
| **Fluent Builder** | Low | Better maintainability | 2-3 days | $0 |
| **Durable Functions** | Medium | Checkpointing, human approval | 5-7 days | $0 |

**Recommendation:**
- **v4.0**: Implement Fluent Builder pattern for improved maintainability
- **v5.0+**: Evaluate Durable Functions when volume or approval requirements emerge

---

## 3. Azure Document Intelligence Integration

### 3.1 Model Selection

The service uses the **Prebuilt-Read model** (`prebuilt-read`) from Azure Document Intelligence. This model performs OCR on PDF, JPG, and PNG files — extracting text content with layout information without requiring a custom trained model. This is the correct choice for insurance letters, which are unstructured prose documents rather than forms.

| Model | Use Case | Why Not for This Service |
| --- | --- | --- |
| **prebuilt/read** | General OCR — text + layout extraction from any document | N/A — this is what we use |
| **prebuilt/layout** | Tables, selection marks, structured layout analysis | Overkill — insurance letters are prose |
| **prebuilt/document** | Key-value pairs, entities from general documents | Less accurate than read + GPT-4o for our field types |
| **Custom model** | Domain-specific form extraction | Requires labelled training data — not available yet |

### 3.2 Azure DI Adapter Contract

```csharp
// OcrPortal.Infrastructure/AzureDocumentIntelligence/AzureDocumentIntelligenceAdapter.cs

public interface IDocumentIntelligenceAdapter
{
    Task<DocumentContent> AnalyzeAsync(Stream fileStream, string contentType, CancellationToken ct);
}

public sealed record DocumentContent(
    string RawText,                    // full concatenated text from all pages
    IReadOnlyList<string> Paragraphs,  // paragraph-level segments
    double AverageConfidence,          // avg word confidence from DI response
    int PageCount,
    int WordCount
);
```

### 3.3 Adapter Implementation with Polly Resilience

```csharp
public sealed class AzureDocumentIntelligenceAdapter : IDocumentIntelligenceAdapter
{
    private readonly DocumentIntelligenceClient _client;
    private readonly IAsyncPolicy<AnalyzeResult> _resiliencePolicy;
    private readonly ILogger<AzureDocumentIntelligenceAdapter> _logger;

    public AzureDocumentIntelligenceAdapter(
        DocumentIntelligenceClient client,
        ILogger<AzureDocumentIntelligenceAdapter> logger)
    {
        _client = client;
        _logger = logger;

        // Polly resilience: retry + circuit breaker + timeout
        _resiliencePolicy = Policy<AnalyzeResult>
            .Handle<RequestFailedException>(ex => ex.Status == 429 || ex.Status >= 500)
            .WaitAndRetryAsync(
                retryCount: 3,
                sleepDurationProvider: attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)),
                onRetry: (outcome, timespan, retryCount, context) =>
                {
                    _logger.LogWarning("Azure DI retry {RetryCount} after {Delay}s: {Error}",
                        retryCount, timespan.TotalSeconds, outcome.Exception?.Message);
                })
            .WrapAsync(Policy<AnalyzeResult>
                .Handle<RequestFailedException>()
                .CircuitBreakerAsync(
                    handledEventsAllowedBeforeBreaking: 5,
                    durationOfBreak: TimeSpan.FromMinutes(1),
                    onBreak: (outcome, duration) =>
                    {
                        _logger.LogError("Azure DI circuit breaker OPEN for {Duration}s",
                            duration.TotalSeconds);
                    },
                    onReset: () => _logger.LogInformation("Azure DI circuit breaker RESET")))
            .WrapAsync(Policy.TimeoutAsync<AnalyzeResult>(
                TimeSpan.FromSeconds(30),
                onTimeoutAsync: async (context, timespan, task) =>
                {
                    _logger.LogError("Azure DI timeout after {Timeout}s", timespan.TotalSeconds);
                }));
    }

    public async Task<DocumentContent> AnalyzeAsync(Stream fileStream, string contentType, CancellationToken ct)
    {
        // Stream directly - no buffering to MemoryStream
        var content = new AnalyzeDocumentContent { Base64Source = BinaryData.FromStream(fileStream) };

        var result = await _resiliencePolicy.ExecuteAsync(async () =>
        {
            var operation = await _client.AnalyzeDocumentAsync(
                WaitUntil.Completed, "prebuilt-read", content, cancellationToken: ct);
            return operation.Value;
        });

        var paragraphs = result.Paragraphs?.Select(p => p.Content).ToList() ?? [];
        var words = result.Pages.SelectMany(pg => pg.Words).ToList();
        var avgConfidence = words.Any() ? words.Average(w => w.Confidence) : 0.0;

        return new DocumentContent(
            RawText: string.Join("\n", paragraphs),
            Paragraphs: paragraphs,
            AverageConfidence: avgConfidence,
            PageCount: result.Pages.Count,
            WordCount: words.Count
        );
    }
}
```

### 3.4 Pre-LLM Confidence Guard

If `AverageConfidence` falls below the configured threshold (default 0.6), the pipeline short-circuits **before calling GPT-4o** and returns a REJECTED result with reason `ILLEGIBLE_DOCUMENT`. This avoids wasting tokens on garbage text.

> **Configuration key**: `DocumentIntelligence:MinConfidenceThreshold` (default 0.6)
> Values below this trigger immediate rejection. Saves ~$0.02 per rejected document.

---

## 4. Azure OpenAI Integration — Single Optimized LLM Call

### 4.1 Architectural Decision: Combined Extraction + Validation

Single GPT-4o call with structured reasoning

**Rationale:**
- **50% cost reduction**: 1 LLM call instead of 2
- **50% latency reduction**: Single round-trip (~2-4s instead of 4-8s)
- **Modern GPT-4o capability**: Handles multi-step reasoning in a single prompt with proper structure
- **Structured output**: JSON schema enforces typed response with both extracted fields and validation verdict

### 4.2 Kernel Setup with Polly Resilience

```csharp
// OcrPortal.Api/Program.cs

builder.Services.AddSingleton(sp => {
    var opts = sp.GetRequiredService<IOptions<AzureOpenAiOptions>>().Value;

    // Polly for Azure OpenAI
    var resiliencePolicy = Policy
        .Handle<HttpRequestException>()
        .Or<TaskCanceledException>()
        .WaitAndRetryAsync(3, attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)));

    return Kernel.CreateBuilder()
        .AddAzureOpenAIChatCompletion(
            deploymentName: opts.DeploymentName,   // "gpt-4o"
            endpoint: opts.Endpoint,
            credentials: new DefaultAzureCredential(),
            serviceId: "gpt-4o")
        .Build();
});
```

### 4.3 Prompt Repository Interface

Prompts are stored in Cosmos DB for versioning and A/B testing without redeployment.

```csharp
// OcrPortal.Application/Prompts/IPromptRepository.cs

public interface IPromptRepository
{
    Task<PromptTemplate> GetActivePromptAsync(DocumentType docType, CancellationToken ct);
    Task<PromptTemplate> GetPromptByVersionAsync(DocumentType docType, int version, CancellationToken ct);
    Task<string> CreatePromptVersionAsync(PromptTemplate template, CancellationToken ct);
}
```

### 4.4 Combined Extraction + Validation Plugin

```csharp
// OcrPortal.Infrastructure/SemanticKernel/Plugins/DocumentAnalysisPlugin.cs

[KernelFunction]
[Description("Extract and validate fields from insurance document in a single call")]
public async Task<DocumentAnalysisResult> AnalyzeAsync(
    Kernel kernel,
    [Description("Raw text from Azure Document Intelligence")] string documentText,
    [Description("Document type being analyzed")] DocumentType docType,
    [Description("Today's date for validation")] DateOnly today)
{
    // Fetch prompt from Cosmos DB
    var promptTemplate = await _promptRepo.GetActivePromptAsync(docType, CancellationToken.None);

    var userPrompt = promptTemplate.UserPromptTemplate
        .Replace("{documentText}", documentText)
        .Replace("{today}", today.ToString("yyyy-MM-dd"));

    var chatHistory = new ChatHistory();
    chatHistory.AddSystemMessage(promptTemplate.SystemPrompt);
    chatHistory.AddUserMessage(userPrompt);

    var executionSettings = new PromptExecutionSettings
    {
        ResponseFormat = typeof(DocumentAnalysisResult),  // Enforces JSON schema
        Temperature = 0.1,  // Low temperature for consistency
        MaxTokens = 1500
    };

    var result = await kernel.GetRequiredService<IChatCompletionService>()
        .GetChatMessageContentAsync(chatHistory, executionSettings);

    return JsonSerializer.Deserialize<DocumentAnalysisResult>(result.Content)
        ?? throw new OcrExtractionException(docType, "Failed to deserialize LLM response");
}

// Response schema enforced by GPT-4o structured output
public sealed record DocumentAnalysisResult(
    // Extracted fields (varies by document type)
    IReadOnlyDictionary<string, JsonElement> ExtractedFields,

    // Validation verdict
    bool Accepted,
    string? RejectionReason,  // null if Accepted

    // Reasoning trace for audit
    string ReasoningSteps
);
```

### 4.5 Example Prompt Template (NCB Letter)

Stored in Cosmos DB `prompts` container:

```json
{
  "id": "ncb-v2-20260310",
  "documentType": "NCB",
  "version": 2,
  "isActive": true,
  "systemPrompt": "You are an expert insurance document analyst for AA Ireland. Your task is to extract structured data from No Claims Bonus letters AND validate the extracted data against underwriting rules in a single analysis.\n\nRules to validate:\n1. YearsNoClaims must be between 1 and 20\n2. PolicyEndDate must be within the last 2 years from today\n3. PreviousInsurer must not be empty or a placeholder\n4. PolicyEndDate must not be in the future\n5. CustomerName should match expected patterns\n\nThink step-by-step:\n1. Extract the required fields\n2. Validate each field against the rules\n3. Provide reasoning for your verdict\n4. Return structured JSON",
  "userPromptTemplate": "Today's date: {today}\n\nDocument text:\n{documentText}\n\nExtract the following fields and validate:\n- YearsNoClaims (integer)\n- PreviousInsurer (string)\n- PolicyEndDate (ISO 8601 date)\n- CustomerName (string)\n\nReturn JSON matching this schema:\n{\n  \"extractedFields\": { \"yearsNoClaims\": 5, \"previousInsurer\": \"Liberty Insurance\", \"policyEndDate\": \"2024-12-31\", \"customerName\": \"John Doe\" },\n  \"accepted\": true,\n  \"rejectionReason\": null,\n  \"reasoningSteps\": \"1. Extracted years: 5 (valid range)\\n2. Insurer: Liberty Insurance (valid)\\n3. End date: 2024-12-31 (within 2 years)\\n4. All fields present and valid\"\n}",
  "responseSchema": { /* JSON schema object */ },
  "createdAt": "2026-03-10T10:00:00Z",
  "createdBy": "fernando.hermida"
}
```

---

## 5. Pipeline Steps in Detail

### 5.1 Step 1 — Document Ingestion

- Receives `IFormFile` from multipart/form-data
- **No buffering**: streams directly to Azure DI (memory efficient)
- Validates MIME type via `MimeDetective` (reads magic bytes)
- Enforces max file size: 10MB
- Emits `PipelineEvent { State = Uploading, Progress = 100 }` to Redis pub/sub

### 5.2 Step 2 — Pre-LLM Guardrails (Cost Optimization)

Runs **before** Azure DI and LLM calls to short-circuit invalid documents early.

| Pre-Guardrail Check | Rejection Reason | Savings |
| --- | --- | --- |
| **File size < 100 bytes** | `UNSUPPORTED_FORMAT` | Skips Azure DI + LLM |
| **File size > 10MB** | `UNSUPPORTED_FORMAT` | Already handled by client, backup check |
| **MIME type not in allowlist** | `UNSUPPORTED_FORMAT` | Skips Azure DI + LLM |

Expected savings: ~5% of submissions rejected before any Azure costs incurred.

### 5.3 Step 3 — Azure Document Intelligence

- Calls `IDocumentIntelligenceAdapter.AnalyzeAsync()` with Polly resilience
- **Confidence check**: if `AverageConfidence < 0.6`, rejects with `ILLEGIBLE_DOCUMENT` (skips LLM)
- **Word count check**: if `WordCount < 50`, likely not a valid letter, rejects with `UNSUPPORTED_FORMAT`
- Emits `PipelineEvent { State = Scanning, Stage = "READING", Progress = 50 }` to Redis
- Records step duration and DI response metadata in `AuditEntry`

Expected savings: ~15% of submissions rejected after DI but before LLM.

### 5.4 Step 4 — GPT-4o Combined Extraction + Validation

- Fetches active `PromptTemplate` from Cosmos DB for document type
- Invokes single GPT-4o call via Semantic Kernel
- Receives `DocumentAnalysisResult` with extracted fields + validation verdict
- Emits `PipelineEvent { State = Scanning, Stage = "VERIFYING", Progress = 80 }` to Redis
- Records token usage (prompt + completion tokens) in `AuditEntry`

### 5.5 Step 5 — Post-LLM Guardrails (Hallucination Detection)

Guardrails run **after** the LLM verdict as a safety net. They catch cases where GPT-4o may have hallucinated or made logical errors.

| Post-Guardrail Check | Triggers REJECTED with reason | Overrides LLM? |
| --- | --- | --- |
| **FutureDateGuard** | Any extracted date is in the future | Yes — `FUTURE_DATE` |
| **RequiredFieldsGuard** | Null fields on non-optional schema properties | Yes — `MISSING_FIELDS` |
| **DateRangeGuard** | `PolicyEndDate` older than 2 years | Yes — `EXPIRED_DOCUMENT` |
| **NcbRangeGuard** | `YearsNoClaims < 1` or `> 20` | Yes — `INVALID_NCB_RANGE` |
| **GapDurationGuard** | Gap Cover: `gapEnd < gapStart`, or computed `gapDays` mismatch | Yes — `DATE_MISMATCH` |
| **InsurerNameGuard** | `PreviousInsurer` is whitespace, "N/A", or generic placeholder | Yes — `MISSING_FIELDS` |

**Override strategy**: If any post-guardrail fails, the LLM's `Accepted: true` is overridden to `REJECTED`.

### 5.6 Step 6 — Result Persistence & Emission

- Builds final `OcrResult`: status, docType, reason, extractedData, reasoningTrace
- Writes `JobRecord` with full `AuditTrail` to **Cosmos DB** (permanent storage)
- Emits terminal `PipelineEvent` to Redis pub/sub
- Schedules Redis key deletion after 5-minute grace period (allows clients to reconnect)
- SSE stream completes; channel closed

---

## 6. API Specification

### 6.1 Endpoints

| Method | Route | Description | Auth Required |
| --- | --- | --- | --- |
| POST | `/api/documents` | Submit document. Returns 202 + jobId immediately. | Yes |
| GET | `/api/documents/{jobId}/status` | SSE stream. Emits PipelineEvent until terminal state. | Yes |
| GET | `/api/documents/{jobId}` | Fetch completed JobRecord including OcrResult + full AuditTrail. | Yes |
| GET | `/api/documents` | List user's jobs with pagination and filters. | Yes |
| DELETE | `/api/documents/{jobId}` | Cancel in-progress job. Propagates CancellationToken. | Yes |
| GET | `/api/health` | Health check: service version, Azure DI/OpenAI reachability, Redis/Cosmos status. | No |
| GET | `/api/metrics` | Prometheus-compatible metrics endpoint. | No (internal only) |

### 6.2 Authentication

Two supported modes (configurable):

**Mode 1: API Key (Simple)**
```http
POST /api/documents
X-API-Key: aa-ireland-portal-{userId}-{secret}
```

**Mode 2: Azure AD B2C (Production)**
```http
POST /api/documents
Authorization: Bearer {jwt-token}
```

UserId is extracted from API key prefix or JWT `sub` claim.

### 6.3 POST /api/documents

**Request**: `multipart/form-data`

- `file`: `IFormFile` (PDF | JPG | PNG, ≤ 10MB)
- `docType`: `string` ('NCB' | 'GAP_COVER' | 'POLICY_SCHEDULE')

**Headers**:
- `Authorization: Bearer {token}` OR `X-API-Key: {key}`

**202 Accepted**

```json
{
  "jobId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "QUEUED",
  "streamUrl": "/api/documents/3fa85f64-5717-4562-b3fc-2c963f66afa6/status",
  "createdAt": "2026-03-10T14:22:00Z"
}
```

**429 Too Many Requests** (rate limit exceeded)

```json
{
  "error": "RateLimitExceeded",
  "message": "Maximum 100 jobs per hour exceeded",
  "retryAfter": 1234
}
```

### 6.4 GET /api/documents/{jobId}/status (SSE)

**Response**: `text/event-stream`

```
event: progress
data: {"state":"UPLOADING","timestamp":"2026-03-10T14:22:01Z","progress":100}

event: progress
data: {"state":"SCANNING","stage":"READING","timestamp":"2026-03-10T14:22:03Z","progress":50}

event: progress
data: {"state":"SCANNING","stage":"VERIFYING","timestamp":"2026-03-10T14:22:05Z","progress":80}

event: complete
data: {"state":"SUCCESS","timestamp":"2026-03-10T14:22:06Z","progress":100,"result":{...}}
```

### 6.5 GET /api/documents/{jobId}

**200 OK**

```json
{
  "jobId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "userId": "user-123",
  "docType": "NCB",
  "status": "SUCCESS",
  "result": {
    "status": "Verified",
    "docType": "NCB",
    "extractedData": {
      "yearsNoClaims": 5,
      "previousInsurer": "Liberty Insurance",
      "policyEndDate": "2024-12-31",
      "customerName": "John Doe"
    },
    "reasoningTrace": "1. Extracted years: 5 (valid range)..."
  },
  "auditTrail": [
    {
      "stepName": "AzureDocumentIntelligence",
      "startedAt": "2026-03-10T14:22:02Z",
      "duration": "PT1.234S",
      "promptTokens": null,
      "completionTokens": null
    },
    {
      "stepName": "GPT4oAnalysis",
      "startedAt": "2026-03-10T14:22:04Z",
      "duration": "PT2.456S",
      "promptTokens": 1250,
      "completionTokens": 320
    }
  ],
  "createdAt": "2026-03-10T14:22:00Z",
  "completedAt": "2026-03-10T14:22:06Z",
  "totalDuration": "PT6.123S"
}
```

### 6.6 GET /api/documents (List Jobs)

**Query Parameters**:
- `page` (default: 1)
- `pageSize` (default: 20, max: 100)
- `status` (optional: SUCCESS | REJECTED | ERROR)
- `docType` (optional: NCB | GAP_COVER | POLICY_SCHEDULE)
- `fromDate` (optional: ISO 8601)
- `toDate` (optional: ISO 8601)

**200 OK**

```json
{
  "jobs": [
    {
      "jobId": "3fa85f64...",
      "docType": "NCB",
      "status": "SUCCESS",
      "createdAt": "2026-03-10T14:22:00Z",
      "completedAt": "2026-03-10T14:22:06Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 45,
    "totalPages": 3
  }
}
```

---

## 7. Domain Model & C# Types

### 7.1 Core Types

```csharp
public enum DocumentType { NCB, GapCover, PolicySchedule }
public enum UploadState  { Uploading, Scanning, Success, Rejected, Error }
public enum OcrStatus    { Verified, Rejected }

public enum RejectionReason {
    IllegalDocument,   // DI confidence below threshold
    DateMismatch,      // Gap cover dates don't align
    UnsupportedFormat, // File type invalid or DI couldn't parse
    ExpiredDocument,   // PolicyEndDate older than max age
    MissingFields,     // Required fields null after extraction
    InvalidNcbRange,   // YearsNoClaims outside 1–20
    FutureDate,        // Extracted date is in the future
    ExtractionFailed,  // GPT-4o returned unparseable response
    RateLimitExceeded, // User exceeded quota
    ServiceUnavailable // Azure services unavailable (circuit breaker open)
}

public sealed record OcrResult(
    OcrStatus Status,
    DocumentType DocType,
    RejectionReason? RejectionReason,
    IReadOnlyDictionary<string, JsonElement>? ExtractedData,
    string? ReasoningTrace
);
```

### 7.2 Audit Trail

```csharp
public sealed record AuditEntry(
    string StepName,
    DateTimeOffset StartedAt,
    TimeSpan Duration,
    string? InputSummary,      // Summarized to avoid bloating Cosmos
    string? OutputSummary,     // Summarized
    int? PromptTokens,
    int? CompletionTokens,
    decimal? EstimatedCost,    // Calculated from token usage
    string? ErrorMessage,
    string? CorrelationId      // For distributed tracing
);

public sealed record JobRecord
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = Guid.NewGuid().ToString();

    public string JobId { get; init; } = null!;
    public string UserId { get; init; } = null!;  // Partition key
    public DocumentType DocType { get; init; }
    public UploadState Status { get; init; }
    public OcrResult? Result { get; init; }
    public List<AuditEntry> AuditTrail { get; init; } = [];
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset CompletedAt { get; init; }
    public TimeSpan TotalDuration { get; init; }

    // Indexed for analytics queries
    public bool IsSuccess { get; init; }
    public RejectionReason? RejectionReason { get; init; }
    public int TotalPromptTokens { get; init; }
    public int TotalCompletionTokens { get; init; }
    public decimal TotalCost { get; init; }
}
```

---

## 8. Configuration

### 8.1 appsettings.json Structure

```json
{
  "AzureDocumentIntelligence": {
    "Endpoint": "https://<your-resource>.cognitiveservices.azure.com/",
    "MinConfidenceThreshold": 0.6,
    "TimeoutSeconds": 30
  },
  "AzureOpenAi": {
    "Endpoint": "https://<your-resource>.openai.azure.com/",
    "DeploymentName": "gpt-4o",
    "MaxTokens": 1500,
    "Temperature": 0.1
  },
  "CosmosDb": {
    "Endpoint": "https://<your-account>.documents.azure.com:443/",
    "DatabaseName": "OcrPortal",
    "JobsContainerName": "jobs",
    "PromptsContainerName": "prompts"
  },
  "Redis": {
    "ConnectionString": "<your-redis>.redis.cache.windows.net:6380,password=<key>,ssl=True",
    "JobStateTtlMinutes": 60,
    "GracePeriodMinutes": 5
  },
  "Authentication": {
    "Mode": "AzureAdB2C",  // or "ApiKey"
    "AzureAdB2C": {
      "Instance": "https://<tenant>.b2clogin.com/",
      "Domain": "<tenant>.onmicrosoft.com",
      "ClientId": "<client-id>",
      "SignUpSignInPolicyId": "B2C_1_signup_signin"
    },
    "ApiKey": {
      "HeaderName": "X-API-Key",
      "ValidKeys": ["aa-ireland-portal-user1-secret123"]
    }
  },
  "RateLimiting": {
    "MaxJobsPerHour": 100,
    "MaxConcurrentJobs": 5
  },
  "OcrPipeline": {
    "MaxFileSizeBytes": 10485760,
    "MinFileSizeBytes": 100,
    "AllowedMimeTypes": [ "application/pdf", "image/jpeg", "image/png" ],
    "MinWordCountThreshold": 50,
    "NcbMaxAgeYears": 2,
    "GapCoverMaxAgeYears": 2,
    "PolicyScheduleMaxAgeYears": 2
  },
  "ApplicationInsights": {
    "ConnectionString": "InstrumentationKey=<key>;..."
  },
  "Serilog": {
    "MinimumLevel": "Information",
    "WriteTo": [
      { "Name": "Console" },
      { "Name": "ApplicationInsights" }
    ]
  }
}
```

### 8.2 Credentials — No Secrets in Config

All Azure services authenticate via `DefaultAzureCredential`:
- **Local dev**: Resolves to Azure CLI login (`az login`)
- **Production**: Resolves to Managed Identity (App Service or AKS)

Cosmos DB and Redis connection strings use Managed Identity where supported; otherwise, connection strings are stored in Azure Key Vault and referenced via Key Vault references in App Service configuration.

---

## 9. Solution Structure

| Path | Contents |
| --- | --- |
| **OcrPortal.Api/** | Program.cs, Endpoints/, Middleware/AuthenticationMiddleware.cs, Middleware/RateLimitingMiddleware.cs |
| **OcrPortal.Application/** | Commands/SubmitDocumentCommand.cs, IDocumentPipeline.cs, Prompts/IPromptRepository.cs |
| **OcrPortal.Domain/** | Enums/, Records/OcrResult.cs, Exceptions/ |
| **OcrPortal.Infrastructure/** | DI registration, AzureDocumentIntelligence/, SemanticKernel/, Cosmos/, Redis/, Resilience/PollyPolicies.cs |
| **OcrPortal.Infrastructure.Observability/** | ApplicationInsightsSetup.cs, SerilogConfiguration.cs, MetricsCollector.cs |
| **OcrPortal.Tests.Unit/** | Adapter mocks, pipeline unit tests, guardrail tests |
| **OcrPortal.Tests.Integration/** | Real Azure calls with test credentials |

---

## 10. Technology Stack

| Category | Package | Version | Notes |
| --- | --- | --- | --- |
| **Runtime** | .NET 8 LTS | 8.0 | C# 12 features |
| **API Framework** | ASP.NET Core Minimal API | 8.0 | Lightweight, high-perf |
| **Orchestration** | MediatR | 12.x | CQRS command dispatch |
| **OCR** | Azure.AI.DocumentIntelligence | 1.0.0 | Official Azure SDK |
| **LLM** | Microsoft.SemanticKernel | 1.x | GPT-4o via Azure OpenAI connector |
| **Storage (Hot)** | StackExchange.Redis | 2.x | Real-time job state, SSE coordination |
| **Storage (Cold)** | Microsoft.Azure.Cosmos | 3.x | Permanent job history, prompts |
| **Resilience** | Polly | 8.x | Retry, circuit breaker, timeout policies |
| **Auth** | Microsoft.Identity.Web | 2.x | Azure AD B2C JWT validation |
| **Observability** | Azure.Monitor.OpenTelemetry | 1.x | Application Insights integration |
| **Logging** | Serilog.AspNetCore | 8.x | Structured logging with sinks |
| **File MIME** | MimeDetective | 1.x | Magic byte sniffing |
| **Validation** | FluentValidation | 11.x | Request validation |

---

## 11. Resilience & Error Handling

### 11.1 Polly Policies

All external service calls are wrapped in Polly policies.

**Azure Document Intelligence Policy:**
```csharp
Policy<AnalyzeResult>
    .Handle<RequestFailedException>(ex => ex.Status == 429 || ex.Status >= 500)
    .WaitAndRetryAsync(3, attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)))
    .WrapAsync(CircuitBreakerAsync(5, TimeSpan.FromMinutes(1)))
    .WrapAsync(TimeoutAsync(TimeSpan.FromSeconds(30)))
```

**Azure OpenAI Policy:**
```csharp
Policy<ChatMessageContent>
    .Handle<HttpRequestException>()
    .Or<TaskCanceledException>()
    .WaitAndRetryAsync(3, attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)))
    .WrapAsync(CircuitBreakerAsync(5, TimeSpan.FromMinutes(1)))
    .WrapAsync(TimeoutAsync(TimeSpan.FromSeconds(20)))
```

**Cosmos DB Policy:**
```csharp
Policy<ItemResponse<JobRecord>>
    .Handle<CosmosException>(ex => ex.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
    .WaitAndRetryAsync(3, attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)))
```

### 11.2 Circuit Breaker Behavior

When a circuit breaker opens:
- New jobs are rejected with `503 Service Unavailable` and `RejectionReason.ServiceUnavailable`
- Health check endpoint returns `Degraded` status
- Application Insights alert triggers for on-call engineer

### 11.3 Graceful Degradation

If Redis is unavailable:
- SSE falls back to polling mode (client polls `GET /api/documents/{jobId}` every 2 seconds)
- Job state stored only in Cosmos DB
- Performance degraded but service remains operational

---

## 12. Observability & Monitoring

### 12.1 Application Insights Metrics

**Custom metrics tracked:**
- `ocr.jobs.submitted` (counter)
- `ocr.jobs.completed` (counter, labeled by status: success/rejected/error)
- `ocr.pipeline.duration` (histogram, labeled by document type)
- `ocr.tokens.used` (counter, labeled by type: prompt/completion)
- `ocr.cost.estimated` (counter, USD)
- `ocr.guardrails.triggered` (counter, labeled by guardrail type)
- `ocr.llm.latency` (histogram)
- `ocr.di.latency` (histogram)
- `ocr.di.confidence` (histogram)

**Dependency tracking:**
- Azure Document Intelligence calls (success rate, latency, throttling)
- Azure OpenAI calls (success rate, latency, token usage)
- Cosmos DB operations (RU consumption, latency)
- Redis operations (latency, connection failures)

### 12.2 Structured Logging (Serilog)

Every log entry includes:
- `CorrelationId` (tracks request across services)
- `JobId`
- `UserId`
- `DocumentType`
- `StepName`

**Example log entry:**
```json
{
  "@t": "2026-03-10T14:22:05.123Z",
  "@m": "GPT-4o analysis completed",
  "@l": "Information",
  "CorrelationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "JobId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "UserId": "user-123",
  "DocumentType": "NCB",
  "StepName": "GPT4oAnalysis",
  "PromptTokens": 1250,
  "CompletionTokens": 320,
  "LatencyMs": 2456,
  "Accepted": true
}
```

### 12.3 Distributed Tracing

Application Insights distributed tracing tracks:
- API request → MediatR command → Pipeline steps → Azure service calls
- Correlation IDs propagated across all operations
- End-to-end latency breakdown visible in Application Insights Application Map

### 12.4 Health Check Endpoint

`GET /api/health` returns:

```json
{
  "status": "Healthy",
  "version": "4.0.0",
  "timestamp": "2026-03-10T14:22:00Z",
  "dependencies": {
    "azureDocumentIntelligence": "Healthy",
    "azureOpenAI": "Healthy",
    "cosmosDb": "Healthy",
    "redis": "Healthy"
  },
  "circuitBreakers": {
    "azureDocumentIntelligence": "Closed",
    "azureOpenAI": "Closed"
  }
}
```

Status values: `Healthy` | `Degraded` | `Unhealthy`

---

## 13. Testing Strategy

### 13.1 Unit Tests

All Azure dependencies are hidden behind interfaces:
- `IDocumentIntelligenceAdapter` → returns canned `DocumentContent`
- `IChatCompletionService` → returns pre-built JSON matching schema
- `IPromptRepository` → returns test prompts
- `IJobStateStore` → in-memory dictionary mock
- `IJobHistoryRepository` → in-memory list mock


### 13.2 Integration Tests — Real Azure Calls

Requires Azure subscription with:
- Azure Document Intelligence instance (Free tier sufficient)
- Azure OpenAI instance with GPT-4o deployment
- Cosmos DB account (emulator supported for local testing)
- Redis instance (local Redis or Azure Cache)

**Integration test scenarios:**
- Submit real scanned PDF → assert terminal SUCCESS or REJECTED
- Submit blurred image → assert `ILLEGIBLE_DOCUMENT`
- Submit document with future date → assert guardrail catches it
- Test circuit breaker: kill Azure DI → assert 503 after threshold

### 13.3 Load Testing

Simulated load test with 1000 concurrent users:
- Expected throughput: 500 jobs/minute (sustained)
- P95 latency: < 10 seconds (end-to-end)
- Redis hot state ensures no Cosmos throttling
- Horizontal scaling: add App Service instances behind load balancer

---

## 15. Deployment Architecture

### 15.1 Azure Resources

```
Resource Group: rg-aa-ocr-portal-prod
├── App Service Plan (P1v3, 2 instances, auto-scale 2-5)
├── App Service (API)
├── Azure Document Intelligence (S0 tier)
├── Azure OpenAI (GPT-4o deployment, 50K TPM quota)
├── Cosmos DB (autoscale, max 4000 RU/s)
│   ├── Database: OcrPortal
│   │   ├── Container: jobs (partitioned by /userId)
│   │   └── Container: prompts (partitioned by /documentType)
├── Azure Cache for Redis (Standard C1, 1 GB)
├── Application Insights
├── Azure Key Vault (connection strings, secrets)
└── Managed Identity (assigned to App Service)
```

---

## 16. Security Considerations

### 16.1 Authentication & Authorization

- API Key: HMAC-signed keys with userId prefix
- Azure AD B2C: JWT validation with required scopes
- Rate limiting: 100 jobs/hour per user, 5 concurrent jobs
- CORS: Whitelist frontend domain only

### 16.2 Data Privacy

- No PII stored in Redis (ephemeral state only)
- Cosmos DB JobRecords include extracted fields (PII) — encrypted at rest
- Audit trail sanitized: no raw document text, only summaries
- GDPR compliance: Users can request deletion via `DELETE /api/users/{userId}/data`

### 16.3 Input Validation

- MIME type verified via magic bytes (not file extension)
- File size limits enforced at API gateway + middleware
- Document type enum validated
- Anti-SSRF: No user-provided URLs accepted

---

## 17. Future Enhancements

### 17.1 Custom Azure DI Model

Once 500+ labelled documents collected:
- Train custom Document Intelligence model for each document type
- Expected accuracy improvement: +10-15%
- Reduced reliance on LLM for extraction

### 17.2 Prompt A/B Testing

- Store multiple active prompts per document type
- Randomly assign 10% traffic to variant prompts
- Track success rate, rejection reasons, token usage
- Auto-promote best-performing prompts

### 17.3 Human-in-the-Loop for Edge Cases

- If confidence score between 0.4-0.6, route to human review queue
- Reviewer UI to validate/correct extractions
- Feedback loop to improve prompts


---

## 18. Rejection Reason → Plain English Mapping

| RejectionReason | Message sent to frontend |
| --- | --- |
| **IllegalDocument** | We were unable to read this document clearly. Please upload a clearer scan. |
| **DateMismatch** | The dates in this document do not match your policy records. Please verify and re-upload. |
| **UnsupportedFormat** | This document format could not be processed. Please try a PDF, JPG, or PNG file. |
| **ExpiredDocument** | This document is too old to be accepted. Please provide a more recent copy. |
| **MissingFields** | This document appears to be incomplete. Please ensure all required information is visible. |
| **InvalidNcbRange** | The No Claims Bonus years stated in this document appear invalid. Please verify and re-upload. |
| **FutureDate** | This document contains a date that is in the future. Please verify the document details. |
| **ExtractionFailed** | We were unable to process this document automatically. Please try again or contact support. |
| **RateLimitExceeded** | You have exceeded the maximum number of uploads. Please try again later. |
| **ServiceUnavailable** | Our verification service is temporarily unavailable. Please try again in a few minutes. |

---

## 19. Key Architectural Decisions Summary

| Decision | Rationale |
| --- | --- |
| **Single LLM call** | 50% cost and latency reduction; GPT-4o handles combined extraction+validation well |
| **CosmosDB + Redis** | Redis for hot state (TTL, SSE), Cosmos for cold audit trail (queryable, durable) |
| **Pre-LLM guardrails** | Short-circuit invalid docs before expensive Azure DI/OpenAI calls (~20% cost savings) |
| **Polly resilience** | Production-grade retry, circuit breaker, timeout for all external dependencies |
| **Prompt externalization** | Cosmos DB storage enables rapid iteration, A/B testing without redeployment |
| **Simplified orchestration** | Plain C# pipeline instead of SK Process Framework (easier debugging, less complexity); can enhance with fluent builder pattern or migrate to Durable Functions when scale demands it |
| **Streaming file handling** | No MemoryStream buffering reduces memory pressure under load |
| **Application Insights** | Full observability: metrics, logs, traces, alerts for proactive monitoring |
| **Managed Identity** | Zero secrets in code/config; Azure handles credential lifecycle |
| **Rate limiting** | Prevents abuse; enforced at middleware layer before pipeline execution |

---
