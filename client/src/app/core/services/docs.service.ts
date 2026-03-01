import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DocFile } from '../models/docs.model';

@Injectable({ providedIn: 'root' })
export class DocsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.chatServer}/api/docs`;

  listFiles(): Observable<DocFile[]> {
    return this.http.get<DocFile[]>(this.base);
  }

  getContent(name: string): Observable<string> {
    return this.http.get(`${this.base}/content`, {
      params: { name },
      responseType: 'text'
    });
  }

  saveContent(name: string, content: string): Observable<void> {
    return this.http.put<void>(`${this.base}/content`, { content }, {
      params: { name }
    });
  }

  createFile(name: string, content: string): Observable<void> {
    return this.http.post<void>(this.base, { content }, {
      params: { name }
    });
  }

  deleteFile(name: string): Observable<void> {
    return this.http.delete<void>(this.base, {
      params: { name }
    });
  }

  triggerSync(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/sync`, {});
  }
}
