import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatHistoryEntry {
    role: 'user' | 'assistant';
    content: string;
}

export interface ChatMessageRequest {
    message: string;
    conversationHistory: ChatHistoryEntry[];
}

export interface ChatMessageResponse {
    reply: string;
}

@Injectable({
    providedIn: 'root'
})
export class ChatbotService {
    private readonly apiBase = 'http://localhost:5230/api/chatbot';

    constructor(private http: HttpClient) { }

    sendMessage(gameId: number, request: ChatMessageRequest): Observable<ChatMessageResponse> {
        return this.http.post<ChatMessageResponse>(
            `${this.apiBase}/${gameId}/message`,
            request
        );
    }
}
