import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { AuthResponse, RegisterRequest, User } from '../models/models';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = 'http://localhost:5230/api';
    private currentUserSubject = new BehaviorSubject<User | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();

    constructor(private http: HttpClient) {
        // Load user from localStorage on init
        const token = this.getToken();
        const userJson = localStorage.getItem('user');
        if (token && userJson) {
            this.currentUserSubject.next(JSON.parse(userJson));
        }
    }

    register(request: RegisterRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, request)
            .pipe(tap(response => this.handleAuth(response)));
    }

    login(email: string, password: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, { email, password })
            .pipe(tap(response => this.handleAuth(response)));
    }

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUserSubject.next(null);
    }

    getToken(): string | null {
        return localStorage.getItem('token');
    }

    isAuthenticated(): boolean {
        const token = this.getToken();
        if (!token) return false;

        try {
            // Decode the JWT payload (second segment, base64url encoded)
            const payloadBase64 = token.split('.')[1];
            const payload = JSON.parse(atob(payloadBase64));
            // `exp` is in seconds; Date.now() is in milliseconds
            return payload.exp * 1000 > Date.now();
        } catch {
            // Malformed token — treat as unauthenticated
            return false;
        }
    }

    get currentUserValue(): User | null {
        return this.currentUserSubject.value;
    }

    private handleAuth(response: AuthResponse): void {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        this.currentUserSubject.next(response.user);
    }
}
