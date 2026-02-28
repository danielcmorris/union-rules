import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatRequest, ChatResponse, VertexAiRequest, VertexAiResponse } from '../models/chat.model';

const MOCK_RESPONSES: string[] = [
  'Standard Time covers hours worked between 6:00 AM and 2:00 PM on regular weekdays. If a 30-minute lunch break is taken, the window extends to 2:30 PM, though the lunch itself is unpaid.',
  'Premium Time applies to any hours outside the Standard Time Window, or when the employee has not had an 8-hour rest period between timesheets.',
  'A missed meal is owed when an employee on a planned shift works more than 10.5 hours, or on an emergency callout works more than 4.5 hours. Each missed meal costs the employer $15 plus 30 minutes of pay.',
  'Subsistence is a flat $50 payment per timesheet, regardless of how many jobs are on it. Only one subsistence is paid per TimeSheet ID.',
];

let mockIndex = 0;

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly useMock = false;

  ask(request: ChatRequest): Observable<ChatResponse> {
    if (this.useMock) {
      const answer = MOCK_RESPONSES[mockIndex % MOCK_RESPONSES.length];
      mockIndex++;
      return of({ answer }).pipe(delay(1200));
    }
    return this.http.post<ChatResponse>(
      `${environment.chatServer}/api/chat/explain`,
      request
    );
  }

  searchVertexAi(request: VertexAiRequest): Observable<VertexAiResponse> {
    return this.http.post<VertexAiResponse>(
      `${environment.chatServer}/api/vertexai/search`,
      request
    );
  }
}
