# AA IRELAND

## Motor Insurance Document Validation

### Backend Service PRD — .NET 8 / C# / Azure

| Version | 3.0  |
| --- | --- |
| **Author** | Fernando Hermida — Senior Software Developer / Solution Architect |
| **Runtime** | .NET 8 LTS  ·  C# 12  ·  ASP.NET Core Minimal API |
| **OCR Provider** | Azure Document Intelligence (AI Services) |
| **LLM** | Azure OpenAI — GPT-4o |
| **Orchestration** | Semantic Kernel 1.x + Microsoft.Extensions.AI |
| **Storage** | In-memory ConcurrentDictionary (demo) |
| **Date** | March 2026 |

---

## 1. Overview

This document specifies the real backend service for the AA Ireland Motor Insurance Document Validation portal. 

This service does the actual work: it receives uploaded files, runs them through Azure Document Intelligence to extract raw text and structure, then passes the extracted content to Azure OpenAI GPT-4o to validate the fields against insurance-specific rules and produce a typed verdict. Every document submitted reaches a real Azure AI endpoint. The three supported document types each have distinct extraction schemas and validation rules that the LLM reasons over before returning a final `OcrResult`. 

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
| **Application Layer** | CQRS command handler — SubmitDocumentCommand orchestrates the pipeline via IDocumentPipeline |
| **Pipeline Layer** | Semantic Kernel Process — coordinates 4 steps: Ingest → Extract → Validate → Emit |
| **Azure DI Adapter** | Calls Azure Document Intelligence Prebuilt-Read model; maps AnalyzeResult to DocumentContent |
| **Azure OpenAI Adapter** | Calls GPT-4o via SK Kernel; structured output enforced via JSON schema on chat completion |
| **Guardrails Layer** | Post-LLM validation: date plausibility, schema completeness, contradiction detection |
| **Audit Layer** | Immutable per-job AuditTrail — every step's input, output, latency, and token usage recorded |
| **Job Store** | `ConcurrentDictionary<string, JobRecord>` — holds state + SSE channel per job |

### 2.2 Request Flow

1. Frontend POSTs multipart/form-data to `POST /api/documents` (file + docType) 
2. API layer registers a new `JobRecord` in the store; returns 202 Accepted with `jobId` + `streamUrl` immediately 
3. Frontend opens `GET /api/documents/{jobId}/status` — SSE stream begins, `IAsyncEnumerable<PipelineEvent>` flows 
4. `SubmitDocumentCommand` is dispatched to MediatR; pipeline starts on a background Task 
5. **Ingest step**: reads `IFormFile` bytes, detects MIME, emits `UPLOADING` event 
6. **Azure Document Intelligence step**: sends file to Prebuilt-Read endpoint; receives raw text + layout; emits `SCANNING {stage:'READING'}` 
7. **Azure OpenAI GPT-4o step**: sends extracted content + doc-type-specific system prompt; receives structured JSON fields; emits `SCANNING {stage:'VERIFYING'}` 
8. **Guardrails step**: validates extracted fields — date ranges, required field presence, logical consistency 
9. **Result emitted**: SUCCESS with `extractedData`, or REJECTED with reason code + plain-English message 
10. `AuditTrail` entry written; SSE stream completes; channel closed 

---

## 3. Azure Document Intelligence Integration

### 3.1 Model Selection

The service uses the **Prebuilt-Read model** (prebuilt/read) from Azure Document Intelligence. This model performs OCR on PDF, JPG, and PNG files — extracting text content with layout information without requiring a custom trained model. This is the correct choice for insurance letters, which are unstructured prose documents rather than forms. 

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
    Task<DocumentContent> AnalyseAsync(Stream fileStream, string contentType, CancellationToken ct);
}

public sealed record DocumentContent(
    string RawText,                    // full concatenated text from all pages
    IReadOnlyList<string> Paragraphs,  // paragraph-level segments for RAG context
    double AverageConfidence,          // avg word confidence from DI response
    int PageCount
);

```

### 3.3 Adapter Implementation

```csharp
public sealed class AzureDocumentIntelligenceAdapter : IDocumentIntelligenceAdapter
{
    private readonly DocumentIntelligenceClient _client;  // from Azure.AI.DocumentIntelligence

    public async Task<DocumentContent> AnalyseAsync(Stream fileStream, string contentType, CancellationToken ct)
    {
        var content = new AnalyzeDocumentContent { Base64Source = BinaryData.FromStream(fileStream) };
        var operation = await _client.AnalyzeDocumentAsync(
            WaitUntil.Completed, "prebuilt-read", content, cancellationToken: ct);

        var result = operation.Value;
        var paragraphs = result.Paragraphs?.Select(p => p.Content).ToList() ?? [];
        var avgConfidence = result.Pages
            .SelectMany(pg => pg.Words)
            .Average(w => w.Confidence);

        return new DocumentContent(
            RawText: string.Join("\n", paragraphs),
            Paragraphs: paragraphs,
            AverageConfidence: avgConfidence,
            PageCount: result.Pages.Count
        );
    }
}

```

### 3.4 Low Confidence Handling

If `AverageConfidence` falls below the configured threshold (default 0.6), the pipeline short-circuits before calling GPT-4o and returns a REJECTED result with reason `ILLEGIBLE_DOCUMENT`. This avoids sending garbage text to the LLM and wasting tokens. 

> **Configuration key**: `DocumentIntelligence:MinConfidenceThreshold` (default 0.6)
> Values below this threshold trigger immediate rejection without LLM call. Configurable per environment. 

---

## 4. Azure OpenAI + Semantic Kernel Integration

### 4.1 Kernel Setup

The Semantic Kernel `Kernel` is registered as a singleton in DI. It targets Azure OpenAI GPT-4o via the `AddAzureOpenAIChatCompletion` extension. All credentials come from Azure Managed Identity in production — no secrets in code or config files. 

```csharp
// OcrPortal.Api/Program.cs

builder.Services.AddSingleton(sp => {
    var opts = sp.GetRequiredService<IOptions<AzureOpenAiOptions>>().Value;
    return Kernel.CreateBuilder()
        .AddAzureOpenAIChatCompletion(
            deploymentName: opts.DeploymentName,   // e.g. "gpt-4o"
            endpoint: opts.Endpoint,
            credentials: new DefaultAzureCredential()  // Managed Identity — no API keys
        )
        .Build();
});

```

### 4.2 Extraction Plugins — One Per Document Type

Each document type has a dedicated Semantic Kernel Plugin. GPT-4o is instructed via a system prompt that is specific to each document type — not a generic extraction prompt. 

```csharp
// OcrPortal.Infrastructure/SemanticKernel/Plugins/NcbExtractionPlugin.cs

[KernelFunction]
[Description("Extract structured fields from a No Claims Bonus letter")]
public async Task<NcbExtractedFields> ExtractAsync(
    Kernel kernel,
    [Description("Raw text from Azure Document Intelligence")] string documentText)
{
    var prompt = $"""
        You are an insurance document analyst. Extract the following fields from this
        No Claims Bonus letter. Return ONLY valid JSON matching the schema provided.
        If a field cannot be found, return null for that field.

        Schema: {{ YearsNoClaims: integer, PreviousInsurer: string,
                   PolicyEndDate: ISO8601 date, CustomerName: string }}

        Document text:
        {documentText}
        """;

    var result = await kernel.InvokePromptAsync<NcbExtractedFields>(prompt,
        new KernelArguments(new PromptExecutionSettings {
            ResponseFormat = typeof(NcbExtractedFields)  // enforces JSON schema
        }));

    return result ?? throw new OcrExtractionException(DocumentType.NCB);
}

```

### 4.3 Validation Reasoning Plugin

After extraction, a second GPT-4o call performs validation reasoning. This is separate from extraction deliberately — mixing 'extract fields' and 'validate fields' in one prompt degrades accuracy on both tasks. The validation plugin uses a **Reasoning-Before-Scoring** strategy. 

```csharp
// OcrPortal.Infrastructure/SemanticKernel/Plugins/ValidationReasoningPlugin.cs

[KernelFunction]
[Description("Validate extracted NCB fields against insurance acceptance rules")]
public async Task<ValidationVerdict> ValidateNcbAsync(
    Kernel kernel,
    NcbExtractedFields fields,
    [Description("Today's date for age calculations")] DateOnly today)
{
    var prompt = $"""
        You are a senior insurance underwriter. Validate the following extracted
        No Claims Bonus data and determine if it should be accepted or rejected.

        Rules to check:
        1. YearsNoClaims must be between 1 and 20
        2. PolicyEndDate must be within the last 2 years (today: {today})
        3. PreviousInsurer must not be empty
        4. PolicyEndDate must not be in the future

        Extracted fields: {JsonSerializer.Serialize(fields)}

        Respond with JSON: {{ Accepted: bool, Reason: string|null, Rationale: string }}
        Rationale must explain your reasoning step by step before Accepted is set.
        """;

    return await kernel.InvokePromptAsync<ValidationVerdict>(prompt, ...) ?? ...;
}

```

### 4.4 Structured Output Enforcement

Both plugins use `ResponseFormat` set to the target C# type. Semantic Kernel translates this to the JSON schema enforcement parameter on the Azure OpenAI API call. If the response cannot be deserialised, the pipeline throws an `OcrExtractionException`. 

---

## 5. Pipeline Steps in Detail

### 5.1 Step 1 — Document Ingestion

* Reads `IFormFile` into a `MemoryStream` 


* Validates MIME type via `MimeDetective` (reads magic bytes) 


* Enforces max file size: 10MB 


* Emits `PipelineEvent { State = Uploading, Progress = 100 }` 



### 5.2 Step 2 — Azure Document Intelligence

* Calls `IDocumentIntelligenceAdapter.AnalyseAsync()` 


* Checks `AverageConfidence` — rejects immediately if below threshold 


* Emits `PipelineEvent { State = Scanning, Stage = "READING", Progress = 50 }` 


* Records step duration and DI response metadata in `AuditTrail` 



### 5.3 Step 3 — GPT-4o Extraction + Validation

* Invokes the doc-type-specific extraction plugin → typed extracted fields record 


* Emits `PipelineEvent { State = Scanning, Stage = "VERIFYING", Progress = 80 }` 


* Invokes the validation reasoning plugin → `ValidationVerdict` 


* Records token usage (prompt + completion tokens) in `AuditTrail` 



### 5.4 Step 4 — Guardrails

Guardrails run after the LLM verdict as a deterministic check. They catch cases where GPT-4o may have hallucinated: 

| Guardrail Check | Triggers REJECTED with reason |
| --- | --- |
| **FutureDateGuard** | Any extracted date is in the future |
| **RequiredFieldsGuard** | Null fields on non-optional schema properties |
| **DateRangeGuard** | `PolicyEndDate` older than 2 years |
| **NcbRangeGuard** | `YearsNoClaims` < 1 or > 20 |
| **GapDurationGuard** | `gapEnd < gapStart`, or computed `gapDays` mismatch |
| **InsurerNameGuard** | `PreviousInsurer` is whitespace-only or generic placeholder |

### 5.5 Step 5 — Result Emission

* Builds `OcrResult`: status, docType, reason, extractedData, reasoningTrace 

* Emits terminal `PipelineEvent` 



* Completes the `IAsyncEnumerable` channel — SSE stream closes 

---

## 6. API Specification

### 6.1 Endpoints

| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/documents` | Submit document. Returns 202 + jobId immediately. |
| GET | `/api/documents/{jobId}/status` | SSE stream. Emits PipelineEvent until terminal state. |
| GET | `/api/documents/{jobId}` | Fetch completed JobRecord including OcrResult + full AuditTrail. |
| GET | `/api/documents` | List all jobs in current session with summary status. |
| DELETE | `/api/documents/{jobId}` | Cancel in-progress job. Propagates CancellationToken. |
| GET | `/api/health` | Returns service version, Azure DI reachability, etc. |

### 6.2 POST /api/documents

**Request**: `multipart/form-data`

* `file`: `IFormFile` (PDF | JPG | PNG, ≤ 10MB) 

* `docType`: `string` ('NCB' | 'GAP_COVER' | 'POLICY_SCHEDULE') 

**202 Accepted**

```json
{
  "jobId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "QUEUED",
  "streamUrl": "/api/documents/3fa85f64.../status"
}

```

### 6.3 SSE Event Schema

```json
{
  "state": "SCANNING",            // UPLOADING | SCANNING | SUCCESS | REJECTED | ERROR
  "timestamp": "2026-03-10T14:22:01Z",
  "stage": "VERIFYING",           // READING | VERIFYING (only during SCANNING)
  "progress": 80,
  "result": null
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
    DateMismatch,      // Gap cover dates don't align with policy
    UnsupportedFormat, // File type passed MIME check but DI couldn't parse
    ExpiredDocument,   // PolicyEndDate older than 2 years
    MissingFields,     // Required fields null after extraction
    InvalidNcbRange,   // YearsNoClaims outside 1–20
    FutureDate,        // Extracted date is in the future
    ExtractionFailed,  // GPT-4o returned unparseable response
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
    object Input,
    object Output,
    int? PromptTokens,
    int? CompletionTokens,
    string? ErrorMessage
);

public sealed class JobRecord {
    public string JobId { get; init; } = Guid.NewGuid().ToString();
    public DocumentType DocType { get; init; }
    public UploadState State { get; set; } = UploadState.Uploading;
    public OcrResult? Result { get; set; }
    public List<AuditEntry> AuditTrail { get; } = [];
    public Channel<PipelineEvent> EventChannel { get; } = Channel.CreateUnbounded<PipelineEvent>();
}

```

---

## 8. Configuration

### 8.1 appsettings.json Structure

```json
{
  "AzureDocumentIntelligence": {
    "Endpoint": "https://<your-resource>.cognitiveservices.azure.com/",
    "MinConfidenceThreshold": 0.6
  },
  "AzureOpenAi": {
    "Endpoint": "https://<your-resource>.openai.azure.com/",
    "DeploymentName": "gpt-4o"
  },
  "OcrPipeline": {
    "MaxFileSizeBytes": 10485760,
    "AllowedMimeTypes": [ "application/pdf", "image/jpeg", "image/png" ],
    "NcbMaxAgeYears": 2,
    "GapCoverMaxAgeYears": 2,
    "PolicyScheduleMaxAgeYears": 2
  }
}

```

### 8.2 Credentials — No Secrets in Config

Both Azure services authenticate via `DefaultAzureCredential`. In local development this resolves to the developer's Azure CLI login; in production, to the Managed Identity. 

---

## 9. Solution Structure

| Path | Contents |
| --- | --- |
| **OcrPortal.Api/** | Program.cs, Endpoints/, Middleware/ |
| **OcrPortal.Application/** | Commands/, IDocumentPipeline.cs, IJobStore.cs |
| **OcrPortal.Domain/** | Enums/, Records/OcrResult.cs, Exceptions/ |
| **OcrPortal.Infrastructure/** | DI registration, all adapters and plugins |
| **OcrPortal.Tests/** | Unit + integration tests |

---

## 10. Technology Stack

| Category | Package | Notes |
| --- | --- | --- |
| **Runtime** | .NET 8 LTS | C# 12 features |
| **AI Orchestration** | Microsoft.SemanticKernel 1.x | Plugins, Process Framework |
| **OCR** | Azure.AI.DocumentIntelligence | Official Azure SDK, Prebuilt-Read model |
| **LLM** | Azure OpenAI via SK connector | GPT-4o, JSON schema enforcement |
| **Auth** | Azure.Identity | Managed Identity / az login |
| **File MIME** | MimeDetective | Magic byte sniffing |

---

## 11. Testing Strategy

### 11.1 Unit Tests — No Azure Required

* All Azure dependencies are hidden behind interfaces.

* `IDocumentIntelligenceAdapter` — returns canned `DocumentContent`. 

* `IChatClient` (MEAI) — returns pre-built JSON matching each schema. 

### 11.2 Integration Tests — Real Azure Calls

* Requires `AZURE_SUBSCRIPTION` set + RBAC roles assigned. 

* Submit real scanned PDF → assert terminal SUCCESS or REJECTED. 

* Test low-confidence path: submit blurred image → assert `ILLEGIBLE_DOCUMENT`. 

---

## 12. Rejection Reason → Plain English Mapping

| RejectionReason | Message sent to frontend |
| --- | --- |
| **IllegalDocument** | We were unable to read this document clearly... |
| **DateMismatch** | The dates in this document do not match your policy records... |
| **UnsupportedFormat** | This document format could not be processed... |
| **ExpiredDocument** | This document is too old to be accepted... |
| **MissingFields** | This document appears to be incomplete... |
| **InvalidNcbRange** | The No Claims Bonus years stated in this document appear invalid... |
| **FutureDate** | This document contains a date that is in the future... |
| **ExtractionFailed** | We were unable to process this document automatically... |

