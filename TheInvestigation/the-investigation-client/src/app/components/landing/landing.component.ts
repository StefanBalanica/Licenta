import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

const API_BASE = 'https://murdermystery-api.onrender.com/api';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit, OnDestroy {
  userCount: number | string = '—';
  gameCount: number | string = '—';
  games: any[] = [];
  gamesLoading = true;
  gamesError = false;

  private statsInterval: any;

  ngOnInit() {
    this.fetchStats();
    this.fetchPublicGames();
    this.statsInterval = setInterval(() => this.fetchStats(), 30000);
  }

  ngOnDestroy() {
    if (this.statsInterval) clearInterval(this.statsInterval);
  }

  async fetchStats() {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (!res.ok) return;
      const data = await res.json();
      this.userCount = data.userCount ?? '—';
      this.gameCount = data.gameCount ?? '—';
    } catch {
      // keep dashes on error
    }
  }

  async fetchPublicGames() {
    this.gamesLoading = true;
    this.gamesError = false;
    try {
      const res = await fetch(`${API_BASE}/stats/public-games`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      this.games = data || [];
    } catch {
      this.gamesError = true;
    } finally {
      this.gamesLoading = false;
    }
  }

  truncate(text: string, max = 100): string {
    if (!text) return 'Dosar de anchetă creat de un student. Imprimabil, gata de jucat.';
    return text.length > max ? text.slice(0, max) + '...' : text;
  }

  formatPriceRon(value: number | null | undefined): string {
    if (value === null || value === undefined) return '';
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  }

  scrollTo(id: string, event: Event) {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
