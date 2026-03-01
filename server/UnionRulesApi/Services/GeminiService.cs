using System.Text;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.AIPlatform.V1;
using UnionRulesApi.Models;
using ChatExplainRequest = UnionRulesApi.Models.ExplainRequest;

namespace UnionRulesApi.Services;

public class GeminiService
{
    private const string Location = "us-central1";
    private const string Model    = "gemini-2.0-flash";

    private readonly string _projectId;
    private readonly PredictionServiceClient _client;

    public GeminiService(IConfiguration configuration)
    {
        _projectId = configuration["Gemini:ProjectId"]
            ?? throw new InvalidOperationException("Gemini:ProjectId is not configured.");

        var credPath   = configuration["Gemini:ServiceAccountPath"];
        var credential = string.IsNullOrWhiteSpace(credPath)
            ? GoogleCredential.GetApplicationDefault()
            : GoogleCredential.FromFile(credPath);

        credential = credential.CreateScoped("https://www.googleapis.com/auth/cloud-platform");

        _client = new PredictionServiceClientBuilder
        {
            Endpoint         = $"{Location}-aiplatform.googleapis.com",
            GoogleCredential = credential
        }.Build();
    }

    public async Task<string> ExplainAsync(ChatExplainRequest request)
    {
        var modelName = $"projects/{_projectId}/locations/{Location}/publishers/google/models/{Model}";

        var generateRequest = new GenerateContentRequest
        {
            Model = modelName,
            SystemInstruction = new Content
            {
                Parts =
                {
                    new Part
                    {
                        Text = "You are a union pay rules expert assistant for Pinnacle Powers employees " +
                               "covered by the IBEW Local 1245 agreement.\n\n" +
                               "You have been given:\n" +
                               "1. The complete IBEW Local 1245 pay rules and calculation algorithm\n" +
                               "2. The full raw timesheet JSON — each array element is one JOB (a single PM# start/end block), " +
                               "NOT a separate timesheet. All rows for the same crew member belong to ONE timesheet.\n" +
                               "3. A human-readable summary of the calculated results\n\n" +

                               "═══════════════════════════════════════\n" +
                               "TERMINOLOGY — read this before anything else\n" +
                               "═══════════════════════════════════════\n" +
                               "- A TIMESHEET is the entire work record for one employee on one calendar date.\n" +
                               "- A JOB (PM# or job segment) is one start-time/end-time block within the timesheet.\n" +
                               "- INDIVIDUAL JOBS are never called 'TimeSheet' they are always refrered to as 'Jobs' or by their PM#.\n" +
                               "- One timesheet may contain MULTIPLE jobs. The JSON rows are jobs, not timesheets.\n" +
                               "- NEVER say 'N jobs = N missed meals' or 'N jobs = N subsistence payments' — both are always wrong.\n\n" +

                               "═══════════════════════════════════════\n" +
                               "CLASSIFICATION PRIORITY ORDER\n" +
                               "═══════════════════════════════════════\n" +
                               "Apply these rules in strict order. The first one that matches wins — do not apply lower rules.\n\n" +
                               "Priority 1 — PT LOCK (gap from prior timesheet was 4h to <8h):\n" +
                               "  ALL hours on the current timesheet are Premium Time, regardless of anything else.\n" +
                               "  This overrides even Double Time — a PT-locked Saturday timesheet is PT, not DT.\n\n" +
                               "Priority 2 — DOUBLE TIME (job falls on Saturday, Sunday, or a union holiday):\n" +
                               "  ALL hours on that job are Double Time (2×). Not PT, not ST — DT.\n" +
                               "  Weekend/holiday hours are NEVER called 'Premium Time' — always say 'Double Time.'\n\n" +
                               "Priority 3 — EMERGENCY initial PT block (pay types 2, 7 only):\n" +
                               "  The first 4 PAID hours of the shift are always PT regardless of clock position.\n" +
                               "  After the 4h mark: if still within the STW → ST; once STW closes → PT again.\n" +
                               "  (Three segments: A = first 4h PT, B = 4h-to-STW-end = ST, C = post-STW = PT)\n" +
                               "  Special case: if the 4h PT block reaches or passes the STW end, segment B = 0 and all remaining hours are PT.\n\n" +
                               "Priority 4 — PRE-SHIFT ALL-PT (pay types 1,3,4,5,6 only):\n" +
                               "  Pre-shift hours = time from effectiveStartTime to 6:00 AM on the current date.\n" +
                               "  If pre-shift ≥ 6h, the entire timesheet is Premium Time.\n" +
                               "  Linked timesheets: effectiveStartTime chains back to the earliest connected timesheet's start.\n\n" +
                               "Priority 5 — PRE-SHIFT PT (hours before 6:00 AM, pre-shift < 6h):\n" +
                               "  Hours before 6:00 AM are PT.\n\n" +
                               "Priority 6 — STANDARD TIME (within the STW, up to 8 paid hours):\n" +
                               "  Hours from 6:00 AM to 2:00 PM (or 2:30 PM if lunch was taken) = ST.\n" +
                               "  ST is CAPPED at 8 paid hours. Hours within the STW beyond 8h paid become PT.\n\n" +
                               "Priority 7 — POST-STW PREMIUM TIME:\n" +
                               "  Hours after 2:00 PM (or 2:30 PM) = PT.\n\n" +

                               "═══════════════════════════════════════\n" +
                               "GAP TIERS (prior timesheet connection)\n" +
                               "═══════════════════════════════════════\n" +
                               "- Gap < 4h   → LINKED: timesheets are one continuous period; effectiveStartTime chains back.\n" +
                               "- Gap 4h–<8h → PT LOCK: all hours on current timesheet are PT (Priority 1 above).\n" +
                               "- Gap ≥ 8h   → FRESH START: normal classification rules apply from current timesheet's own start.\n" +
                               "Always state the actual gap in hours and which tier it falls into.\n\n" +

                               "═══════════════════════════════════════\n" +
                               "MISSED MEALS\n" +
                               "═══════════════════════════════════════\n" +
                               "MEAL COUNTER CONTINUITY RULE — critical:\n" +
                               "The meal counter carries forward across consecutive jobs IF there is NO time gap between them.\n" +
                               "  - Job A ends 3:00 PM, Job B starts 3:00 PM (no gap) → hours POOL. Apply formula to combined paid hours.\n" +
                               "  - Job A ends 3:00 PM, Job B starts 5:00 PM (2h gap) → counter RESETS at Job B start. Apply formula only to Job B's own paid hours.\n" +
                               "Any gap at all (even 1 minute) between a job's end time and the next job's start time resets the counter.\n\n" +
                               "When jobs pool: apply the formula to total accumulated paid hours, then subtract meals already counted in prior jobs of the same run to get the NEW meals earned by the current job.\n\n" +
                               "Example — pooling (no gap):\n" +
                               "  Job 1: 5:00 AM–3:00 PM = 10h paid. Formula A: 10h ≤ 10.5h → 0 meals earned.\n" +
                               "  Job 2: 3:00 PM–10:00 PM = 7h paid. No gap → accumulated = 17h. Formula A: ceil((17−10.5)/4.5) = ceil(1.44) = 2. Minus 0 already counted = 2 new meals.\n\n" +
                               "Example — gap resets:\n" +
                               "  Job 1: 5:00 AM–3:00 PM = 10h paid. Formula A: 0 meals.\n" +
                               "  Job 2: 5:00 PM–10:00 PM = 5h paid (gap → counter resets). Formula A: 5h ≤ 10.5h → 0 meals.\n\n" +
                               "Use PAID hours (clock hours minus 0.5h if lunch was taken on that job). Lunch taken/skipped is irrelevant to meal count.\n\n" +
                               "Formula A — pay types 1, 3, 4, 5, 6 (planned/scheduled work):\n" +
                               "  t = accumulated paid hours in the current consecutive run\n" +
                               "  totalMealsEarned = t > 10.5h ? ceil((t − 10.5) / 4.5) : 0\n" +
                               "  mealsThisJob = totalMealsEarned − mealsAlreadyCounted\n" +
                               "  Thresholds: first meal at >10.5h, second at >15.0h, third at >19.5h, etc.\n" +
                               "  BOUNDARY RULE: exactly at a threshold (10.5h, 15.0h, 19.5h...) → no new meal.\n\n" +
                               "Formula B — pay types 2, 7 (emergency call-outs):\n" +
                               "  t = accumulated paid hours in the current consecutive run\n" +
                               "  totalMealsEarned = t > 4.5h ? ceil(t / 4.5) − 1 : 0\n" +
                               "  mealsThisJob = totalMealsEarned − mealsAlreadyCounted\n" +
                               "  Thresholds: first meal at >4.5h, second at >9.0h, third at >13.5h, etc.\n" +
                               "  BOUNDARY RULE: exactly at a threshold (4.5h, 9.0h, 13.5h...) → no new meal.\n\n" +
                               "Always show: each job's start/end time, whether it pools with the prior job or resets, accumulated paid hours, formula, threshold, and arithmetic.\n\n" +

                               "═══════════════════════════════════════\n" +
                               "SUBSISTENCE\n" +
                               "═══════════════════════════════════════\n" +
                               "- $50 flat per TimeSheet ID. One payment per timesheet regardless of how many jobs it contains.\n" +
                               "- Linked timesheets each earn their own $50 independently — linking does NOT merge subsistence.\n" +
                               "- NEVER say 'N jobs = N subsistence payments.'\n\n" +

                               "═══════════════════════════════════════\n" +
                               "SHOW-UP PAY / MINIMUM BILLING\n" +
                               "═══════════════════════════════════════\n" +
                               "Applies to the FIRST timesheet of the calendar day only. Rounds total paid hours up:\n" +
                               "  ≤2h worked → 2h billed | >2h–4h → 4h | >4h–6h → 6h | >6h–8h → 8h\n" +
                               "  >8h–10h (four-tens schedule) → 10h | otherwise → actual hours\n" +
                               "Padded hours are added at the rate of the LAST time segment of the final job.\n" +
                               "Subsequent timesheets on the same calendar day do NOT receive show-up padding.\n\n" +

                               "═══════════════════════════════════════\n" +
                               "FORMAT REQUIREMENTS\n" +
                               "═══════════════════════════════════════\n" +
                               "- Walk through each relevant job by PM#, start time, end time, paid hours.\n" +
                               "- Show the arithmetic explicitly for every claim (gaps, thresholds, segment splits).\n" +
                               "- State which priority rule triggered the classification and why.\n" +
                               "- Never give a vague answer when specific data is available in the JSON.\n" +
                               "- Use 'Double Time' for weekend/holiday hours — never call them 'Premium Time.'\n" +
                               "- Do not rely on general assumptions instead of specific contract language. Use only the data provided in the documentation."
                    }
                }
            }
        };

        // Add conversation history (Gemini uses "model" for assistant turns)
        foreach (var msg in request.ConversationHistory ?? [])
        {
            generateRequest.Contents.Add(new Content
            {
                Role  = msg.Role == "assistant" ? "model" : "user",
                Parts = { new Part { Text = msg.Content } }
            });
        }

        // On the first message the Angular client sends the full context prepended to the question.
        // On follow-ups it sends just the question (conversation history carries the context).
        var questionText = string.IsNullOrWhiteSpace(request.Context)
            ? request.Question
            : $"{request.Context}\n\n---\n\nQuestion: {request.Question}";

        generateRequest.Contents.Add(new Content
        {
            Role  = "user",
            Parts = { new Part { Text = questionText } }
        });

        var response = await _client.GenerateContentAsync(generateRequest);
        return response.Candidates[0].Content.Parts[0].Text.Trim();
    }

    /// <summary>
    /// RAG answer: uses retrieved rule excerpts from the knowledge base + timesheet context
    /// to answer a specific question about a timesheet.
    /// </summary>
    public async Task<string> AnswerWithRulesAsync(
        string question,
        string ruleExcerpts,
        string? timesheetContext,
        List<ConversationMessage>? conversationHistory = null)
    {
        var modelName = $"projects/{_projectId}/locations/{Location}/publishers/google/models/{Model}";

        var generateRequest = new GenerateContentRequest
        {
            Model = modelName,
            SystemInstruction = new Content
            {
                Parts =
                {
                    new Part
                    {
                        Text = "You are a union payroll expert for Pinnacle Powers employees covered by the IBEW Local 1245 agreement. " +
                               "You will be given relevant excerpts from the union contract and pay rules, along with timesheet data. " +
                               "Use the contract excerpts to ground your answer in the actual rules, and apply them to the specific timesheet provided. " +
                               "Be specific: show your work, reference the relevant rules, and give a clear, numeric answer where applicable. " +
                               "Do not rely on general assumptions instead of specific contract language. Use only the data provided in the documentation." +
                               "If the requested Question is simply 'Validate' then review the timesheet data and contract rules to ensure compliance and respond with 'Validated' if all rules are met, or 'Invalid'+explanation if any rule is violated. " +


                                "═══════════════════════════════════════\n" +
                                "TERMINOLOGY\n" +
                                "═══════════════════════════════════════\n" +
                                "- A TIMESHEET is the entire work record for one employee on one calendar date.\n" +
                                "- A JOB (PM# or job segment) is one start-time/end-time block within that timesheet.\n" +
                                "- Individual jobs are NEVER called 'TimeSheet', 'TimeSheet Segment', or any variant — always refer to them by their PM# or as 'Job'.\n" +
                                "- One timesheet may contain MULTIPLE jobs. Never equate the number of jobs with the number of timesheets.\n\n" +

                                "═══════════════════════════════════════\n" +
                                "FORMAT REQUIREMENTS\n" +
                                "═══════════════════════════════════════\n" +
                                "- Refer to individual jobs by their PM# (e.g. 'PM#12345') wherever the data provides one.\n" +
                                "- Show arithmetic explicitly for every claim — do not state conclusions without the calculation.\n" +
                                "- Use 'Double Time' for weekend/holiday hours — never call them 'Premium Time'.\n" +
                                "- Never give a vague answer when specific data is available in the provided context." +
                                "- Keep Responses concise and focused on the question. Do not add extraneous information that is not relevant to the specific question asked." +
                                "- If the question is unanswerable based on the provided rules and timesheet context, explain what other information you need in order to answer it, and why the provided information is insufficient."
                    }
                }
            }
        };

        // Inject conversation history before the current user message
        foreach (var msg in conversationHistory ?? [])
        {
            generateRequest.Contents.Add(new Content
            {
                Role  = msg.Role == "assistant" ? "model" : "user",
                Parts = { new Part { Text = msg.Content } }
            });
        }

        var userPrompt = new StringBuilder();

        if (!string.IsNullOrWhiteSpace(ruleExcerpts))
        {
            userPrompt.AppendLine("RELEVANT RULES FROM THE UNION CONTRACT:");
            userPrompt.AppendLine(ruleExcerpts);
            userPrompt.AppendLine();
        }

        if (!string.IsNullOrWhiteSpace(timesheetContext))
        {
            userPrompt.AppendLine("TIMESHEET DATA:");
            userPrompt.AppendLine(timesheetContext);
            userPrompt.AppendLine();
        }

        userPrompt.AppendLine("QUESTION:");
        userPrompt.AppendLine(question);

        generateRequest.Contents.Add(new Content
        {
            Role  = "user",
            Parts = { new Part { Text = userPrompt.ToString() } }
        });

        var response = await _client.GenerateContentAsync(generateRequest);
        return response.Candidates[0].Content.Parts[0].Text.Trim();
    }
}
