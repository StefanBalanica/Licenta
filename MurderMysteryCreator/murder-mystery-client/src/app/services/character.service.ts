import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Character } from '../models/models';

@Injectable({
    providedIn: 'root'
})
export class CharacterService {
    private apiUrl = 'http://localhost:5230/api/games';

    constructor(private http: HttpClient) { }

    getCharacters(gameId: number): Observable<Character[]> {
        return this.http.get<Character[]>(`${this.apiUrl}/${gameId}/characters`);
    }

    getCharacter(gameId: number, characterId: number): Observable<Character> {
        return this.http.get<Character>(`${this.apiUrl}/${gameId}/characters/${characterId}`);
    }

    createCharacter(gameId: number, character: Partial<Character>): Observable<Character> {
        return this.http.post<Character>(`${this.apiUrl}/${gameId}/characters`, character);
    }

    updateCharacter(gameId: number, characterId: number, character: Partial<Character>): Observable<Character> {
        return this.http.put<Character>(`${this.apiUrl}/${gameId}/characters/${characterId}`, character);
    }

    deleteCharacter(gameId: number, characterId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${gameId}/characters/${characterId}`);
    }
}
