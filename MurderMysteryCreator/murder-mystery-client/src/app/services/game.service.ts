import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Game, GameSummary } from '../models/models';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class GameService {
    private apiUrl = `${environment.apiUrl}/api/games`;

    constructor(private http: HttpClient) { }

    getGames(): Observable<GameSummary[]> {
        return this.http.get<GameSummary[]>(this.apiUrl);
    }

    getGame(id: number): Observable<Game> {
        return this.http.get<Game>(`${this.apiUrl}/${id}`);
    }

    createGame(game: Partial<Game>): Observable<Game> {
        return this.http.post<Game>(this.apiUrl, game);
    }

    updateGame(id: number, game: Partial<Game>): Observable<Game> {
        return this.http.put<Game>(`${this.apiUrl}/${id}`, game);
    }

    deleteGame(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    publishGame(id: number): Observable<Game> {
        return this.http.post<Game>(`${this.apiUrl}/${id}/publish`, {});
    }

    /** Generate full game from story using AI (Gemini). Free API key: https://aistudio.google.com/apikey */
    createGameFromStory(story: string): Observable<Game> {
        return this.http.post<Game>(`${this.apiUrl}/from-story`, { story });
    }
}
