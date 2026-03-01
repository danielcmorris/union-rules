import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DocsService } from '../../core/services/docs.service';
import { DocFile } from '../../core/models/docs.model';

@Component({
  selector: 'app-docs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="docs-layout">

      <!-- File list panel -->
      <aside class="file-panel">
        <div class="panel-header">
          <span class="panel-title">Files</span>
          <div class="header-actions">
            <button class="btn-sync" [disabled]="syncing()" (click)="sync()">
              @if (syncing()) { <span class="spinner-sm"></span> } @else { ↺ }
              Sync to AI
            </button>
            <button class="btn-upload" [disabled]="uploading()" (click)="triggerUpload()">
              @if (uploading()) { <span class="spinner-sm"></span> } @else { ↑ }
              Upload PDF
            </button>
            <input #pdfInput type="file" accept=".pdf" style="display:none" (change)="onPdfSelected($event)"/>
            <button class="btn-new" (click)="startNewFile()">+ New File</button>
          </div>
          @if (syncStatus()) {
            <span class="sync-status" [class.error]="syncStatus()!.startsWith('Sync failed')">
              {{ syncStatus() }}
            </span>
          }
        </div>

        @if (loadingFiles()) {
          <div class="spinner-wrap"><div class="spinner"></div></div>
        } @else {
          <ul class="file-list">
            @for (f of files(); track f.name) {
              <li class="file-item" [class.selected]="selectedFile() === f.name"
                  (click)="selectFile(f.name)">
                <div class="file-info">
                  <span class="file-name">
                    {{ f.name }}
                    @if (f.contentType === 'application/pdf') {
                      <span class="pdf-badge">PDF</span>
                    }
                  </span>
                  <span class="file-meta">{{ formatSize(f.size) }} · {{ formatDate(f.updated) }}</span>
                </div>
                <button class="btn-delete" title="Delete"
                        (click)="deleteFile(f.name, $event)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                  </svg>
                </button>
              </li>
            }
            @if (files().length === 0) {
              <li class="file-empty">No files in bucket.</li>
            }
          </ul>
        }
      </aside>

      <!-- Editor panel -->
      <section class="editor-panel">
        @if (isNewFile()) {
          <div class="editor-header">
            <input class="filename-input"
                   [value]="newFileName()"
                   (input)="newFileName.set(asInput($event))"
                   placeholder="filename.txt" spellcheck="false"/>
          </div>
        } @else if (selectedFile()) {
          <div class="editor-header">
            <span class="editor-filename">{{ selectedFile() }}</span>
          </div>
        } @else {
          <div class="editor-empty">
            <p>Select a file to edit, or click <strong>+ New File</strong>.</p>
          </div>
        }

        @if (selectedFile() || isNewFile()) {
          @if (loadingContent()) {
            <div class="spinner-wrap"><div class="spinner"></div></div>
          } @else if (isPdf()) {
            @if (pdfUrl()) {
              <embed class="pdf-viewer" [src]="safePdfUrl()!" type="application/pdf"/>
            } @else {
              <div class="spinner-wrap"><div class="spinner"></div></div>
            }
          } @else {
            <textarea class="editor-area"
                      [value]="content()"
                      (input)="content.set(asInput($event))"
                      spellcheck="false" placeholder="File content..."></textarea>
          }

          @if (!isPdf()) {
            <div class="editor-toolbar">
              <button class="btn-save" [disabled]="saving()" (click)="save()">
                @if (saving()) {
                  <span class="spinner-sm"></span> Saving…
                } @else {
                  Save
                }
              </button>
              @if (saveStatus()) {
                <span class="save-status" [class.error]="saveStatus()!.startsWith('Error')">
                  {{ saveStatus() }}
                </span>
              }
            </div>
          }
        }
      </section>

    </div>
  `,
  styles: [`
    :host { display: block; height: calc(100vh - 56px); }

    .docs-layout {
      display: flex;
      height: 100%;
      overflow: hidden;
      background: var(--page-bg);
    }

    /* ── File panel ── */
    .file-panel {
      width: 280px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--border);
      background: var(--surface);
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .panel-title {
      font-size: 0.78rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .sync-status {
      display: block;
      padding: 0.25rem 1rem;
      font-size: 0.75rem;
      color: #16a34a;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }
    .sync-status.error { color: #dc2626; }

    .btn-sync {
      background: var(--primary);
      border: none;
      color: #fff;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.6rem;
      border-radius: 5px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.3rem;
      transition: background 0.15s;
    }
    .btn-sync:hover:not(:disabled) { background: #2d5ba8; }
    .btn-sync:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-new {
      background: var(--primary-light);
      border: 1px solid rgba(58,109,199,0.3);
      color: var(--primary);
      font-size: 0.75rem;
      font-weight: 500;
      padding: 0.25rem 0.6rem;
      border-radius: 5px;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }
    .btn-new:hover {
      background: #d5e4f7;
      border-color: var(--primary);
    }

    .file-list {
      list-style: none;
      margin: 0;
      padding: 0.4rem 0;
      overflow-y: auto;
      flex: 1;
    }

    .file-item {
      display: flex;
      align-items: center;
      padding: 0.45rem 0.75rem 0.45rem 1rem;
      cursor: pointer;
      transition: background 0.12s;
      gap: 0.5rem;
    }
    .file-item:hover { background: var(--primary-light); }
    .file-item.selected { background: #d5e4f7; }

    .file-info {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }

    .file-name {
      font-size: 0.85rem;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .file-meta {
      font-size: 0.71rem;
      color: var(--text-muted);
      margin-top: 0.1rem;
    }

    .btn-delete {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0.2rem;
      border-radius: 4px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      transition: color 0.15s, background 0.15s;
    }
    .btn-delete:hover {
      color: #dc2626;
      background: rgba(220,38,38,0.08);
    }

    .file-empty {
      padding: 1.5rem 1rem;
      font-size: 0.82rem;
      color: var(--text-muted);
      text-align: center;
    }

    /* ── Editor panel ── */
    .editor-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--page-bg);
    }

    .editor-header {
      padding: 0.6rem 1.25rem;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
      flex-shrink: 0;
    }

    .editor-filename {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text);
      font-family: monospace;
    }

    .filename-input {
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--primary);
      color: var(--text);
      font-size: 0.9rem;
      font-family: monospace;
      padding: 0.1rem 0.2rem;
      outline: none;
      width: 320px;
    }
    .filename-input::placeholder { color: var(--text-muted); }

    .editor-empty {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      font-size: 0.9rem;
    }
    .editor-empty strong { color: var(--text-secondary); }

    .editor-area {
      flex: 1;
      resize: none;
      background: var(--surface);
      border: none;
      outline: none;
      color: var(--text);
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.85rem;
      line-height: 1.6;
      padding: 1rem 1.25rem;
      overflow-y: auto;
    }

    .pdf-viewer {
      flex: 1;
      width: 100%;
      border: none;
      background: var(--surface);
    }

    .pdf-badge {
      display: inline-block;
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #fff;
      background: #dc2626;
      border-radius: 3px;
      padding: 0.05rem 0.3rem;
      margin-left: 0.35rem;
      vertical-align: middle;
    }

    .btn-upload {
      background: #16a34a;
      border: none;
      color: #fff;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.6rem;
      border-radius: 5px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.3rem;
      transition: background 0.15s;
    }
    .btn-upload:hover:not(:disabled) { background: #15803d; }
    .btn-upload:disabled { opacity: 0.5; cursor: not-allowed; }

    .editor-toolbar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 1.25rem;
      border-top: 1px solid var(--border);
      background: var(--surface);
      flex-shrink: 0;
    }

    .btn-save {
      background: var(--primary);
      border: none;
      color: #fff;
      font-size: 0.82rem;
      font-weight: 600;
      padding: 0.35rem 1rem;
      border-radius: 5px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: background 0.15s;
    }
    .btn-save:hover:not(:disabled) { background: #2d5ba8; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

    .save-status {
      font-size: 0.8rem;
      color: #16a34a;
    }
    .save-status.error { color: #dc2626; }

    /* ── Spinners ── */
    .spinner-wrap {
      display: flex;
      justify-content: center;
      padding: 2rem;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 2.5px solid var(--border);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    .spinner-sm {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class DocsComponent implements OnInit, OnDestroy {
  private readonly docsService = inject(DocsService);
  private readonly sanitizer   = inject(DomSanitizer);

  readonly files          = signal<DocFile[]>([]);
  readonly loadingFiles   = signal(true);
  readonly selectedFile   = signal<string | null>(null);
  readonly loadingContent = signal(false);
  readonly saving         = signal(false);
  readonly saveStatus     = signal<string | null>(null);
  readonly isNewFile      = signal(false);
  readonly content        = signal('');
  readonly newFileName    = signal('');
  readonly syncing        = signal(false);
  readonly syncStatus     = signal<string | null>(null);
  readonly uploading      = signal(false);
  readonly pdfUrl         = signal<string | null>(null);

  readonly isPdf = computed(() => {
    const name = this.selectedFile();
    if (!name) return false;
    const file = this.files().find(f => f.name === name);
    return file?.contentType === 'application/pdf';
  });

  safePdfUrl(): SafeResourceUrl | null {
    const url = this.pdfUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  }

  ngOnInit() {
    this.loadFiles();
  }

  ngOnDestroy() {
    this.revokePdfUrl();
  }

  private loadFiles() {
    this.loadingFiles.set(true);
    this.docsService.listFiles().subscribe({
      next: files => {
        this.files.set(files.sort((a, b) => a.name.localeCompare(b.name)));
        this.loadingFiles.set(false);
      },
      error: () => this.loadingFiles.set(false)
    });
  }

  selectFile(name: string) {
    this.isNewFile.set(false);
    this.revokePdfUrl();
    this.selectedFile.set(name);
    this.saveStatus.set(null);
    this.content.set('');

    const file = this.files().find(f => f.name === name);
    if (file?.contentType === 'application/pdf') {
      this.loadingContent.set(true);
      this.docsService.getPdfBlob(name).subscribe({
        next: url => { this.pdfUrl.set(url); this.loadingContent.set(false); },
        error: ()  => this.loadingContent.set(false)
      });
    } else {
      this.loadingContent.set(true);
      this.docsService.getContent(name).subscribe({
        next: text => { this.content.set(text); this.loadingContent.set(false); },
        error: ()  => this.loadingContent.set(false)
      });
    }
  }

  startNewFile() {
    this.revokePdfUrl();
    this.selectedFile.set(null);
    this.isNewFile.set(true);
    this.content.set('');
    this.newFileName.set('');
    this.saveStatus.set(null);
  }

  save() {
    this.saveStatus.set(null);
    this.saving.set(true);

    const onDone = (err?: string) => {
      this.saving.set(false);
      if (err) {
        this.saveStatus.set(`Error: ${err}`);
      } else {
        this.saveStatus.set('Saved ✓');
        this.loadFiles();
      }
    };

    if (this.isNewFile()) {
      const name = this.newFileName().trim();
      if (!name) { this.saving.set(false); this.saveStatus.set('Error: filename is required.'); return; }
      this.docsService.createFile(name, this.content()).subscribe({
        next: () => {
          this.isNewFile.set(false);
          this.selectedFile.set(name);
          onDone();
        },
        error: e => onDone(e?.message ?? 'Save failed')
      });
    } else {
      const name = this.selectedFile();
      if (!name) return;
      this.docsService.saveContent(name, this.content()).subscribe({
        next: () => onDone(),
        error: e => onDone(e?.message ?? 'Save failed')
      });
    }
  }

  triggerUpload() {
    document.querySelector<HTMLInputElement>('input[type=file][accept=".pdf"]')?.click();
  }

  onPdfSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.docsService.uploadPdf(file.name, file).subscribe({
      next: () => {
        this.uploading.set(false);
        this.loadFiles();
      },
      error: () => this.uploading.set(false)
    });
    (event.target as HTMLInputElement).value = '';
  }

  private revokePdfUrl() {
    const url = this.pdfUrl();
    if (url) { URL.revokeObjectURL(url); this.pdfUrl.set(null); }
  }

  sync() {
    this.syncing.set(true);
    this.syncStatus.set(null);
    this.docsService.triggerSync().subscribe({
      next: () => { this.syncing.set(false); this.syncStatus.set('Sync started ✓'); },
      error: () => { this.syncing.set(false); this.syncStatus.set('Sync failed'); }
    });
  }

  deleteFile(name: string, event: Event) {
    event.stopPropagation();
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    this.docsService.deleteFile(name).subscribe({
      next: () => {
        if (this.selectedFile() === name) {
          this.selectedFile.set(null);
          this.content.set('');
        }
        this.loadFiles();
      }
    });
  }

  asInput(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
