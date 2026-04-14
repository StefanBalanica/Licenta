import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { GameService } from '../../services/game.service';
import { CharacterService } from '../../services/character.service';
import { DeviceService } from '../../services/device.service';
import { Game, Character, DigitalDevice } from '../../models/models';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { createDeviceSlug } from '../../utils/slug.util';

interface UploadTarget {
  appId: number;
  appType: 'Photos' | 'Files';
  fileName: string;
  allowedTypes: string;
  sizeHint: string;
}

@Component({
  selector: 'app-game-details',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="details-container">
      <canvas #bgCvs class="bg-canvas"></canvas>
      <!-- Navbar -->
      <nav class="nb">
        <div class="nb-inner">
          <button class="btn-back" routerLink="/dashboard">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Dashboard
          </button>
          <div class="nb-title-wrap">
            <span class="nb-case">{{  game ? 'DOSAR — ' + game.title : 'DETALII DOSAR' }}</span>
            <span class="nb-badge" [class.badge-pub]="game?.isPublished" [class.badge-draft]="!game?.isPublished">
              {{ game?.isPublished ? 'PUBLICAT' : 'DRAFT' }}
            </span>
          </div>
          <button class="btn-edit" [routerLink]="['/games', gameId, 'edit']">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-9 9H2v-3L11 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
            Editează
          </button>
        </div>
      </nav>

      <!-- Tabs -->
      <div class="tabs-bar">
        <div class="tabs-inner">
          <button class="tab-pill" [class.tab-active]="activeTab === 'overview'" (click)="activeTab = 'overview'">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M5 6h6M5 9h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
            Prezentare
          </button>
          <button class="tab-pill" [class.tab-active]="activeTab === 'characters'" (click)="activeTab = 'characters'">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="3" stroke="currentColor" stroke-width="1.3"/><path d="M2 15c0-2.7 2.7-4.5 6-4.5s6 1.8 6 4.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
            Personaje <span class="tab-count">{{ characters.length }}</span>
          </button>
          <button class="tab-pill" [class.tab-active]="activeTab === 'devices'" (click)="activeTab = 'devices'">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><rect x="3" y="1" width="10" height="14" rx="2" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="11" r="1" fill="currentColor"/></svg>
            Dispozitive <span class="tab-count">{{ suspectDevices.length }}</span>
          </button>
          <button class="tab-pill tab-pill-special" [class.tab-active]="activeTab === 'investigator'" (click)="activeTab = 'investigator'">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="3" stroke="currentColor" stroke-width="1.3"/><path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M12 2l1.5 1.5L11 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Dispozitivele Anchetatorului <span class="tab-count tab-count-inv">{{ investigatorDevices.length }}</span>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="details-content">
        <!-- Overview Tab -->
        <div *ngIf="activeTab === 'overview'" class="tab-content">
          <div class="ov-card">
            <div class="ov-card-top"></div>
            <div class="ov-label">NARAȚIUNEA CAZULUI</div>
            <h3 class="ov-title">Povestea</h3>
            <p class="ov-body">{{ game?.story }}</p>
          </div>
          <div class="ov-card ov-solution">
            <div class="ov-card-top"></div>
            <div class="solution-badge-sm">GAME MASTER</div>
            <div class="ov-label">SOLUȚIA</div>
            <h3 class="ov-title">Rezolvarea cazului</h3>
            <p class="ov-body">{{ game?.solution }}</p>
          </div>
        </div>

        <!-- Characters Tab -->
        <div *ngIf="activeTab === 'characters'" class="tab-content">
          <div class="sec-head">
            <div>
              <div class="eyebrow">DOSARUL CAZULUI</div>
              <h2 class="sec-title">Personaje &amp; Suspecți</h2>
            </div>
            <button class="btn-primary" (click)="showCharacterForm = true" *ngIf="!showCharacterForm">
              + Personaj nou
            </button>
          </div>

          <!-- Add Character Form -->
          <div *ngIf="showCharacterForm" class="character-form">
            <h3>{{ editingCharacter ? 'Edit Character' : 'New Character' }}</h3>
            <form [formGroup]="characterForm">
              <div class="form-row">
                <div class="form-group">
                  <label>Name *</label>
                  <input type="text" formControlName="name" placeholder="James Morrison">
                </div>
                <div class="form-group">
                  <label>Role *</label>
                  <select formControlName="role">
                    <option value="Victim">Victim</option>
                    <option value="Suspect">Suspect</option>
                    <option value="Witness">Witness</option>
                    <option value="Investigator">Investigator</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Description</label>
                <textarea formControlName="description" rows="2" placeholder="Physical appearance and personality..."></textarea>
              </div>

              <div class="form-group">
                <label>Backstory</label>
                <textarea formControlName="backstory" rows="3" placeholder="Their history and relationship to the victim..."></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Motive</label>
                  <textarea formControlName="motive" rows="2" placeholder="Why they might have done it..."></textarea>
                </div>
                <div class="form-group">
                  <label>Alibi</label>
                  <textarea formControlName="alibi" rows="2" placeholder="Where they claim to have been..."></textarea>
                </div>
              </div>

              <div class="form-actions">
                <button type="button" class="btn-secondary" (click)="cancelCharacterForm()">Cancel</button>
                <button type="button" class="btn-primary" (click)="saveCharacter()" [disabled]="characterForm.invalid">
                  {{ editingCharacter ? 'Update' : 'Add' }} Character
                </button>
              </div>
            </form>
          </div>

          <!-- Characters List -->
          <div class="characters-grid">
            <div *ngFor="let character of characters" class="character-card">
              <div class="character-header">
                <h3>{{ character.name }}</h3>
                <span class="character-role">{{ character.role }}</span>
              </div>
              <p class="character-description">{{ character.description }}</p>
              <div class="character-details">
                <div class="detail" *ngIf="character.backstory">
                  <strong>Poveste:</strong> {{ character.backstory }}
                </div>
                <div class="detail" *ngIf="character.motive">
                  <strong>Motiv:</strong> {{ character.motive }}
                </div>
                <div class="detail" *ngIf="character.alibi">
                  <strong>Alibi:</strong> {{ character.alibi }}
                </div>
              </div>
              <div class="character-actions">
                <button class="btn-icon" (click)="editCharacter(character)">✏️</button>
                <button class="btn-icon" (click)="deleteCharacter(character.characterId)">🗑️</button>
              </div>
            </div>
          </div>

          <div *ngIf="characters.length === 0 && !showCharacterForm" class="empty-state">
            <div class="empty-icon">👥</div>
            <h3>No characters yet</h3>
            <p>Add suspects, witnesses, and investigators to your mystery</p>
          </div>
        </div>

        <!-- Devices Tab -->
        <div *ngIf="activeTab === 'devices'" class="tab-content">
          <div class="sec-head">
            <div>
              <div class="eyebrow">DOVEZI DIGITALE</div>
              <h2 class="sec-title">Dispozitive</h2>
            </div>
            <button class="btn-primary" (click)="showDeviceForm = true" *ngIf="!showDeviceForm">
              + Dispozitiv nou
            </button>
          </div>

          <!-- Add Device Form -->
          <div *ngIf="showDeviceForm" class="character-form">
            <h3>{{ editingDevice ? 'Edit Device' : 'New Device' }}</h3>
            <form [formGroup]="deviceForm">
              <div class="form-row">
                <div class="form-group">
                  <label>Device Type *</label>
                  <select formControlName="deviceType">
                    <option value="iPhone">📱 iPhone</option>
                    <option value="Android">📱 Android</option>
                    <option value="Laptop">💻 Laptop</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Owner Name *</label>
                  <input type="text" formControlName="ownerName" placeholder="Detective John Smith">
                </div>
              </div>

              <div class="info-box">
                <p><strong>Note:</strong> After creating the device, you'll be able to add apps, messages, photos, and other content to it.</p>
              </div>

              <div class="form-actions">
                <button type="button" class="btn-secondary" (click)="cancelDeviceForm()">Cancel</button>
                <button type="button" class="btn-primary" (click)="saveDevice()" [disabled]="deviceForm.invalid">
                  {{ editingDevice ? 'Update' : 'Add' }} Device
                </button>
              </div>
            </form>
          </div>

          <!-- Devices List - suspect devices only -->
          <div class="characters-grid">
            <div *ngFor="let device of suspectDevices" class="character-card">
              <div class="character-header">
                <h3>{{ getDeviceIcon(device.deviceType) }} {{ device.deviceType }}</h3>
                <span class="character-role">{{ device.ownerName }}</span>
              </div>
              <p class="character-description">Device simulator for {{ device.ownerName }}</p>
              <div class="character-details">
                <div class="detail">
                  <strong>Type:</strong> {{ device.deviceType }}
                </div>
                <div class="detail">
                  <strong>Created:</strong> {{ formatDate(device.createdAt) }}
                </div>
                <div class="detail" *ngIf="deviceUploadRequirements[device.deviceId]?.length">
                  <strong>Upload necesar:</strong>
                  {{ deviceUploadRequirements[device.deviceId].join(' | ') }}
                </div>
                <div class="detail" *ngIf="deviceUploadTargets[device.deviceId]?.length">
                  <button class="btn-secondary btn-sm" type="button" (click)="triggerDeviceUpload(device.deviceId)">
                    Încarcă din PC
                  </button>
                  <input
                    [id]="'device-upload-' + device.deviceId"
                    type="file"
                    style="display:none"
                    [accept]="getDeviceUploadAccept(device.deviceId)"
                    (change)="onDeviceUploadSelected(device.deviceId, $event)"
                  />
                </div>
              </div>
              <div class="character-actions">
                <button class="btn-icon" title="Configure Apps" (click)="configureDeviceApps(device)">⚙️</button>
                <button class="btn-icon" title="View Device" type="button" [routerLink]="['/games', gameId, 'devices', createDeviceSlug(device.deviceType, device.ownerName), 'simulator']">📱</button>
                <button class="btn-icon" title="Download QR Code PDF" (click)="downloadQRCodePDF(device)">📄</button>
                <button class="btn-icon" (click)="editDevice(device)">✏️</button>
                <button class="btn-icon" (click)="deleteDevice(device.deviceId)">🗑️</button>
              </div>
            </div>
          </div>

          <!-- Device Apps Configuration Form -->
          <div *ngIf="configuringDevice" class="character-form">
            <h3>⚙️ Configure Apps for {{ configuringDevice.ownerName}}'s {{ configuringDevice.deviceType }}</h3>
            
            <!-- App Tabs -->
            <div class="app-tabs">
              <button 
                [class.active]="activeAppTab === 'messages'" 
                (click)="activeAppTab = 'messages'"
                class="app-tab-btn">
                💬 Messages
              </button>
              <button 
                [class.active]="activeAppTab === 'photos'" 
                (click)="activeAppTab = 'photos'"
                class="app-tab-btn">
                📷 Photos
              </button>
              <button 
                [class.active]="activeAppTab === 'email'" 
                (click)="activeAppTab = 'email'"
                class="app-tab-btn">
                ✉️ Email
              </button>
              <button 
                [class.active]="activeAppTab === 'notes'"
                (click)="activeAppTab = 'notes'"
                class="app-tab-btn">
                📝 Notes
              </button>
            </div>

            <!-- Messages Configuration -->
            <div *ngIf="activeAppTab === 'messages'" class="app-config-content">
              <h4>Messages App</h4>
              <div *ngFor="let conv of messagesData; let i = index" class="conversation-item">
                <div class="conv-header">
                  <strong>Conversation {{ i + 1 }}</strong>
                  <button class="btn-icon" (click)="removeConversation(i)">🗑️</button>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Contact Name</label>
                    <input [(ngModel)]="conv.contact" placeholder="John Doe">
                  </div>
                  <div class="form-group">
                    <label>Avatar (emoji)</label>
                    <input [(ngModel)]="conv.avatar" placeholder="👤" style="width: 60px;">
                  </div>
                </div>
                <div class="messages-list">
                  <div *ngFor="let msg of conv.messages; let j = index" class="message-item">
                    <div class="msg-row">
                      <input [(ngModel)]="msg.sender" placeholder="Sender">
                      <input [(ngModel)]="msg.content" placeholder="Message content">
                      <input [(ngModel)]="msg.timestamp" placeholder="10:30 AM">
                      <label><input type="checkbox" [(ngModel)]="msg.isOutgoing"> Outgoing</label>
                      <button class="btn-icon" (click)="removeMessage(i, j)">×</button>
                    </div>
                  </div>
                  <button class="btn-secondary btn-sm" (click)="addMessage(i)">+ Add Message</button>
                </div>
              </div>
              <button class="btn-primary" (click)="addConversation()">+ Add Conversation</button>
            </div>

            <!-- Photos Configuration -->
            <div *ngIf="activeAppTab === 'photos'" class="app-config-content">
              <h4>Photos App</h4>
              <div *ngFor="let photo of photosData; let i = index" class="photo-item">
                <div class="form-row">
                  <div class="form-group" style="flex: 2">
                    <label>Photo URL</label>
                    <input [(ngModel)]="photo.url" placeholder="https://example.com/photo.jpg">
                  </div>
                  <div class="form-group" style="flex: 1">
                    <label>Caption</label>
                    <input [(ngModel)]="photo.caption" placeholder="Crime scene">
                  </div>
                  <button class="btn-icon" (click)="removePhoto(i)" style="margin-top: 28px;">🗑️</button>
                </div>
              </div>
              <button class="btn-primary" (click)="addPhoto()">+ Add Photo</button>
            </div>

            <!-- Email Configuration -->
            <div *ngIf="activeAppTab === 'email'" class="app-config-content">
              <h4>Email App</h4>
              <div *ngFor="let email of emailsData; let i = index" class="email-item">
                <div class="form-group">
                  <label>From</label>
                  <input [(ngModel)]="email.from" placeholder="detective@police.com">
                </div>
                <div class="form-group">
                  <label>Subject</label>
                  <input [(ngModel)]="email.subject" placeholder="Urgent Investigation">
                </div>
                <div class="form-group">
                  <label>Preview</label>
                  <textarea [(ngModel)]="email.preview" rows="2" placeholder="Email content preview..."></textarea>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Time</label>
                    <input [(ngModel)]="email.time" placeholder="10:30 AM">
                  </div>
                  <button class="btn-icon" (click)="removeEmail(i)" style="margin-top: 28px;">🗑️</button>
                </div>
                <hr>
              </div>
              <button class="btn-primary" (click)="addEmail()">+ Add Email</button>
            </div>

            <!-- Notes Configuration -->
            <div *ngIf="activeAppTab === 'notes'" class="app-config-content">
              <h4>Notes App</h4>
              <div *ngFor="let note of notesData; let i = index" class="note-item">
                <div class="form-group">
                  <label>Title</label>
                  <input [(ngModel)]="note.title" placeholder="Important Note">
                </div>
                <div class="form-group">
                  <label>Content</label>
                  <textarea [(ngModel)]="note.content" rows="3" placeholder="Note content..."></textarea>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Time</label>
                    <input [(ngModel)]="note.time" placeholder="Oct 20">
                  </div>
                  <button class="btn-icon" (click)="removeNote(i)" style="margin-top: 28px;">🗑️</button>
                </div>
                <hr>
              </div>
              <button class="btn-primary" (click)="addNote()">+ Add Note</button>
            </div>

            <!-- Actions -->
            <div class="form-actions">
              <button type="button" class="btn-secondary" (click)="cancelAppConfig()">Cancel</button>
              <button type="button" class="btn-primary" (click)="saveAppConfig()">Save Configuration</button>
            </div>
          </div>

          <div *ngIf="suspectDevices.length === 0 && !showDeviceForm" class="empty-state">
            <div class="empty-icon">📱</div>
            <h3>No devices yet</h3>
            <p>Create digital device simulators with messages, photos, and emails</p>
          </div>
        </div>

        <!-- Investigator Devices Tab -->
        <div *ngIf="activeTab === 'investigator'" class="tab-content">
          <div class="sec-head">
            <div>
              <div class="eyebrow" style="color:#8b1a1a">DISPOZITIVE SPECIALE</div>
              <h2 class="sec-title">Dispozitivele Anchetatorului</h2>
            </div>
          </div>
          <p style="font-size:13.5px;color:var(--ink2);font-style:italic;margin-bottom:24px;line-height:1.7">
            Aceste dispozitive aparțin anchetatorului și au fost generate automat pe baza dosarului.
            Laptopul conține baze de date clasificate, interogatorii și hărți. iPhone-ul conține apeluri înregistrate cu entitățile cazului.
          </p>
          <div *ngIf="investigatorDevices.length === 0" class="empty-state">
            <div class="empty-icon">🔍</div>
            <h3>Dispozitivele nu sunt disponibile</h3>
            <p>Creați un dosar nou pentru a genera automat dispozitivele anchetatorului.</p>
          </div>
          <div class="inv-devices-grid">
            <div *ngFor="let device of investigatorDevices" class="inv-device-card">
              <div class="inv-card-top-line"></div>
              <div class="inv-badge">ANCHETATOR</div>
              <div class="inv-device-icon">
                {{ device.deviceType === 'Laptop' ? '💻' : '📱' }}
              </div>
              <div class="inv-device-type">{{ device.deviceType }}</div>
              <div class="inv-device-desc">
                <span *ngIf="device.deviceType === 'Laptop'">Baze de date suspecți · Interogatorii · Camere CCTV · Hărți</span>
                <span *ngIf="device.deviceType === 'iPhone'">Apeluri înregistrate · Mesaje · Note de anchetă</span>
              </div>
              <div class="inv-device-actions">
                <button class="btn-primary" style="width:100%" [routerLink]="['/games', gameId, 'devices', createDeviceSlug(device.deviceType, device.ownerName), 'simulator']">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2l6 4v4l-6 4-6-4V6l6-4z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
                  Deschide {{ device.deviceType }}
                </button>
                <button class="btn-secondary" style="margin-top:6px;width:100%" (click)="downloadQRCodePDF(device)" title="Descarcă QR Code">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="10" y="10" width="1.5" height="1.5" fill="currentColor"/><rect x="12.5" y="10" width="1.5" height="1.5" fill="currentColor"/><rect x="10" y="12.5" width="1.5" height="1.5" fill="currentColor"/><rect x="12.5" y="12.5" width="1.5" height="1.5" fill="currentColor"/></svg>
                  QR Code PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host{display:block}*{box-sizing:border-box;margin:0;padding:0}
    .details-container {
      --bg:#f5f2ec;--surface:#fff;--border:rgba(0,0,0,0.07);--border-md:rgba(0,0,0,0.11);
      --amber:#b87208;--amber-l:rgba(184,114,8,0.08);--navy:#1c2b4a;--navy-l:rgba(28,43,74,0.06);
      --ink:#1a1610;--ink2:rgba(26,22,16,0.62);--ink3:rgba(26,22,16,0.40);--green:#4a7a56;--red:#9b2020;
      --crimson:#8b1a1a;--crimson-l:rgba(139,26,26,0.08);
      min-height:100vh;background:var(--bg);font-family:'Inter',sans-serif;color:var(--ink);
    }
    .bg-canvas{position:fixed;inset:0;z-index:0;pointer-events:none;}
    /* Navbar */
    .nb{position:sticky;top:0;z-index:100;height:54px;background:rgba(245,242,236,0.82);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid var(--border-md);}
    .nb-inner{max-width:1200px;margin:0 auto;padding:0 24px;height:100%;display:flex;align-items:center;gap:12px;position:relative;z-index:1;}
    .btn-back{display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 12px;border:1px solid var(--border-md);border-radius:7px;background:transparent;color:var(--ink);font-size:12.5px;font-weight:500;font-family:'Inter',sans-serif;cursor:pointer;transition:border-color .2s;flex-shrink:0;}
    .btn-back:hover{border-color:rgba(0,0,0,0.25);color:var(--ink);}
    .btn-edit{display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 12px;border:1px solid rgba(28,43,74,0.35);border-radius:7px;background:transparent;color:var(--navy);font-size:12.5px;font-weight:600;font-family:'Inter',sans-serif;cursor:pointer;transition:background .2s;margin-left:auto;flex-shrink:0;}
    .btn-edit:hover{background:var(--navy-l);}
    .nb-title-wrap{flex:1;display:flex;align-items:center;gap:10px;justify-content:center;}
    .nb-case{font-family:'Playfair Display',serif;font-size:15px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:400px;}
    .nb-badge{font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:1.5px;text-transform:uppercase;padding:2px 8px;border-radius:4px;flex-shrink:0;font-weight:600;}
    .badge-pub{background:rgba(74,122,86,0.12);color:var(--green);border:1px solid rgba(74,122,86,0.4);}
    .badge-draft{background:rgba(184,114,8,0.10);color:var(--amber);border:1px solid rgba(184,114,8,0.35);}
    /* Tabs */
    .tabs-bar{background:rgba(245,242,236,0.7);border-bottom:1px solid var(--border);position:sticky;top:54px;z-index:90;backdrop-filter:blur(12px);}
    .tabs-inner{max-width:1200px;margin:0 auto;padding:0 24px;display:flex;gap:4px;height:46px;align-items:center;position:relative;z-index:1;}
    .tab-pill{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 14px;border-radius:20px;border:1px solid transparent;background:transparent;font-size:12.5px;font-weight:500;font-family:'Inter',sans-serif;color:var(--ink2);cursor:pointer;transition:background .2s,border-color .2s,color .2s;}
    .tab-pill:hover{background:var(--amber-l);color:var(--amber);}
    .tab-active{background:var(--surface);border-color:var(--border-md);color:var(--ink);font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,0.06);}
    .tab-pill-special:hover{background:var(--crimson-l);color:var(--crimson);}
    .tab-pill-special.tab-active{border-color:rgba(139,26,26,0.3);}
    .tab-count{font-family:'JetBrains Mono',monospace;font-size:9.5px;font-weight:600;color:var(--amber);background:rgba(184,114,8,0.12);border-radius:10px;padding:1px 6px;}
    .tab-count-inv{color:var(--crimson);background:rgba(139,26,26,0.12);}
    /* Investigator Devices */
    .inv-devices-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;}
    .inv-device-card{background:var(--surface);border:1px solid rgba(139,26,26,0.18);border-radius:14px;padding:28px 24px 20px;position:relative;overflow:hidden;text-align:center;transition:box-shadow .25s,transform .25s;}
    .inv-device-card:hover{transform:translateY(-3px);box-shadow:0 8px 32px rgba(139,26,26,0.12);}
    .inv-card-top-line{position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,rgba(139,26,26,0.6),transparent);}
    .inv-badge{position:absolute;top:14px;right:14px;font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:rgba(139,26,26,0.75);border:1px solid rgba(139,26,26,0.35);padding:2px 8px;border-radius:4px;}
    .inv-device-icon{font-size:48px;margin-bottom:14px;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.12));}
    .inv-device-type{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:var(--ink);margin-bottom:8px;}
    .inv-device-desc{font-size:12.5px;color:var(--ink2);line-height:1.6;font-style:italic;margin-bottom:18px;min-height:38px;}
    .inv-device-actions{display:flex;flex-direction:column;gap:0;}
    /* Content */
    .details-content{max-width:1200px;margin:0 auto;padding:32px 24px 60px;position:relative;z-index:1;}
    .tab-content{animation:fadeUp .35s ease both;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    .eyebrow{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--amber);margin-bottom:4px;font-weight:600;}
    /* Overview */
    .ov-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:28px;margin-bottom:16px;position:relative;overflow:hidden;}
    .ov-card-top{position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(184,114,8,0.45),transparent);}
    .ov-solution .ov-card-top{background:linear-gradient(90deg,transparent,rgba(155,32,32,0.45),transparent);}
    .ov-solution{border-color:rgba(155,32,32,0.15);}
    .solution-badge-sm{position:absolute;top:14px;right:16px;font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:2px;text-transform:uppercase;font-weight:600;color:rgba(155,32,32,0.65);border:1px solid rgba(155,32,32,0.3);padding:2px 7px;border-radius:3px;}
    .ov-label{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--ink3);margin-bottom:6px;font-weight:600;}
    .ov-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:var(--ink);margin-bottom:14px;}
    .ov-body{font-size:14px;color:var(--ink2);line-height:1.75;font-family:'Inter',sans-serif;font-style:italic;white-space:pre-wrap;}
    /* Section header */
    .sec-head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:22px;}
    .sec-title{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;color:var(--ink);}
    /* Cards grid */
    .characters-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;}
    .character-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;position:relative;overflow:hidden;transition:box-shadow .2s,border-color .2s;}
    .character-card:hover{box-shadow:0 4px 20px rgba(0,0,0,0.07);border-color:rgba(184,114,8,0.3);}
    .character-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(184,114,8,0.4),transparent);}
    .character-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
    .character-header h3{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:var(--ink);}
    .character-role{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;background:rgba(184,114,8,0.12);color:var(--amber);border:1px solid rgba(184,114,8,0.3);padding:2px 8px;border-radius:4px;}
    .character-description{font-size:13.5px;color:var(--ink2);line-height:1.6;margin-bottom:12px;font-style:italic;}
    .character-details{margin-bottom:12px;}
    .detail{font-size:13px;color:var(--ink2);margin-bottom:5px;line-height:1.55;}
    .detail strong{color:var(--ink);font-weight:600;}
    .character-actions{display:flex;gap:6px;padding-top:12px;border-top:1px solid var(--border);}
    .btn-icon{width:28px;height:28px;border:1px solid var(--border-md);border-radius:6px;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;transition:background .15s,border-color .15s;}
    .btn-icon:hover{background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.2);}
    /* Forms */
    .character-form{background:var(--surface);border:1px solid var(--border-md);border-radius:12px;padding:26px;margin-bottom:22px;position:relative;overflow:hidden;}
    .character-form::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(28,43,74,0.45),transparent);}
    .character-form h3{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:var(--ink);margin-bottom:18px;}
    .form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;}
    .form-group{display:flex;flex-direction:column;gap:5px;margin-bottom:14px;}
    .form-group label{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:1px;text-transform:uppercase;color:var(--amber);font-weight:600;}
    .form-group input,.form-group select,.form-group textarea{padding:10px 12px;border:1px solid var(--border-md);border-radius:8px;background:var(--bg);color:var(--ink);font-size:13.5px;font-family:'Inter',sans-serif;outline:none;transition:border-color .2s;width:100%;}
    .form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:rgba(184,114,8,0.5);box-shadow:0 0 0 3px rgba(184,114,8,0.07);}
    .form-group textarea{resize:vertical;line-height:1.6;}
    .form-actions{display:flex;gap:10px;justify-content:flex-end;padding-top:16px;border-top:1px solid var(--border);margin-top:4px;}
    /* App tabs */
    .app-tabs{display:flex;gap:4px;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid var(--border);}
    .app-tab-btn{height:30px;padding:0 13px;border:1px solid transparent;border-radius:20px;background:transparent;font-size:12px;font-weight:500;font-family:'Inter',sans-serif;color:var(--ink2);cursor:pointer;transition:background .15s,border-color .15s;}
    .app-tab-btn:hover{background:var(--amber-l);color:var(--amber);}
    .app-tab-btn.active{background:var(--surface);border-color:var(--border-md);color:var(--ink);font-weight:600;}
    .app-config-content h4{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:var(--ink);margin-bottom:16px;}
    .conversation-item,.email-item,.note-item,.photo-item{background:rgba(245,242,236,0.5);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px;}
    .conv-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
    .conv-header strong{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--ink3);font-weight:600;}
    .messages-list{margin-top:10px;}
    .message-item{margin-bottom:8px;}
    .msg-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
    .msg-row input{flex:1;min-width:80px;padding:7px 10px;border:1px solid var(--border-md);border-radius:6px;background:var(--surface);font-size:12.5px;font-family:'Inter',sans-serif;color:var(--ink);outline:none;}
    .msg-row input:focus{border-color:rgba(184,114,8,0.5);}
    .msg-row label{font-size:12px;color:var(--ink2);white-space:nowrap;display:flex;align-items:center;gap:5px;}
    /* Buttons */
    .btn-primary{display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 15px;border:none;border-radius:7px;background:var(--navy);color:#fff;font-size:12.5px;font-family:'Inter',sans-serif;font-weight:600;cursor:pointer;transition:opacity .2s;}
    .btn-primary:hover:not(:disabled){opacity:.88;}
    .btn-primary:disabled{opacity:.4;cursor:not-allowed;}
    .btn-secondary{display:inline-flex;align-items:center;height:32px;padding:0 14px;border:1px solid var(--border-md);border-radius:7px;background:transparent;color:var(--ink);font-size:12.5px;font-weight:500;font-family:'Inter',sans-serif;cursor:pointer;transition:border-color .2s;}
    .btn-secondary:hover{border-color:rgba(0,0,0,0.25);color:var(--ink);}
    .btn-sm{height:26px;padding:0 11px;font-size:11.5px;}
    /* Misc */
    .info-box{background:var(--amber-l);border:1px solid rgba(184,114,8,0.25);border-radius:8px;padding:12px 14px;font-size:13px;color:var(--ink2);margin-bottom:14px;line-height:1.5;}
    .info-box strong{color:var(--ink);font-weight:600;}
    .empty-state{text-align:center;padding:60px 20px;}
    .empty-state .empty-icon{font-size:40px;margin-bottom:12px;opacity:.5;}
    .empty-state h3{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:var(--ink);margin-bottom:8px;}
    .empty-state p{font-size:13.5px;color:var(--ink2);font-style:italic;}
    hr{border:none;border-top:1px solid var(--border);margin:14px 0;}
    @media(max-width:900px){.characters-grid{grid-template-columns:1fr;}.form-row{grid-template-columns:1fr;}}
  `]
})
export class GameDetailsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('bgCvs') canvasRef!: ElementRef<HTMLCanvasElement>;
  private cleanupCanvas?: () => void;
  gameId!: number;
  game?: Game;
  characters: Character[] = [];
  devices: DigitalDevice[] = [];
  suspectDevices: DigitalDevice[] = [];
  investigatorDevices: DigitalDevice[] = [];
  activeTab = 'overview';
  createDeviceSlug = createDeviceSlug; // Make function available in template
  showCharacterForm = false;
  showDeviceForm = false;
  editingCharacter: Character | null = null;
  editingDevice: DigitalDevice | null = null;
  characterForm: FormGroup;
  deviceForm: FormGroup;

  // App configuration
  configuringDevice: DigitalDevice | null = null;
  activeAppTab = 'messages';
  messagesData: any[] = [];
  photosData: any[] = [];
  emailsData: any[] = [];
  notesData: any[] = [];
  deviceUploadRequirements: { [deviceId: number]: string[] } = {};
  deviceUploadTargets: { [deviceId: number]: UploadTarget[] } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameService: GameService,
    private characterService: CharacterService,
    private deviceService: DeviceService,
    private fb: FormBuilder
  ) {
    this.characterForm = this.fb.group({
      name: ['', Validators.required],
      role: ['Suspect', Validators.required],
      description: [''],
      backstory: [''],
      motive: [''],
      alibi: ['']
    });
    this.deviceForm = this.fb.group({
      deviceType: ['iPhone', Validators.required],
      ownerName: ['', Validators.required]
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) { this.gameId = parseInt(id); this.loadGame(); this.loadCharacters(); this.loadDevices(); this.loadInvestigatorDevices(); }
  }

  ngAfterViewInit() { this.cleanupCanvas = this.initCanvas(this.canvasRef.nativeElement); }
  ngOnDestroy() { this.cleanupCanvas?.(); }

  private initCanvas(cv: HTMLCanvasElement): () => void {
    const ctx = cv.getContext('2d')!;
    let W = 0, H = 0;
    const rs = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; };
    rs(); addEventListener('resize', rs);
    const r = Math.random;
    const ep = () => r() < 0.5 ? r() * 0.22 : 0.78 + r() * 0.22;
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
      for (const e of es) {
        const [ax, ay] = px[e.a], [bx, by] = px[e.b];
        const mx = (ax + bx) / 2 + Math.sin(t * 0.0002 + e.a + e.b) * 14;
        const my = (ay + by) / 2 + Math.cos(t * 0.00018 + e.a) * 10;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by);
        if (e.k === 0) { ctx.strokeStyle = 'rgba(155,32,32,0.08)'; ctx.lineWidth = 0.75; ctx.setLineDash([]); }
        else if (e.k === 1) { ctx.strokeStyle = 'rgba(155,32,32,0.06)'; ctx.lineWidth = 0.65; ctx.setLineDash([4, 10]); ctx.lineDashOffset = -(t * 0.012); }
        else { const a = 0.07 + 0.09 * Math.sin(t * 0.0003 + e.a); ctx.strokeStyle = `rgba(155, 32, 32, ${a.toFixed(3)})`; ctx.lineWidth = 0.9; ctx.setLineDash([]); }
        ctx.stroke();
      }
      ctx.setLineDash([]);
      for (let i = 0; i < ns.length; i++) {
        const n = ns[i], [px_, py_] = px[i];
        if (n[5] === 0) { ctx.beginPath(); ctx.arc(px_, py_, n[6] + 4, 0, 6.28); ctx.strokeStyle = 'rgba(28,43,74,0.15)'; ctx.lineWidth = 0.8; ctx.stroke(); ctx.beginPath(); ctx.arc(px_, py_, n[6], 0, 6.28); ctx.fillStyle = 'rgba(28,43,74,0.18)'; ctx.fill(); }
        else if (n[5] === 1) { const pr = n[6] + 0.5 * Math.sin(t * 0.0006 + n[7]); ctx.beginPath(); ctx.arc(px_, py_, pr, 0, 6.28); ctx.fillStyle = 'rgba(155,32,32,0.12)'; ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(px_, py_, n[6], 0, 6.28); ctx.fillStyle = 'rgba(155,32,32,0.10)'; ctx.fill(); }
      }
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.1, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0.2, 'transparent'); vg.addColorStop(0.62, 'rgba(245,242,236,0.50)'); vg.addColorStop(1, 'rgba(245,242,236,0.90)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      rid = requestAnimationFrame(draw);
    };
    rid = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rid); removeEventListener('resize', rs); };
  }

  loadGame() {
    this.gameService.getGame(this.gameId).subscribe({
      next: (game) => this.game = game,
      error: (error) => console.error('Error loading game:', error)
    });
  }

  loadCharacters() {
    this.characterService.getCharacters(this.gameId).subscribe({
      next: (characters) => this.characters = characters,
      error: (error) => console.error('Error loading characters:', error)
    });
  }

  loadDevices() {
    this.deviceService.getDevices(this.gameId).subscribe({
      next: (devices) => {
        // Exclude investigator devices from the suspect tab
        this.devices = devices.filter(d => d.ownerName !== 'Anchetator');
        this.suspectDevices = this.devices;
        this.loadUploadRequirementsForDevices();
      },
      error: (error) => console.error('Error loading devices:', error)
    });
  }

  private loadUploadRequirementsForDevices() {
    this.deviceUploadRequirements = {};
    this.deviceUploadTargets = {};
    this.suspectDevices.forEach(device => {
      this.deviceService.getDeviceApps(this.gameId, device.deviceId).subscribe({
        next: (apps: any[]) => {
          const requirements: string[] = [];
          const targets: UploadTarget[] = [];
          apps.forEach((app: any) => {
            if (app.appType === 'Photos') {
              const photos = app.appData?.photos ?? app.appData?.Photos ?? [];
              (photos || []).forEach((p: any) => {
                const url = p.url ?? p.Url ?? '';
                if (typeof url === 'string' && url.startsWith('upload-required://')) {
                  const raw = url.substring('upload-required://'.length);
                  const [name, query] = raw.split('?');
                  const params = new URLSearchParams(query || '');
                  const types = params.get('types') || 'jpg,jpeg,png';
                  requirements.push(`Foto: ${name} (${types}, ${params.get('size') || '1080x1920'})`);
                  targets.push({
                    appId: app.appId,
                    appType: 'Photos',
                    fileName: name,
                    allowedTypes: types,
                    sizeHint: params.get('size') || '1080x1920'
                  });
                }
              });
            }
            if (app.appType === 'Files') {
              const files = app.appData?.items ?? app.appData?.Items ?? [];
              (files || []).forEach((f: any) => {
                const desc = String(f.description ?? f.Description ?? '');
                if (desc.includes('upload-required://')) {
                  const raw = desc.split('upload-required://')[1].split('|')[0].trim();
                  const [name, query] = raw.split('?');
                  const params = new URLSearchParams(query || '');
                  const types = params.get('types') || 'mp3,mp4';
                  requirements.push(`Media: ${name} (${types}, ${params.get('size') || 'standard'})`);
                  targets.push({
                    appId: app.appId,
                    appType: 'Files',
                    fileName: name,
                    allowedTypes: types,
                    sizeHint: params.get('size') || 'standard'
                  });
                }
              });
            }
          });
          if (requirements.length > 0) {
            this.deviceUploadRequirements[device.deviceId] = requirements;
            this.deviceUploadTargets[device.deviceId] = targets;
          }
        },
        error: () => {}
      });
    });
  }

  triggerDeviceUpload(deviceId: number) {
    const input = document.getElementById(`device-upload-${deviceId}`) as HTMLInputElement | null;
    input?.click();
  }

  getDeviceUploadAccept(deviceId: number): string {
    const targets = this.deviceUploadTargets[deviceId] ?? [];
    const extSet = new Set<string>();
    targets.forEach(t => {
      t.allowedTypes.split(',').map(x => x.trim().toLowerCase()).forEach(ext => extSet.add(ext));
    });
    if (extSet.size === 0) return '.jpg,.jpeg,.png,.mp3,.mp4';
    return Array.from(extSet).map(ext => ext.startsWith('.') ? ext : `.${ext}`).join(',');
  }

  onDeviceUploadSelected(deviceId: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const targets = this.deviceUploadTargets[deviceId] ?? [];
    const normalizedSelectedName = this.normalizeFileNameForCompare(file.name);
    const target = targets.find(t =>
      this.normalizeFileNameForCompare(t.fileName) === normalizedSelectedName
    );
    if (!target) {
      alert(`Fișierul nu este cerut pentru acest dispozitiv. Nume așteptate: ${(targets.map(t => t.fileName)).join(', ')}`);
      input.value = '';
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowed = target.allowedTypes.split(',').map(x => x.trim().toLowerCase());
    if (!allowed.includes(ext)) {
      alert(`Format invalid pentru ${target.fileName}. Permis: ${target.allowedTypes}`);
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) return;

      this.deviceService.getDeviceApps(this.gameId, deviceId).subscribe({
        next: (apps: any[]) => {
          const app = apps.find(a => a.appId === target.appId);
          if (!app) {
            alert('Nu am găsit aplicația pentru upload.');
            return;
          }

          if (target.appType === 'Photos') {
            const photos = [...(app.appData?.photos ?? app.appData?.Photos ?? [])];
            const idx = photos.findIndex((p: any) => {
              const url = String(p.url ?? p.Url ?? '');
              return url.startsWith('upload-required://') && url.includes(target.fileName);
            });
            if (idx < 0) {
              alert(`Placeholder-ul pentru ${target.fileName} nu mai există.`);
              return;
            }
            photos[idx] = { ...photos[idx], url: dataUrl };
            this.deviceService.updateDeviceApp(this.gameId, deviceId, target.appId, { appData: { photos } }).subscribe({
              next: () => {
                alert(`Upload reușit pentru ${target.fileName}.`);
                this.loadUploadRequirementsForDevices();
                input.value = '';
              },
              error: () => alert('Nu am putut salva poza.')
            });
            return;
          }

          const items = [...(app.appData?.items ?? app.appData?.Items ?? [])];
          const idx = items.findIndex((f: any) => String(f.name ?? f.Name ?? '').toLowerCase() === target.fileName.toLowerCase());
          if (idx < 0) {
            alert(`Fișierul ${target.fileName} nu există în lista de fișiere.`);
            return;
          }
          items[idx] = { ...items[idx], description: `uploaded://${target.fileName}` };
          this.deviceService.updateDeviceApp(this.gameId, deviceId, target.appId, { appData: { items } }).subscribe({
            next: () => {
              alert(`Upload reușit pentru ${target.fileName}.`);
              this.loadUploadRequirementsForDevices();
              input.value = '';
            },
            error: () => alert('Nu am putut salva fișierul media.')
          });
        },
        error: () => alert('Nu am putut încărca datele aplicațiilor dispozitivului.')
      });
    };
    reader.readAsDataURL(file);
  }

  private normalizeFileNameForCompare(name: string): string {
    const normalized = (name || '')
      .trim()
      .replace(/[“”"']/g, '')
      // Accept both "foto_0089.jpg" and accidental "foto_0089,jpg"
      .replace(/,(?=[a-z0-9]{2,5}$)/i, '.')
      .replace(/\s+/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return normalized;
  }

  loadInvestigatorDevices() {
    this.deviceService.getInvestigatorDevices(this.gameId).subscribe({
      next: (devices) => { this.investigatorDevices = devices; },
      error: (error) => console.error('Error loading investigator devices:', error)
    });
  }

  saveCharacter() {
    if (this.characterForm.invalid) return;

    const characterData = this.characterForm.value;

    if (this.editingCharacter) {
      this.characterService.updateCharacter(this.gameId, this.editingCharacter.characterId, characterData).subscribe({
        next: () => {
          this.loadCharacters();
          this.cancelCharacterForm();
        },
        error: (error) => console.error('Error updating character:', error)
      });
    } else {
      this.characterService.createCharacter(this.gameId, characterData).subscribe({
        next: () => {
          this.loadCharacters();
          this.cancelCharacterForm();
        },
        error: (error) => console.error('Error creating character:', error)
      });
    }
  }

  editCharacter(character: Character) {
    this.editingCharacter = character;
    this.characterForm.patchValue(character);
    this.showCharacterForm = true;
  }

  deleteCharacter(characterId: number) {
    if (confirm('Are you sure you want to delete this character?')) {
      this.characterService.deleteCharacter(this.gameId, characterId).subscribe({
        next: () => this.loadCharacters(),
        error: (error) => console.error('Error deleting character:', error)
      });
    }
  }

  cancelCharacterForm() {
    this.showCharacterForm = false;
    this.editingCharacter = null;
    this.characterForm.reset({ role: 'Suspect' });
  }

  // Device Methods
  saveDevice() {
    if (this.deviceForm.invalid) return;

    const deviceData = {
      ...this.deviceForm.value,

    };

    if (this.editingDevice) {
      this.deviceService.updateDevice(this.gameId, this.editingDevice.deviceId, deviceData).subscribe({
        next: () => {
          this.loadDevices();
          this.cancelDeviceForm();
        },
        error: (error) => console.error('Error updating device:', error)
      });
    } else {
      this.deviceService.createDevice(this.gameId, deviceData).subscribe({
        next: () => {
          this.loadDevices();
          this.cancelDeviceForm();
        },
        error: (error) => console.error('Error creating device:', error)
      });
    }
  }

  editDevice(device: DigitalDevice) {
    this.editingDevice = device;
    this.deviceForm.patchValue({
      deviceType: device.deviceType,
      ownerName: device.ownerName
    });
    this.showDeviceForm = true;
  }

  deleteDevice(deviceId: number) {
    if (confirm('Are you sure you want to delete this device?')) {
      this.deviceService.deleteDevice(this.gameId, deviceId).subscribe({
        next: () => this.loadDevices(),
        error: (error) => console.error('Error deleting device:', error)
      });
    }
  }

  downloadQRCodePDF(device: DigitalDevice) {
    this.deviceService.downloadQRCodePDF(this.gameId, device.deviceId).subscribe({
      next: (blob) => {
        // Check if blob is actually a PDF or an error response
        if (blob.type === 'application/json' || blob.size < 100) {
          // Likely an error response, read it as text
          blob.text().then(text => {
            console.error('Error response:', text);
            try {
              const error = JSON.parse(text);
              alert(`Error: ${error.message || 'Unknown error'} `);
            } catch {
              alert('Error downloading QR code PDF. Please check console for details.');
            }
          });
          return;
        }

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `QR - ${device.deviceType} -${device.ownerName.replace(/\s+/g, '-')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading QR code PDF:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });

        let errorMessage = 'Error downloading QR code PDF. Please try again.';
        if (error.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (error.status === 403) {
          errorMessage = 'You do not have permission to access this device.';
        } else if (error.status === 404) {
          errorMessage = 'Device not found.';
        } else if (error.status === 500) {
          errorMessage = 'Server error. Please check console for details.';
        }

        alert(errorMessage);
      }
    });
  }

  cancelDeviceForm() {
    this.showDeviceForm = false;
    this.editingDevice = null;
    this.deviceForm.reset({ deviceType: 'iPhone' });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  getDeviceIcon(deviceType: string): string {
    const icons: any = {
      'iPhone': '📱',
      'Android': '📱',
      'Laptop': '💻'
    };
    return icons[deviceType] || '📱';
  }

  configureDeviceApps(device: DigitalDevice) {
    this.configuringDevice = device;
    this.activeAppTab = 'messages';
    this.loadDeviceApps(device.deviceId);
  }

  loadDeviceApps(deviceId: number) {
    this.messagesData = [];
    this.photosData = [];
    this.emailsData = [];
    this.notesData = [];

    this.deviceService.getDeviceApps(this.gameId, deviceId).subscribe({
      next: (apps) => {
        apps.forEach((app: any) => {
          if (app.appType === 'Messages') {
            const convs = app.appData?.conversations ?? app.appData?.Conversations ?? [];
            this.messagesData = convs.map((c: any) => ({
              contact: c.contact ?? c.Contact ?? '',
              avatar: c.avatar ?? c.Avatar ?? '👤',
              lastMessage: c.lastMessage ?? c.LastMessage ?? '',
              time: c.time ?? c.Time ?? '',
              messages: (c.messages ?? c.Messages ?? []).map((m: any) => ({
                sender: m.sender ?? m.Sender ?? '',
                content: m.content ?? m.Content ?? '',
                timestamp: m.timestamp ?? m.Timestamp ?? '',
                isOutgoing: m.isOutgoing ?? m.IsOutgoing ?? false
              }))
            }));
          } else if (app.appType === 'Photos') {
            const list = app.appData?.photos ?? app.appData?.Photos ?? [];
            this.photosData = list.map((p: any) => ({ url: p.url ?? p.Url ?? '', caption: p.caption ?? p.Caption ?? '' }));
          } else if (app.appType === 'Email') {
            const list = [
              ...(app.appData?.emails ?? app.appData?.Emails ?? []),
              ...(app.appData?.inbox ?? app.appData?.Inbox ?? []),
              ...(app.appData?.sent ?? app.appData?.Sent ?? []),
              ...(app.appData?.drafts ?? app.appData?.Drafts ?? [])
            ];
            this.emailsData = list.map((e: any) => ({ from: e.from ?? e.From ?? '', subject: e.subject ?? e.Subject ?? '', preview: e.preview ?? e.Preview ?? '', time: e.time ?? e.Time ?? '' }));
          } else if (app.appType === 'Notes') {
            const list = app.appData?.notes ?? app.appData?.Notes ?? [];
            this.notesData = list.map((n: any) => ({ title: n.title ?? n.Title ?? '', content: n.content ?? n.Content ?? '', time: n.time ?? n.Time ?? '' }));
          }
        });
      },
      error: () => {
        // If no apps exist, start with empty data
        this.messagesData = [];
        this.photosData = [];
        this.emailsData = [];
        this.notesData = [];
      }
    });
  }

  // Messages methods
  addConversation() {
    this.messagesData.push({
      contact: '',
      avatar: '👤',
      lastMessage: '',
      time: '',
      messages: []
    });
  }

  removeConversation(index: number) {
    this.messagesData.splice(index, 1);
  }

  addMessage(convIndex: number) {
    this.messagesData[convIndex].messages.push({
      sender: '',
      content: '',
      timestamp: '',
      isOutgoing: false
    });
  }

  removeMessage(convIndex: number, msgIndex: number) {
    this.messagesData[convIndex].messages.splice(msgIndex, 1);
  }

  // Photos methods
  addPhoto() {
    this.photosData.push({ url: '', caption: '' });
  }

  removePhoto(index: number) {
    this.photosData.splice(index, 1);
  }

  // Email methods
  addEmail() {
    this.emailsData.push({ from: '', subject: '', preview: '', time: '' });
  }

  removeEmail(index: number) {
    this.emailsData.splice(index, 1);
  }

  // Notes methods
  addNote() {
    this.notesData.push({ title: '', content: '', time: '' });
  }

  removeNote(index: number) {
    this.notesData.splice(index, 1);
  }

  cancelAppConfig() {
    this.configuringDevice = null;
    this.messagesData = [];
    this.photosData = [];
    this.emailsData = [];
    this.notesData = [];
  }

  saveAppConfig() {
    if (!this.configuringDevice) return;

    const deviceId = this.configuringDevice.deviceId;

    // Save Messages app
    if (this.messagesData.length > 0) {
      // Update lastMessage and time for each conversation
      this.messagesData.forEach(conv => {
        if (conv.messages.length > 0) {
          const lastMsg = conv.messages[conv.messages.length - 1];
          conv.lastMessage = lastMsg.content;
          conv.time = lastMsg.timestamp;
        }
      });

      const messagesApp = {
        appType: 'Messages',
        appData: { conversations: this.messagesData }
      };
      this.deviceService.createDeviceApp(this.gameId, deviceId, messagesApp).subscribe({
        next: () => console.log('Messages saved'),
        error: (err) => console.error('Error saving messages:', err)
      });
    }

    // Save Photos app
    if (this.photosData.length > 0) {
      const photosApp = {
        appType: 'Photos',
        appData: { photos: this.photosData }
      };
      this.deviceService.createDeviceApp(this.gameId, deviceId, photosApp).subscribe({
        next: () => console.log('Photos saved'),
        error: (err) => console.error('Error saving photos:', err)
      });
    }

    // Save Email app
    if (this.emailsData.length > 0) {
      const emailApp = {
        appType: 'Email',
        appData: { emails: this.emailsData }
      };
      this.deviceService.createDeviceApp(this.gameId, deviceId, emailApp).subscribe({
        next: () => console.log('Email saved'),
        error: (err) => console.error('Error saving emails:', err)
      });
    }

    // Save Notes app
    if (this.notesData.length > 0) {
      const notesApp = {
        appType: 'Notes',
        appData: { notes: this.notesData }
      };
      this.deviceService.createDeviceApp(this.gameId, deviceId, notesApp).subscribe({
        next: () => console.log('Notes saved'),
        error: (err) => console.error('Error saving notes:', err)
      });
    }

    // Close configuration form
    alert('Configuration saved! Click "View Device" to see your changes.');
    this.cancelAppConfig();
  }
}
