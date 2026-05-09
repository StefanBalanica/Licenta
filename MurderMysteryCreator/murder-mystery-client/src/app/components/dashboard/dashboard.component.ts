import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameService } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';
import { GameSummary } from '../../models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="page">
      <canvas #bgCvs class="bg-canvas"></canvas>

      <!-- â”€â”€ NAVBAR â”€â”€ -->
      <nav class="navbar">
        <div class="nav-inner">
          <div class="nav-logo">
            <img src="assets/logo.svg" class="logo-img" alt="The Investigation" title="The Investigation"/>
          </div>
          <div class="nav-center">
            <span class="status-dot"></span>
            <span class="status-lbl">SISTEM ACTIV</span>
          </div>
          <div class="nav-right">
            <button class="btn-outline-amber" (click)="showStoryPanel = !showStoryPanel">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3"/><path d="M5.5 8h5M8 5.5v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
              AI Story
            </button>
            <!-- User Avatar Dropdown -->
            <div class="user-menu" (clickOutside)="menuOpen = false">
              <button class="user-avatar" (click)="menuOpen = !menuOpen" [class.avatar-open]="menuOpen" id="user-menu-btn">
                <span class="avatar-initials">{{ userInitials }}</span>
                <svg class="avatar-caret" width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 3.5l3 3 3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <div class="user-dropdown" *ngIf="menuOpen">
                <div class="dropdown-header">
                  <div class="dh-name">{{ userName }}</div>
                  <div class="dh-email">{{ userEmail }}</div>
                </div>
                <div class="dropdown-sep"></div>
                <button class="dropdown-item" (click)="goToProfile()">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="3" stroke="currentColor" stroke-width="1.2"/><path d="M2 15c0-2.7 2.7-4.5 6-4.5s6 1.8 6 4.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                  Profilul meu
                </button>
                <button class="dropdown-item" (click)="goToProfile()">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="2" y="6" width="12" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M5 6V4.5a3 3 0 1 1 6 0V6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                  Schimbă parola
                </button>
                <div class="dropdown-sep"></div>
                <button class="dropdown-item item-danger" (click)="logout()">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M10 2h3v12h-3M7 11l3-3-3-3M2 8h8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  Deconectare
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <!-- â”€â”€ MAIN â”€â”€ -->
      <main class="main-wrap" (scroll)="onScroll()">

        <!-- AI Story panel -->
        <div *ngIf="showStoryPanel" class="story-panel">
          <div class="panel-head">
            <div>
              <div class="eyebrow">ASISTENT IA</div>
              <h3 class="panel-title">Construiește dosar din naraȚiune</h3>
            </div>
            <button class="panel-close" (click)="showStoryPanel = false">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </div>
          <p class="panel-hint">Introdu relatarea cazului â€” AI-ul extrage automat personaje, dispozitive, conversaȚii și emailuri.</p>
          <textarea [(ngModel)]="storyText" class="story-area"
            placeholder="Ex: Titlu: Crima din vilă. Personaje: Maria (soȚia, motiv moștenire), Ion (majordomul). Dispozitive: Maria are un iPhone cu emailuri, note și conversaȚii cu Dr. Ionescu..."
            rows="8"></textarea>
          <div *ngIf="generating" class="progress-wrap">
            <div class="progress-header">
              <span>Se analizează povestea și se extrag dispozitivele...</span>
              <span class="progress-pct">{{ progressPct }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="progressPct"></div>
            </div>
          </div>
          <div class="panel-foot" *ngIf="!generating">
            <button class="btn-ghost" (click)="showStoryPanel = false">Anulează</button>
            <button class="btn-primary" (click)="generateFromStory()" [disabled]="!storyText.trim()">
              <span>Deschide dosar</span>
            </button>
          </div>
          <p *ngIf="storyError" class="story-err">{{ storyError }}</p>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="center-state">
          <div class="loader"></div>
          <p class="meta-lbl">SE ÎNCARCĂ DOSARELEâ€¦</p>
        </div>

        <!-- Empty -->
        <div *ngIf="!loading && games.length === 0" class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 80 80" fill="none">
              <rect x="10" y="10" width="60" height="68" rx="4" stroke="#b87208" stroke-width="1.5" fill="rgba(184,114,8,0.04)"/>
              <path d="M10 20 H70" stroke="#b87208" stroke-width="1" opacity="0.4"/>
              <rect x="10" y="10" width="24" height="12" rx="3" fill="rgba(184,114,8,0.1)" stroke="#b87208" stroke-width="1" opacity="0.6"/>
              <path d="M20 36 h40 M20 46 h40 M20 56 h26" stroke="#b87208" stroke-width="1" stroke-linecap="round" opacity="0.3"/>
            </svg>
          </div>
          <h2 class="empty-title">Niciun dosar deschis</h2>
          <p class="empty-sub">Creează primul caz sau importă o naraȚiune prin AI.</p>
          <div class="empty-acts">
            <button class="btn-primary" (click)="createGame()">Dosar nou</button>
            <button class="btn-outline-amber" (click)="showStoryPanel = true">AI Story</button>
          </div>
        </div>

        <!-- Games board -->
        <div *ngIf="!loading && games.length > 0">
          <div class="page-header">
            <div class="ph-left">
              <div class="eyebrow">DOSARE ACTIVE</div>
              <h1 class="display-title">Cazurile tale <span class="count-badge">{{ games.length }}</span></h1>
            </div>
            <div class="ph-right">
              <button class="btn-outline-amber" (click)="showStoryPanel = true">AI Story</button>
              <button class="btn-primary" (click)="createGame()">+ Dosar nou</button>
            </div>
          </div>

          <div class="games-grid">
            <div *ngFor="let game of games; let i = index"
                 class="case-card"
                 [style.animation-delay]="(0.06 + i * 0.05) + 's'"
                 (click)="editGame(game.gameId)">
              <div class="card-top-line"></div>
              <div class="card-pin"></div>
              <div class="watermark">{{ (i+1).toString().padStart(4,'0') }}</div>

              <div class="case-id">DOSAR #{{ (i+1).toString().padStart(4,'0') }}</div>
              <div class="card-status">
                <span class="status-pip" [class.pip-green]="game.isPublished" [class.pip-amber]="!game.isPublished"></span>
                {{ game.isPublished ? 'PUBLICAT' : 'ACTIV' }}
              </div>
              <h3 class="card-title">{{ game.title }}</h3>
              <p class="card-desc">{{ game.description || 'Nicio descriere disponibilă.' }}</p>

              <div class="sep"></div>

              <div class="card-stats">
                <div class="stat">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="3" stroke="currentColor" stroke-width="1.3"/><path d="M2 15c0-2.7 2.7-4.5 6-4.5s6 1.8 6 4.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                  {{ game.characterCount }}<span class="stat-lbl">SUSP.</span>
                </div>
                <div class="stat">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 6h6M5 9h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                  {{ game.evidenceCount }}<span class="stat-lbl">DOV.</span>
                </div>
                <div class="stat">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><rect x="3" y="1" width="10" height="14" rx="2" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="11" r="1" fill="currentColor"/></svg>
                  {{ game.deviceCount }}<span class="stat-lbl">DISÐŸ.</span>
                </div>
              </div>

              <div class="card-footer">
                <span class="card-date">{{ formatDate(game.updatedAt) }}</span>
                <div class="card-acts">
                  <button class="act-btn" (click)="editGame(game.gameId); $event.stopPropagation()" title="Editează">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-9 9H2v-3L11 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
                  </button>
                  <button class="act-btn act-del" (click)="deleteGame(game.gameId); $event.stopPropagation()" title="È˜terge">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5 4V3h6v1M3 4l1 9h8l1-9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  `,
  styles: [`
    :host{display:block}*{box-sizing:border-box;margin:0;padding:0}

    /* â”€â”€ Variables â”€â”€ */
    .page{
      --bg:#f5f2ec;--surface:#fff;--border:rgba(0,0,0,0.07);--border-md:rgba(0,0,0,0.11);
      --amber:#b87208;--amber-l:rgba(184,114,8,0.08);--gold:#c9962a;
      --navy:#1c2b4a;--navy-l:rgba(28,43,74,0.06);
      --ink:#1a1610;--ink2:rgba(26,22,16,0.62);--ink3:rgba(26,22,16,0.40);
      --green:#4a7a56;--red:#9b2020;
      min-height:100vh;background:var(--bg);position:relative;font-family:'Inter',sans-serif;color:var(--ink);
    }

    /* â”€â”€ Canvas â”€â”€ */
    .bg-canvas{position:fixed;inset:0;z-index:0;pointer-events:none;}

    /* â”€â”€ Navbar â”€â”€ */
    .navbar{
      position:sticky;top:0;z-index:100;height:54px;
      background:rgba(245,242,236,0.82);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
      border-bottom:1px solid var(--border-md);
    }
    .nav-inner{max-width:1280px;margin:0 auto;padding:0 24px;height:100%;display:flex;align-items:center;gap:20px;position:relative;z-index:1;}
    .nav-logo{display:flex;align-items:center;}
    .logo-img{height:42px;width:auto;display:block;}
    .nav-center{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;}
    .status-dot{width:5px;height:5px;border-radius:50%;background:var(--green);box-shadow:0 0 6px var(--green);animation:blink 3s ease-in-out infinite;}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}
    .status-lbl{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:2px;text-transform:uppercase;color:var(--ink3);}
    .nav-right{display:flex;align-items:center;gap:8px;}

    /* â”€â”€ User dropdown â”€â”€ */
    .user-menu{position:relative;}
    .user-avatar{display:flex;align-items:center;gap:6px;height:34px;padding:0 10px 0 6px;border:1px solid var(--border-md);border-radius:20px;background:transparent;cursor:pointer;transition:border-color .2s,background .2s;}
    .user-avatar:hover,.avatar-open{background:rgba(28,43,74,0.05);border-color:rgba(28,43,74,0.2);}
    .avatar-initials{width:22px;height:22px;border-radius:50%;background:var(--navy);color:#fff;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;letter-spacing:0.5px;}
    .avatar-caret{color:var(--ink3);transition:transform .2s;}
    .avatar-open .avatar-caret{transform:rotate(180deg);}
    .user-dropdown{position:absolute;top:calc(100% + 8px);right:0;width:220px;background:#fff;border:1px solid var(--border-md);border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.06);z-index:500;overflow:hidden;animation:ddIn .15s ease both;}
    @keyframes ddIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
    .dropdown-header{padding:12px 14px 10px;}
    .dh-name{font-size:13px;font-weight:600;color:var(--ink);margin-bottom:2px;}
    .dh-email{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .dropdown-sep{height:1px;background:var(--border);margin:2px 0;}
    .dropdown-item{width:100%;display:flex;align-items:center;gap:9px;padding:9px 14px;background:transparent;border:none;text-align:left;font-size:13px;font-family:'Inter',sans-serif;color:var(--ink);cursor:pointer;transition:background .15s;}
    .dropdown-item:hover{background:rgba(0,0,0,0.04);}
    .dropdown-item svg{color:var(--ink3);flex-shrink:0;}
    .item-danger{color:var(--red);}
    .item-danger svg{color:var(--red);}
    .item-danger:hover{background:rgba(155,32,32,0.05);}

    /* â”€â”€ Buttons â”€â”€ */
    .btn-ghost{display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 12px;border:1px solid var(--border-md);border-radius:7px;background:transparent;color:var(--ink);font-size:12.5px;font-weight:500;font-family:'Inter',sans-serif;cursor:pointer;transition:border-color .2s,color .2s;}
    .btn-ghost:hover{border-color:rgba(0,0,0,0.25);color:var(--ink);}
    .btn-ghost:disabled{opacity:.4;cursor:not-allowed;}
    .btn-ghost svg{flex-shrink:0;}
    .btn-outline-amber{display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 13px;border:1px solid rgba(184,114,8,0.45);border-radius:7px;background:transparent;color:var(--amber);font-size:12.5px;font-weight:600;font-family:'Inter',sans-serif;cursor:pointer;transition:background .2s,border-color .2s;}
    .btn-outline-amber:hover{background:var(--amber-l);border-color:rgba(184,114,8,0.65);}
    .btn-outline-amber svg{flex-shrink:0;}
    .btn-primary{display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 15px;border:none;border-radius:7px;background:var(--navy);color:#fff;font-size:12.5px;font-family:'Inter',sans-serif;font-weight:600;cursor:pointer;transition:opacity .2s,transform .2s;}
    .btn-primary:hover:not(:disabled){opacity:.88;transform:translateY(-1px);}
    .btn-primary:disabled{opacity:.4;cursor:not-allowed;}

    /* â”€â”€ Main â”€â”€ */
    .main-wrap{max-width:1280px;margin:0 auto;padding:36px 24px;position:relative;z-index:1;}

    /* â”€â”€ Story panel â”€â”€ */
    .story-panel{background:var(--surface);border:1px solid var(--border-md);border-radius:12px;padding:28px;margin-bottom:36px;box-shadow:0 4px 24px rgba(0,0,0,0.07);}
    .panel-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;}
    .panel-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:600;color:var(--ink);}
    .panel-close{width:28px;height:28px;border:1px solid var(--border-md);border-radius:6px;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--ink2);transition:background .15s;}
    .panel-close:hover{background:rgba(0,0,0,0.04);}
    .panel-hint{font-size:13px;color:var(--ink2);margin-bottom:16px;font-style:italic;line-height:1.6;}
    .story-area{width:100%;padding:12px 14px;border:1px solid var(--border-md);border-radius:8px;font-size:13.5px;font-family:'Inter',sans-serif;color:var(--ink);background:var(--bg);resize:vertical;outline:none;line-height:1.65;margin-bottom:16px;transition:border-color .2s;}
    .story-area::placeholder{color:var(--ink3);font-style:italic;}
    .story-area:focus{border-color:rgba(184,114,8,0.45);}
    .panel-foot{display:flex;gap:10px;align-items:center;}
    .story-err{margin-top:12px;font-size:12.5px;color:var(--red);font-family:'JetBrains Mono',monospace;}
    .progress-wrap{margin-bottom:16px;}
    .progress-header{display:flex;justify-content:space-between;font-size:12.5px;color:var(--ink2);margin-bottom:8px;font-weight:600;font-family:'Inter',sans-serif;}
    .progress-bar{width:100%;height:6px;background:var(--border-md);border-radius:3px;overflow:hidden;}
    .progress-fill{height:100%;background:var(--amber);border-radius:3px;transition:width 0.4s ease-out;}

    /* â”€â”€ Status states â”€â”€ */
    .center-state{display:flex;flex-direction:column;align-items:center;padding:80px 20px;gap:14px;}
    .loader{width:36px;height:36px;border:2px solid rgba(184,114,8,0.15);border-top-color:var(--amber);border-radius:50%;animation:spin .8s linear infinite;}
    .meta-lbl{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--ink3);}
    .empty-state{display:flex;flex-direction:column;align-items:center;padding:80px 20px;gap:12px;text-align:center;}
    .empty-icon{margin-bottom:8px;}
    .empty-icon svg{width:72px;height:72px;}
    .empty-title{font-family:'Playfair Display',serif;font-size:26px;font-weight:400;color:var(--ink);}
    .empty-sub{font-size:14px;color:var(--ink2);font-style:italic;}
    .empty-acts{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:8px;}

    /* â”€â”€ Page header â”€â”€ */
    .page-header{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:28px;animation:fadeUp .5s ease both;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    .eyebrow{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--amber);margin-bottom:6px;font-weight:600;}
    .display-title{font-family:'Playfair Display',serif;font-size:32px;font-weight:700;color:var(--ink);display:flex;align-items:center;gap:10px;}
    .count-badge{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border:1px solid rgba(184,114,8,0.4);border-radius:50%;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:var(--amber);}
    .ph-right{display:flex;gap:8px;}

    /* â”€â”€ Grid â”€â”€ */
    .games-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}

    /* â”€â”€ Card â”€â”€ */
    .case-card{
      position:relative;background:var(--surface);border:1px solid var(--border);border-radius:12px;
      padding:22px 20px 18px;overflow:hidden;cursor:pointer;
      transition:box-shadow .25s ease,border-color .25s ease,transform .25s ease;
      animation:fadeUp .5s ease both;
    }
    .case-card:hover{
      transform:translateY(-2px);
      box-shadow:0 2px 8px rgba(0,0,0,0.05),0 10px 32px rgba(0,0,0,0.08),0 0 0 1px rgba(155,32,32,0.08);
      border-color:rgba(155,32,32,0.20);
    }
    .card-top-line{
      position:absolute;top:0;left:0;right:0;height:2px;
      background:linear-gradient(90deg,transparent,rgba(155,32,32,0.5),transparent);
      opacity:0;transition:opacity .25s;
    }
    .case-card:hover .card-top-line{opacity:1;}
    .card-pin{
      position:absolute;top:-1px;left:22px;width:6px;height:6px;border-radius:50%;
      background:var(--red);box-shadow:0 0 6px rgba(155,32,32,0.5);
      opacity:0;transform:scale(0);transition:opacity .25s,transform .25s;
    }
    .case-card:hover .card-pin{opacity:1;transform:scale(1);}
    .watermark{
      position:absolute;bottom:12px;right:16px;
      font-family:'Playfair Display',serif;font-style:italic;font-size:52px;font-weight:400;
      color:rgba(28,43,74,0.028);line-height:1;pointer-events:none;
      transition:color .25s;
    }
    .case-card:hover .watermark{color:rgba(28,43,74,0.055);}

    /* Card anatomy */
    .case-id{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--ink3);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;font-weight:500;}
    .card-status{display:flex;align-items:center;gap:5px;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:600;text-transform:uppercase;color:var(--green);margin-bottom:12px;}
    .status-pip{width:4px;height:4px;border-radius:50%;animation:blink 2.5s ease-in-out infinite;}
    .pip-green{background:var(--green);}
    .pip-amber{background:var(--amber);animation:blink 2.5s ease-in-out infinite;}
    .card-title{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:var(--ink);margin-bottom:7px;transition:color .2s;line-height:1.3;}
    .case-card:hover .card-title{color:var(--navy);}
    .card-desc{font-family:'Inter',sans-serif;font-size:12.5px;font-style:italic;color:var(--ink2);line-height:1.6;margin-bottom:14px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
    .sep{height:1px;background:var(--border);margin-bottom:12px;}
    .card-stats{display:flex;gap:14px;margin-bottom:12px;}
    .stat{display:flex;align-items:center;gap:4px;font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:500;color:var(--ink2);}
    .stat svg{color:var(--ink3);}
    .stat-lbl{color:var(--ink3);margin-left:2px;font-weight:600;letter-spacing:0.5px;}
    .card-footer{display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid var(--border);}
    .card-date{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:500;color:var(--ink3);}
    .card-acts{display:flex;gap:5px;}
    .act-btn{
      width:26px;height:26px;display:flex;align-items:center;justify-content:center;
      border:1px solid var(--ink3);border-radius:6px;background:transparent;cursor:pointer;
      color:var(--ink2);
      opacity:0;transform:translateX(4px);
      transition:opacity .2s,transform .2s,background .15s,border-color .15s,color .15s;
    }
    .case-card:hover .act-btn{opacity:1;transform:translateX(0);}
    .act-btn:hover{background:var(--navy-l);border-color:var(--navy);color:var(--navy);}
    .act-del:hover{background:rgba(155,32,32,0.06);border-color:var(--red);color:var(--red);}

    /* â”€â”€ Responsive â”€â”€ */
    @media(max-width:900px){.games-grid{grid-template-columns:repeat(2,1fr);}}
    @media(max-width:580px){.games-grid{grid-template-columns:1fr;}.page-header{flex-direction:column;align-items:flex-start;gap:12px;}}
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('bgCvs') canvasRef!: ElementRef<HTMLCanvasElement>;
  games: GameSummary[] = [];
  loading = true;
  userEmail = '';
  userName = '';
  userInitials = '';
  menuOpen = false;
  showStoryPanel = false;
  storyText = '';
  generating = false;
  storyError = '';
  progressPct = 0;
  progressInterval: any;

  private cleanup?: () => void;

  constructor(private gameService: GameService, private authService: AuthService, private router: Router) {
    const user = this.authService.currentUserValue;
    this.userEmail = user?.email || '';
    const first = (user as any)?.firstName || '';
    const last  = (user as any)?.lastName  || '';
    this.userName = `${first} ${last}`.trim() || this.userEmail;
    const initials = (first[0] || '') + (last[0] || '');
    this.userInitials = initials.toUpperCase() || this.userEmail.substring(0, 2).toUpperCase();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu')) {
      this.menuOpen = false;
    }
  }

  ngOnInit() { this.loadGames(); }

  ngAfterViewInit() {
    this.cleanup = this.initCanvas(this.canvasRef.nativeElement, true);
  }

  ngOnDestroy() { this.cleanup?.(); }

  onScroll() { /* triggers getBoundingClientRect re-read in canvas loop */ }

  loadGames() {
    this.loading = true;
    this.gameService.getGames().subscribe({
      next: (games) => { this.games = games; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  createGame() { this.router.navigate(['/games/new']); }

  generateFromStory() {
    const story = this.storyText?.trim();
    if (!story || this.generating) return;
    
    this.generating = true; 
    this.storyError = '';
    this.progressPct = 0;
    
    // AnimaȚie fluidă pentru progress bar până pe la 96%
    this.progressInterval = setInterval(() => {
      if (this.progressPct < 96) {
        const step = Math.max(1, Math.floor((96 - this.progressPct) / 10));
        this.progressPct += step;
      }
    }, 450);

    this.gameService.createGameFromStory(story).subscribe({
      next: (game) => {
        clearInterval(this.progressInterval);
        this.progressPct = 100;
        
        // Timeout mic ca userul să vadă că a ajuns la 100% înainte de a se muta pagina
        setTimeout(() => {
          this.generating = false; 
          this.showStoryPanel = false; 
          this.storyText = '';
          this.games = [...this.games, { gameId: game.gameId, title: game.title, description: game.description, isPublished: game.isPublished, createdAt: game.createdAt, updatedAt: game.updatedAt, characterCount: game.characterCount, evidenceCount: game.evidenceCount, deviceCount: game.deviceCount }];
          this.router.navigate(['/games', game.gameId]);
        }, 600);
      },
      error: (err) => {
        clearInterval(this.progressInterval);
        this.generating = false;
        this.progressPct = 0;
        this.storyError = err.error?.message || 'Eroare la generare â€” verifică cheia API.';
      }
    });
  }

  editGame(gameId: number) { this.router.navigate(['/games', gameId]); }

  goToProfile() { this.menuOpen = false; this.router.navigate(['/profile']); }

  deleteGame(gameId: number) {
    if (confirm('Confirmi închiderea dosarului? AcȚiunea este ireversibilă.')) {
      this.gameService.deleteGame(gameId).subscribe({
        next: () => { this.games = this.games.filter(g => g.gameId !== gameId); },
        error: () => { alert('È˜tergerea a eșuat'); }
      });
    }
  }

  logout() { this.authService.logout(); this.router.navigate(['/login']); }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const d = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (d === 0) return 'astăzi';
    if (d === 1) return 'ieri';
    if (d < 7) return `acum ${d} zile`;
    return date.toLocaleDateString('ro-RO');
  }

  private initCanvas(cv: HTMLCanvasElement, withWires: boolean): () => void {
    const ctx = cv.getContext('2d')!;
    let W = 0, H = 0;
    const rs = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; };
    rs();
    addEventListener('resize', rs);
    const r = Math.random;
    const ep = () => r() < 0.5 ? r() * 0.22 : 0.78 + r() * 0.22;
    // [bx,by,speed,phase,amp,type(0=case,1=ev,2=susp),r0,pp]
    const ns: number[][] = [];
    for (let i = 0; i < 4; i++) ns.push([ep(), ep(), 0.00022 + r() * 0.00012, r() * 6.28, 24 + r() * 14, 0, 6, r() * 6.28]);
    for (let i = 0; i < 10; i++) ns.push([r() < 0.6 ? ep() : r(), ep(), 0.00018 + r() * 0.0001, r() * 6.28, 18 + r() * 20, 1, 3 + r() * 0.5, r() * 6.28]);
    for (let i = 0; i < 8; i++) ns.push([ep(), r() < 0.6 ? ep() : r(), 0.00015 + r() * 0.0001, r() * 6.28, 18 + r() * 16, 2, 2.5, r() * 6.28]);

    interface E { a: number; b: number; k: number; }
    const es: E[] = [];
    for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++)
      if (Math.hypot(ns[i][0] - ns[j][0], ns[i][1] - ns[j][1]) < 0.38 && r() < 0.55)
        es.push({ a: i, b: j, k: r() < 0.5 ? 0 : r() < 0.7 ? 1 : 2 });

    let rid: number;
    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      const px = ns.map(n => [n[0] * W + Math.sin(t * n[2] + n[3]) * n[4], n[1] * H + Math.cos(t * n[2] * 0.7 + n[3] + 1) * n[4] * 0.6]);
      // Edges
      for (const e of es) {
        const [ax, ay] = px[e.a], [bx, by] = px[e.b];
        const mx = (ax + bx) / 2 + Math.sin(t * 0.0002 + e.a + e.b) * 14;
        const my = (ay + by) / 2 + Math.cos(t * 0.00018 + e.a) * 10;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by);
        if (e.k === 0) { ctx.strokeStyle = 'rgba(155,32,32,0.08)'; ctx.lineWidth = 0.75; ctx.setLineDash([]); }
        else if (e.k === 1) { ctx.strokeStyle = 'rgba(155,32,32,0.06)'; ctx.lineWidth = 0.65; ctx.setLineDash([4, 10]); ctx.lineDashOffset = -(t * 0.012); }
        else { const a = 0.07 + 0.09 * Math.sin(t * 0.0003 + e.a); ctx.strokeStyle = `rgba(155,32,32,${a.toFixed(3)})`; ctx.lineWidth = 0.9; ctx.setLineDash([]); }
        ctx.stroke();
      }
      ctx.setLineDash([]);
      // Nodes
      for (let i = 0; i < ns.length; i++) {
        const n = ns[i], [px_, py_] = px[i];
        if (n[5] === 0) {
          ctx.beginPath(); ctx.arc(px_, py_, n[6] + 4, 0, 6.28); ctx.strokeStyle = 'rgba(28,43,74,0.15)'; ctx.lineWidth = 0.8; ctx.stroke();
          ctx.beginPath(); ctx.arc(px_, py_, n[6], 0, 6.28); ctx.fillStyle = 'rgba(28,43,74,0.18)'; ctx.fill();
        } else if (n[5] === 1) {
          const pr = n[6] + 0.5 * Math.sin(t * 0.0006 + n[7]);
          ctx.beginPath(); ctx.arc(px_, py_, pr, 0, 6.28); ctx.fillStyle = 'rgba(155,32,32,0.12)'; ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(px_, py_, n[6], 0, 6.28); ctx.fillStyle = 'rgba(155,32,32,0.10)'; ctx.fill();
        }
      }
      // Card wires
      if (withWires) {
        document.querySelectorAll('.case-card').forEach((el, ci) => {
          const rc = el.getBoundingClientRect();
          const cx = rc.left + rc.width / 2, cy = rc.top;
          const ni = ci % ns.length, np = px[ni];
          const a = 0.045 + 0.055 * Math.sin(t * 0.0005 + ci * 0.9);
          ctx.beginPath(); ctx.moveTo(np[0], np[1]);
          ctx.quadraticCurveTo((np[0] + cx) / 2 + Math.sin(t * 0.0003 + ci) * 20, (np[1] + cy) / 2 - 30, cx, cy);
          ctx.strokeStyle = `rgba(155,32,32,${a.toFixed(3)})`; ctx.lineWidth = 0.8; ctx.setLineDash([3, 9]); ctx.lineDashOffset = -(t * 0.008 + ci * 2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.beginPath(); ctx.arc(np[0], np[1], 2.5, 0, 6.28); ctx.fillStyle = `rgba(155,32,32,${a.toFixed(3)})`; ctx.fill();
        });
      }
      // Vignette
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.1, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0.2, 'transparent'); vg.addColorStop(0.62, 'rgba(245,242,236,0.50)'); vg.addColorStop(1, 'rgba(245,242,236,0.90)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      rid = requestAnimationFrame(draw);
    };
    rid = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rid); removeEventListener('resize', rs); };
  }
}


