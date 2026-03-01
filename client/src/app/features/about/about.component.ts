import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  standalone: true,
  template: `
    <div class="about-page">
      <div class="about-container">

        <header class="about-header">
          <div class="about-icon">
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="10" fill="#4a7fc1"/>
              <path d="M12 32L18 16L24 28L30 20L36 32H12Z" fill="white" opacity="0.85"/>
              <circle cx="24" cy="14" r="4" fill="#a8c8f0"/>
            </svg>
          </div>
          <div>
            <h1 class="about-title">Union Pay Calculator</h1>
            <p class="about-subtitle">AI-assisted timesheet analysis for IBEW Local 1245 / Pinnacle Powers</p>
          </div>
        </header>

        <section class="about-section">
          <h2>How the App Works</h2>
          <p>
            The overall function of this system is to analyze timesheet calculations to verify they are
            correct, and to help users understand the results based on the current union contract.
          </p>
        </section>

        <section class="about-section">
          <h2>How Does It Know the Rules?</h2>
          <p>
            On the <strong>Rules &amp; Docs</strong> page, administrators can upload multiple documents
            about the union contract and the rules regarding payment as negotiated. These documents are
            stored in a secure cloud directory and analyzed by Google's Vertex AI service.
          </p>
        </section>

        <section class="about-section">
          <h2>Why Not Just Ask ChatGPT?</h2>
          <p>
            A general AI search looks for information across the entire internet. That won't work here —
            union rules are specific to the current contract. You could include the contract directly in
            each request to an AI, but there are strict limits on how much information you can send at once.
            Instead, we use a three-step process to send only what's relevant.
          </p>
        </section>

        <div class="process-steps">

          <div class="step">
            <div class="step-number">1</div>
            <div class="step-body">
              <h3>Publish a Library</h3>
              <p>
                A traditional library is a building full of carefully indexed books. Ours is a collection
                of union contract documents and pay rule references stored in a Google Cloud Storage bucket.
                Administrators manage this library from the <strong>Rules &amp; Docs</strong> page —
                uploading, editing, and removing documents as the contract evolves.
              </p>
            </div>
          </div>

          <div class="step">
            <div class="step-number">2</div>
            <div class="step-body">
              <h3>Vertex AI — Our Library Expert</h3>
              <p>
                Just as you might send a researcher to the library with a specific question, we send
                that question to Google's Vertex AI search. It searches <em>only</em> our library and
                returns the specific documents and passages that are relevant. If you have 100 pages of
                contracts but only 3 actually mention missed meals, Vertex AI finds those 3.
              </p>
            </div>
          </div>

          <div class="step">
            <div class="step-number">3</div>
            <div class="step-body">
              <h3>Gemini — The Analyst</h3>
              <p>
                Gemini is Google's AI reasoning engine. Our researcher (Vertex AI) returns the relevant
                documents, and Gemini studies them in the context of the specific timesheet data to
                formulate a precise, grounded response — using only what's in our library.
              </p>
            </div>
          </div>

        </div>

        <section class="about-section">
          <h2>Accuracy &amp; Limitations</h2>
          <p>
            Public AI engines like ChatGPT use billions of documents from the entire internet — many
            outdated or irrelevant. Asking one about a specific union contract is like sending a
            researcher to every public library on the planet to find your local agreement. Starting
            with a small, accurate, confirmed library produces far better results.
          </p>
          <p>
            That said, no AI system provides a 100% guarantee. Edge cases exist, and results should
            always be reviewed. Developers, foremen, and supervisors are also fallible. Used together,
            this tool significantly enhances everyone's understanding and reduces calculation errors.
          </p>
        </section>

        <section class="about-section">
          <h2>The Calculator</h2>
          <p>
            The <strong>Calculator</strong> page applies the IBEW Local 1245 pay rules mechanically
            to timesheet data. It classifies each hour as Standard Time (ST), Premium Time (PT),
            or Double Time (DT) based on the Regularly Scheduled Window (STW), shift type
            (RS vs. ES), day of week, and any applicable thresholds. It also calculates missed meal
            penalties and subsistence payments automatically.
          </p>
          <p>
            After a calculation is run, you can bring the results directly into <strong>Ask Gemini</strong>
            to ask plain-language questions about why specific hours were classified the way they were.
          </p>
        </section>

      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .about-page {
      min-height: calc(100vh - 56px);
      background: var(--page-bg);
      padding: 2.5rem 1.25rem;
    }

    .about-container {
      max-width: 780px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    /* ── Header ── */
    .about-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2.5rem;
    }

    .about-icon { flex-shrink: 0; }

    .about-title {
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--text);
      margin: 0 0 0.2rem;
      letter-spacing: -0.02em;
    }

    .about-subtitle {
      font-size: 0.88rem;
      color: var(--text-muted);
      margin: 0;
    }

    /* ── Sections ── */
    .about-section {
      margin-bottom: 1.75rem;
    }

    .about-section h2 {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text);
      margin: 0 0 0.55rem;
      padding-bottom: 0.4rem;
      border-bottom: 1px solid var(--border);
    }

    .about-section p {
      font-size: 0.9rem;
      line-height: 1.7;
      color: var(--text-secondary);
      margin: 0 0 0.7rem;
    }
    .about-section p:last-child { margin-bottom: 0; }

    /* ── Process steps ── */
    .process-steps {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1.75rem;
    }

    .step {
      display: flex;
      gap: 1.1rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.1rem 1.25rem;
    }

    .step-number {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--primary);
      color: #fff;
      font-size: 0.9rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 0.1rem;
    }

    .step-body h3 {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text);
      margin: 0 0 0.4rem;
    }

    .step-body p {
      font-size: 0.875rem;
      line-height: 1.65;
      color: var(--text-secondary);
      margin: 0;
    }
  `]
})
export class AboutComponent {}
