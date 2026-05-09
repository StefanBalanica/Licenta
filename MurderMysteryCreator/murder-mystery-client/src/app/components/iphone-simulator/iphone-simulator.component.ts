import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DeviceService } from '../../services/device.service';

interface Message {
  sender: string;
  content: string;
  timestamp: string;
  isOutgoing: boolean;
}

interface Conversation {
  contact: string;
  messages: Message[];
  lastMessage: string;
  time: string;
  avatar: string;
}

@Component({
  selector: 'app-iphone-simulator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Loading State -->
    <div *ngIf="loading" class="loading-container">
      <div class="loader"></div>
      <p>Loading device...</p>
    </div>

    <!-- iPhone Template -->
    <div *ngIf="!loading && deviceType === 'iPhone'" class="iphone-container">
      <div class="iphone-frame">
        <!-- Notch -->
        <div class="iphone-notch"></div>
        
        <!-- Status Bar -->
        <div class="status-bar">
          <span class="time">9:41</span>
          <div class="status-icons">
            <span class="signal">📶</span>
            <span class="wifi">📡</span>
            <span class="battery">🔋 100%</span>
          </div>
        </div>

        <!-- Screen Content -->
        <div class="screen-content"
             (touchstart)="onTouchStart($event)"
             (touchmove)="onTouchMove($event)"
             (touchend)="onTouchEnd()"
             (mousedown)="onMouseDown($event)"
             (mousemove)="onMouseMove($event)"
             (mouseup)="onMouseUp()">
          <!-- Home Screen with Apps -->
          <div *ngIf="currentScreen === 'home'" class="home-screen">
            <!-- iOS Wallpaper background set via CSS -->
            
            <!-- App Grid -->
            <div class="app-grid">
              <div class="app-icon" (click)="openApp('messages')">
                <div class="icon messages-ios">💬</div>
                <span>Messages</span>
              </div>
              <div class="app-icon">
                <div class="icon calendar-ios">📅</div>
                <span>Calendar</span>
              </div>
              <div class="app-icon" (click)="openApp('photos')">
                <div class="icon photos-ios">🖼️</div>
                <span>Photos</span>
              </div>
              <div class="app-icon">
                <div class="icon camera-ios">📷</div>
                <span>Camera</span>
              </div>
              <div class="app-icon" (click)="openApp('email')">
                <div class="icon mail-ios">📧</div>
                <span>Mail</span>
              </div>
              <div class="app-icon">
                <div class="icon clock-ios">⏰</div>
                <span>Clock</span>
              </div>
              <div class="app-icon">
                <div class="icon maps-ios">🗺️</div>
                <span>Maps</span>
              </div>
              <div class="app-icon">
                <div class="icon weather-ios">⛅</div>
                <span>Weather</span>
              </div>
              <div class="app-icon">
                <div class="icon reminders-ios">✓</div>
                <span>Reminders</span>
              </div>
              <div class="app-icon" (click)="openApp('notes')">
                <div class="icon notes-ios">📝</div>
                <span>Notes</span>
              </div>
              <div class="app-icon">
                <div class="icon stocks-ios">📈</div>
                <span>Stocks</span>
              </div>
              <div class="app-icon">
                <div class="icon wallet-ios">💳</div>
                <span>Wallet</span>
              </div>
              <div class="app-icon">
                <div class="icon settings-ios">⚙️</div>
                <span>Settings</span>
              </div>
              <div class="app-icon">
                <div class="icon health-ios">❤️</div>
                <span>Health</span>
              </div>
              <div class="app-icon">
                <div class="icon podcasts-ios">🎙️</div>
                <span>Podcasts</span>
              </div>
              <div class="app-icon">
                <div class="icon appstore-ios">📲</div>
                <span>App Store</span>
              </div>
            </div>

            <!-- iOS Dock -->
            <div class="ios-dock">
              <div class="app-icon">
                <div class="icon phone-ios">📞</div>
              </div>
              <div class="app-icon">
                <div class="icon safari-ios">🧭</div>
              </div>
              <div class="app-icon" (click)="openApp('messages')">
                <div class="icon messages-ios">💬</div>
              </div>
              <div class="app-icon">
                <div class="icon music-ios">🎵</div>
              </div>
            </div>
          </div>

          <!-- Messages App -->
          <div *ngIf="currentScreen === 'messages'" class="messages-app">
            <div class="app-header">
              <button class="back-btn" (click)="goHome()">‹ Back</button>
              <h2>Messages</h2>
            </div>
            
            <div *ngIf="!selectedConversation" class="conversations-list">
              <div *ngFor="let conv of conversations" 
                   class="conversation-item"
                   (click)="selectConversation(conv)">
                <div class="avatar">{{ conv.avatar }}</div>
                <div class="conversation-info">
                  <div class="contact-name">{{ conv.contact }}</div>
                  <div class="last-message">{{ conv.lastMessage }}</div>
                </div>
                <div class="time">{{ conv.time }}</div>
              </div>
            </div>

            <div *ngIf="selectedConversation" class="conversation-view">
              <div class="conversation-header" (click)="selectedConversation = null">
                <button class="back-btn">‹</button>
                <span>{{ selectedConversation.contact }}</span>
              </div>
              <div class="messages-container">
                <div *ngFor="let msg of selectedConversation.messages" 
                     [class]="'message-bubble ' + (msg.isOutgoing ? 'outgoing' : 'incoming')">
                  <div class="message-sender">{{ msg.sender }}</div>
                  <div class="message-content">{{ msg.content }}</div>
                  <div class="message-time">{{ msg.timestamp }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Photos App -->
          <div *ngIf="currentScreen === 'photos'" class="photos-app">
            <div class="app-header">
              <button class="back-btn" (click)="goHome()">‹ Back</button>
              <h2>Photos</h2>
            </div>
            <div class="photos-grid">
              <div *ngFor="let photo of photos" class="photo-item">
                <img [src]="photo.url" [alt]="photo.caption">
                <span class="photo-caption">{{ photo.caption }}</span>
              </div>
            </div>
          </div>

          <!-- Email App -->
          <div *ngIf="currentScreen === 'email'" class="email-app">
            <div class="app-header">
              <button class="back-btn" (click)="selectedEmail ? (selectedEmail = null) : goHome()">‹ Back</button>
              <h2>Mail</h2>
            </div>
            <!-- Email detail view -->
            <div *ngIf="selectedEmail" class="email-detail">
              <div class="email-detail-subject">{{ selectedEmail.subject }}</div>
              <div class="email-detail-meta">
                <span class="email-detail-from">De la: {{ selectedEmail.from }}</span>
                <span *ngIf="selectedEmail.to" class="email-detail-to">Catre: {{ selectedEmail.to }}</span>
                <span class="email-detail-time">{{ selectedEmail.time }}</span>
              </div>
              <div class="email-detail-body">{{ selectedEmail.body || selectedEmail.preview }}</div>
            </div>
            <!-- Folder tabs + list -->
            <ng-container *ngIf="!selectedEmail">
              <div class="email-folder-tabs">
                <button [class.active]="activeEmailFolder === 'inbox'" (click)="activeEmailFolder = 'inbox'">Inbox ({{ emailInbox.length }})</button>
                <button [class.active]="activeEmailFolder === 'sent'" (click)="activeEmailFolder = 'sent'">Trimise ({{ emailSent.length }})</button>
                <button [class.active]="activeEmailFolder === 'drafts'" (click)="activeEmailFolder = 'drafts'">Ciorne ({{ emailDrafts.length }})</button>
              </div>
              <div class="email-list">
                <ng-container [ngSwitch]="activeEmailFolder">
                  <ng-container *ngSwitchCase="'inbox'">
                    <div *ngFor="let email of emailInbox" class="email-item" (click)="selectedEmail = email">
                      <div class="email-from">{{ email.from }}</div>
                      <div class="email-subject">{{ email.subject }}</div>
                      <div class="email-preview">{{ email.preview || email.body }}</div>
                      <div class="email-time">{{ email.time }}</div>
                    </div>
                    <div *ngIf="emailInbox.length === 0" class="email-empty">Inbox gol</div>
                  </ng-container>
                  <ng-container *ngSwitchCase="'sent'">
                    <div *ngFor="let email of emailSent" class="email-item" (click)="selectedEmail = email">
                      <div class="email-from">Catre: {{ email.to || email.from }}</div>
                      <div class="email-subject">{{ email.subject }}</div>
                      <div class="email-preview">{{ email.preview || email.body }}</div>
                      <div class="email-time">{{ email.time }}</div>
                    </div>
                    <div *ngIf="emailSent.length === 0" class="email-empty">Niciun email trimis</div>
                  </ng-container>
                  <ng-container *ngSwitchCase="'drafts'">
                    <div *ngFor="let email of emailDrafts" class="email-item" (click)="selectedEmail = email">
                      <div class="email-from">{{ email.subject }}</div>
                      <div class="email-preview">{{ email.preview || email.body }}</div>
                      <div class="email-time">{{ email.time }}</div>
                    </div>
                    <div *ngIf="emailDrafts.length === 0" class="email-empty">Nicio ciorna</div>
                  </ng-container>
                </ng-container>
              </div>
            </ng-container>
          </div>

          <!-- Notes App -->
          <div *ngIf="currentScreen === 'notes'" class="notes-app">
            <div class="app-header">
              <button class="back-btn" (click)="goHome()">‹ Back</button>
              <h2>Notes</h2>
            </div>
            <div class="notes-list">
              <div *ngFor="let note of notes" class="note-item">
                <div class="note-title">{{ note.title }}</div>
                <div class="note-content">{{ note.content }}</div>
                <div class="note-time">{{ note.time }}</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Samsung Galaxy Android Template -->
    <div *ngIf="!loading && deviceType === 'Android'" class="samsung-container">
      <div class="samsung-device">
        <!-- Samsung Frame with curved edges -->
        <div class="samsung-frame">
          <!-- Front Camera Punch Hole -->
          <div class="camera-punch"></div>
          
          <!-- Samsung Status Bar -->
          <div class="samsung-status-bar">
            <div class="status-left">
              <span class="time">9:41</span>
            </div>
            <div class="status-right">
              <span class="status-icon">5G</span>
              <span class="status-icon">📶</span>
              <span class="status-icon">📡</span>
              <span class="status-icon">🔋 85%</span>
            </div>
          </div>

          <!-- Samsung Screen Content -->
          <div class="samsung-screen" 
               (touchstart)="onTouchStart($event)"
               (touchmove)="onTouchMove($event)"
               (touchend)="onTouchEnd()"
               (mousedown)="onMouseDown($event)"
               (mousemove)="onMouseMove($event)"
               (mouseup)="onMouseUp()">
            <!-- Home Screen with One UI -->
            <div *ngIf="currentScreen === 'home'" class="samsung-home">
              <!-- Wallpaper background is set via CSS -->
              
              <!-- Google Search Bar -->
              <div class="google-search-bar">
                <span class="search-icon">🔍</span>
                <span class="search-text">Search</span>
                <span class="google-lens">📷</span>
                <span class="google-voice">🎤</span>
              </div>
              
              <!-- App Icons Grid -->
              <div class="samsung-app-grid">
                <div class="samsung-app" (click)="openApp('messages')">
                  <div class="samsung-icon messages-samsung">
                    <span>💬</span>
                  </div>
                  <span>Messages</span>
                </div>
                <div class="samsung-app" (click)="openApp('photos')">
                  <div class="samsung-icon gallery-samsung">
                    <span>🖼️</span>
                  </div>
                  <span>Gallery</span>
                </div>
                <div class="samsung-app" (click)="openApp('email')">
                  <div class="samsung-icon email-samsung">
                    <span>📧</span>
                  </div>
                  <span>Gmail</span>
                </div>
                <div class="samsung-app" (click)="openApp('notes')">
                  <div class="samsung-icon notes-samsung">
                    <span>📝</span>
                  </div>
                  <span>Notes</span>
                </div>
                <div class="samsung-app">
                  <div class="samsung-icon phone-samsung">
                    <span>📞</span>
                  </div>
                  <span>Phone</span>
                </div>
                <div class="samsung-app">
                  <div class="samsung-icon contacts-samsung">
                    <span>👤</span>
                  </div>
                  <span>Contacts</span>
                </div>
                <div class="samsung-app">
                  <div class="samsung-icon camera-samsung">
                    <span>📸</span>
                  </div>
                  <span>Camera</span>
                </div>
                <div class="samsung-app">
                  <div class="samsung-icon settings-samsung">
                    <span>⚙️</span>
                  </div>
                  <span>Settings</span>
                </div>
              </div>
              
              <!-- Bottom Dock Icons -->
              <div class="samsung-dock">
                <div class="dock-app">
                  <div class="dock-icon chrome-icon">🌐</div>
                </div>
                <div class="dock-app" (click)="openApp('messages')">
                  <div class="dock-icon messages-icon">💬</div>
                </div>
                <div class="dock-app">
                  <div class="dock-icon phone-icon">📞</div>
                </div>
                <div class="dock-app">
                  <div class="dock-icon apps-icon">⊞</div>
                </div>
              </div>
            </div>

            <!-- Messages App (One UI Style) -->
            <div *ngIf="currentScreen === 'messages'" class="samsung-app-view">
              <div class="samsung-header">
                <button (click)="currentScreen = 'home'" class="samsung-back">←</button>
                <h2>Messages</h2>
                <button class="samsung-menu">⋮</button>
              </div>
              
              <div class="samsung-content">
                <div *ngIf="!selectedConversation" class="samsung-conversations">
                  <div *ngFor="let conv of conversations" class="samsung-conv-item" (click)="selectConversation(conv)">
                    <div class="samsung-contact-avatar">{{conv.avatar}}</div>
                    <div class="samsung-conv-info">
                      <div class="conv-top">
                        <strong>{{conv.contact}}</strong>
                        <span class="conv-time">{{conv.time}}</span>
                      </div>
                      <div class="conv-preview">{{conv.lastMessage}}</div>
                    </div>
                  </div>
                </div>
                
                <div *ngIf="selectedConversation" class="samsung-chat-view">
                  <div class="samsung-chat-messages">
                    <div *ngFor="let msg of selectedConversation.messages" 
                         [class]="msg.isOutgoing ? 'samsung-msg-sent' : 'samsung-msg-received'">
                      <div class="samsung-bubble">
                        <div class="bubble-content">{{msg.content}}</div>
                        <div class="bubble-time">{{msg.timestamp}}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Gallery App (Samsung Style) -->
            <div *ngIf="currentScreen === 'photos'" class="samsung-app-view">
              <div class="samsung-header">
                <button (click)="currentScreen = 'home'" class="samsung-back">←</button>
                <h2>Gallery</h2>
                <button class="samsung-menu">⋮</button>
              </div>
              <div class="samsung-gallery">
                <img *ngFor="let photo of photos" [src]="photo.url" [alt]="photo.caption" class="gallery-photo">
              </div>
            </div>

            <!-- Email App (Samsung Style) -->
            <div *ngIf="currentScreen === 'email'" class="samsung-app-view">
              <div class="samsung-header">
                <button (click)="selectedEmail ? (selectedEmail = null) : (currentScreen = 'home')" class="samsung-back">←</button>
                <h2>{{ selectedEmail ? selectedEmail.subject : 'Email' }}</h2>
                <button class="samsung-menu">⋮</button>
              </div>
              <!-- Email detail -->
              <div *ngIf="selectedEmail" class="samsung-email-detail">
                <div class="samsung-email-detail-meta">
                  <div><strong>De la:</strong> {{selectedEmail.from}}</div>
                  <div *ngIf="selectedEmail.to"><strong>Catre:</strong> {{selectedEmail.to}}</div>
                  <div><strong>Data:</strong> {{selectedEmail.time}}</div>
                </div>
                <div class="samsung-email-detail-body">{{selectedEmail.body || selectedEmail.preview}}</div>
              </div>
              <!-- Folder tabs + list -->
              <ng-container *ngIf="!selectedEmail">
                <div class="samsung-email-tabs">
                  <button [class.active-tab]="activeEmailFolder === 'inbox'" (click)="activeEmailFolder = 'inbox'">Inbox</button>
                  <button [class.active-tab]="activeEmailFolder === 'sent'" (click)="activeEmailFolder = 'sent'">Trimise</button>
                  <button [class.active-tab]="activeEmailFolder === 'drafts'" (click)="activeEmailFolder = 'drafts'">Ciorne</button>
                </div>
                <div class="samsung-email-list">
                  <ng-container [ngSwitch]="activeEmailFolder">
                    <ng-container *ngSwitchCase="'inbox'">
                      <div *ngFor="let email of emailInbox" class="samsung-email-item" (click)="selectedEmail = email">
                        <div class="email-sender">{{email.from}}</div>
                        <div class="email-subject">{{email.subject}}</div>
                        <div class="email-preview">{{email.preview || email.body}}</div>
                        <div class="email-time">{{email.time}}</div>
                      </div>
                      <div *ngIf="emailInbox.length === 0" style="padding:16px;color:#999">Inbox gol</div>
                    </ng-container>
                    <ng-container *ngSwitchCase="'sent'">
                      <div *ngFor="let email of emailSent" class="samsung-email-item" (click)="selectedEmail = email">
                        <div class="email-sender">Catre: {{email.to || email.from}}</div>
                        <div class="email-subject">{{email.subject}}</div>
                        <div class="email-preview">{{email.preview || email.body}}</div>
                        <div class="email-time">{{email.time}}</div>
                      </div>
                      <div *ngIf="emailSent.length === 0" style="padding:16px;color:#999">Niciun email trimis</div>
                    </ng-container>
                    <ng-container *ngSwitchCase="'drafts'">
                      <div *ngFor="let email of emailDrafts" class="samsung-email-item" (click)="selectedEmail = email">
                        <div class="email-subject">{{email.subject}}</div>
                        <div class="email-preview">{{email.preview || email.body}}</div>
                        <div class="email-time">{{email.time}}</div>
                      </div>
                      <div *ngIf="emailDrafts.length === 0" style="padding:16px;color:#999">Nicio ciorna</div>
                    </ng-container>
                  </ng-container>
                </div>
              </ng-container>
            </div>

            <!-- Samsung Notes App -->
            <div *ngIf="currentScreen === 'notes'" class="samsung-app-view">
              <div class="samsung-header">
                <button (click)="currentScreen = 'home'" class="samsung-back">←</button>
                <h2>Samsung Notes</h2>
                <button class="samsung-menu">⋮</button>
              </div>
              <div class="samsung-notes-grid">
                <div *ngFor="let note of notes" class="samsung-note-card">
                  <div class="note-title">{{note.title}}</div>
                  <div class="note-text">{{note.content}}</div>
                  <div class="note-date">{{note.time}}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Samsung Navigation Bar (One UI gesture bar) -->
          <div class="samsung-nav-bar">
            <div class="gesture-bar"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Windows Laptop Template -->
    <div *ngIf="!loading && deviceType === 'Laptop'" class="laptop-container">
      <div class="laptop-screen">
        <!-- Windows 11 Desktop -->
        <div class="win11-desktop">
          <!-- Desktop Icons (left side) -->
          <div *ngIf="currentScreen === 'home'" class="win11-desktop-icons">
            <div class="win11-desktop-icon" (click)="openApp('messages')">
              <div class="win11-icon-img">💬</div>
              <span>Messages</span>
            </div>
            <div class="win11-desktop-icon" (click)="openApp('photos')">
              <div class="win11-icon-img">📷</div>
              <span>Photos</span>
            </div>
            <div class="win11-desktop-icon" (click)="openApp('email')">
              <div class="win11-icon-img">📧</div>
              <span>Mail</span>
            </div>
            <div class="win11-desktop-icon" (click)="openApp('notes')">
              <div class="win11-icon-img">📝</div>
              <span>Notes</span>
            </div>
          </div>

          <!-- Application Windows -->
          <div *ngIf="currentScreen === 'messages'" class="windows-window">
            <div class="window-title-bar">
              <span>Messages - {{ ownerName }}</span>
              <div class="window-controls">
                <button (click)="currentScreen = 'home'">−</button>
                <button>□</button>
                <button (click)="currentScreen = 'home'">✕</button>
              </div>
            </div>
            <div class="window-content">
              <div class="windows-sidebar">
                <div *ngFor="let conv of conversations" class="windows-conv" (click)="selectConversation(conv)">
                  <div class="win-avatar">{{conv.avatar}}</div>
                  <div class="win-conv-info">
                    <strong>{{conv.contact}}</strong>
                    <p>{{conv.lastMessage}}</p>
                  </div>
                </div>
              </div>
              <div class="windows-chat-area">
                <div *ngIf="selectedConversation" class="windows-messages">
                  <div *ngFor="let msg of selectedConversation.messages" 
                       [class]="msg.isOutgoing ? 'win-msg-out' : 'win-msg-in'">
                    <div class="win-bubble">
                      <div class="win-sender">{{msg.sender}}</div>
                      <div>{{msg.content}}</div>
                      <div class="win-time">{{msg.timestamp}}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Windows: Photos Window -->
          <div *ngIf="currentScreen === 'photos'" class="windows-window">
            <div class="window-title-bar">
              <span>Photos</span>
              <div class="window-controls">
                <button (click)="currentScreen = 'home'">−</button>
                <button>□</button>
                <button (click)="currentScreen = 'home'">✕</button>
              </div>
            </div>
            <div class="window-photo-grid">
              <img *ngFor="let photo of photos" [src]="photo.url" [alt]="photo.caption" class="win-photo">
            </div>
          </div>

          <!-- Windows: Email Window -->
          <div *ngIf="currentScreen === 'email'" class="windows-window">
            <div class="window-title-bar">
              <span>Mail — {{ ownerName }}</span>
              <div class="window-controls">
                <button (click)="currentScreen = 'home'">−</button>
                <button>□</button>
                <button (click)="currentScreen = 'home'">✕</button>
              </div>
            </div>
            <div class="windows-email-layout">
              <!-- Left sidebar: folder list + email items -->
              <div class="windows-email-sidebar">
                <div class="win-email-folders">
                  <div [class.active-folder]="activeEmailFolder === 'inbox'" (click)="activeEmailFolder = 'inbox'; selectedEmail = null" class="win-folder">📥 Inbox ({{emailInbox.length}})</div>
                  <div [class.active-folder]="activeEmailFolder === 'sent'" (click)="activeEmailFolder = 'sent'; selectedEmail = null" class="win-folder">📤 Trimise ({{emailSent.length}})</div>
                  <div [class.active-folder]="activeEmailFolder === 'drafts'" (click)="activeEmailFolder = 'drafts'; selectedEmail = null" class="win-folder">📝 Ciorne ({{emailDrafts.length}})</div>
                </div>
                <div class="win-email-list">
                  <ng-container [ngSwitch]="activeEmailFolder">
                    <ng-container *ngSwitchCase="'inbox'">
                      <div *ngFor="let email of emailInbox" class="windows-email" [class.selected-email]="selectedEmail === email" (click)="selectedEmail = email">
                        <div class="email-header"><strong>{{email.from}}</strong><span>{{email.time}}</span></div>
                        <div class="email-subject">{{email.subject}}</div>
                        <p class="email-preview">{{email.preview || email.body}}</p>
                      </div>
                      <div *ngIf="emailInbox.length === 0" class="win-empty-folder">Inbox gol</div>
                    </ng-container>
                    <ng-container *ngSwitchCase="'sent'">
                      <div *ngFor="let email of emailSent" class="windows-email" [class.selected-email]="selectedEmail === email" (click)="selectedEmail = email">
                        <div class="email-header"><strong>Catre: {{email.to || email.from}}</strong><span>{{email.time}}</span></div>
                        <div class="email-subject">{{email.subject}}</div>
                        <p class="email-preview">{{email.preview || email.body}}</p>
                      </div>
                      <div *ngIf="emailSent.length === 0" class="win-empty-folder">Niciun email trimis</div>
                    </ng-container>
                    <ng-container *ngSwitchCase="'drafts'">
                      <div *ngFor="let email of emailDrafts" class="windows-email" [class.selected-email]="selectedEmail === email" (click)="selectedEmail = email">
                        <div class="email-subject">{{email.subject}}</div>
                        <p class="email-preview">{{email.preview || email.body}}</p>
                      </div>
                      <div *ngIf="emailDrafts.length === 0" class="win-empty-folder">Nicio ciorna</div>
                    </ng-container>
                  </ng-container>
                </div>
              </div>
              <!-- Right panel: email body -->
              <div class="windows-email-body-panel">
                <ng-container *ngIf="selectedEmail">
                  <div class="win-email-detail-subject">{{selectedEmail.subject}}</div>
                  <div class="win-email-detail-meta">
                    <div><strong>De la:</strong> {{selectedEmail.from}}</div>
                    <div *ngIf="selectedEmail.to"><strong>Catre:</strong> {{selectedEmail.to}}</div>
                    <div><strong>Data:</strong> {{selectedEmail.time}}</div>
                  </div>
                  <div class="win-email-detail-body">{{selectedEmail.body || selectedEmail.preview}}</div>
                </ng-container>
                <div *ngIf="!selectedEmail" class="win-email-placeholder">Selecteaza un email pentru a-l citi</div>
              </div>
            </div>
          </div>

          <!-- Windows: Notes Window -->
          <div *ngIf="currentScreen === 'notes'" class="windows-window">
            <div class="window-title-bar">
              <span>Sticky Notes</span>
              <div class="window-controls">
                <button (click)="currentScreen = 'home'">−</button>
                <button>□</button>
                <button (click)="currentScreen = 'home'">✕</button>
              </div>
            </div>
            <div class="windows-notes">
              <div *ngFor="let note of notes" class="windows-note">
                <h4>{{note.title}}</h4>
                <p>{{note.content}}</p>
                <small>{{note.time}}</small>
              </div>
            </div>
            </div>
          </div>

          <!-- Windows 11 Taskbar -->
          <div class="win11-taskbar">
            <div class="win11-taskbar-left"></div>
            <div class="win11-taskbar-center">
              <div class="win11-start-btn">⊞</div>
              <div class="win11-search">
                <span>🔍</span>
                <span>Search</span>
              </div>
              <div class="win11-taskbar-icon" (click)="openApp('messages')">💬</div>
              <div class="win11-taskbar-icon" (click)="openApp('photos')">📷</div>
              <div class="win11-taskbar-icon" (click)="openApp('email')">📧</div>
              <div class="win11-taskbar-icon">🌐</div>
              <div class="win11-taskbar-icon">📁</div>
            </div>
            <div class="win11-system-tray">
              <span>🔊</span>
              <span>📶</span>
              <span>🔋</span>
              <span class="win11-time">5:32 PM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .iphone-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      width: 100vw;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 0;
      overflow: hidden;
      position: fixed;
      top: 0;
      left: 0;
    }

    .iphone-frame {
      width: 280px;
      height: 560px;
      background: #1c1c1e;
      border-radius: 36px;
      overflow: hidden;
      box-shadow: 0 0 40px rgba(0, 0, 0, 0.8);
      position: relative;
      border: none;
    }

    .iphone-notch {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 180px;
      height: 28px;
      background: #000;
      border-radius: 0 0 20px 20px;
      z-index: 10;
    }

    .status-bar {
      height: 44px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 20px;
      padding-top: 8px;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      background: linear-gradient(to bottom, rgba(0,0,0,0.3), transparent);
    }

    .status-icons {
      display: flex;
      gap: 5px;
    }

    .screen-content {
      background: #f5f5f7;
      height: calc(100% - 44px - 34px);
      overflow: hidden;
    }

    /* Hide scrollbars for iPhone */
    .screen-content::-webkit-scrollbar {
      display: none;
    }

    .screen-content {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    .home-indicator {
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      width: 134px;
      height: 5px;
      background: #fff;
      border-radius: 3px;
    }

    .home-screen {
      padding: 30px 20px 20px;
      height: 100%;
      display: flex;
      flex-direction: column;
      background-image: url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=600&fit=crop');
      background-size: cover;
      background-position: center;
      position: relative;
    }

    .home-screen::before {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.15);
      z-index: 0;
    }
    .app-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px 16px;
      padding: 0 16px;
      position: relative;
      z-index: 1;
    }

    .app-icon {
      text-align: center;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .app-icon:active {
      transform: scale(0.9);
    }

    .icon {
      width: 60px;
      height: 60px;
      border-radius: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 30px;
      margin-bottom: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.25);
    }

    .messages-ios { background: linear-gradient(135deg, #7FD857 0%, #5FC74E 100%); }
    .calendar-ios { background: linear-gradient(135deg, #FF453A 0%, #FF375F 100%); }
    .photos-ios { background: linear-gradient(135deg, #FFD60A 0%, #FFCC00 100%); }
    .camera-ios { background: linear-gradient(135deg, #8E8E93 0%, #636366 100%); }
    .mail-ios { background: linear-gradient(135deg, #0A84FF 0%, #007AFF 100%); }
    .clock-ios { background: linear-gradient(135deg, #1C1C1E 0%, #000000 100%); }
    .maps-ios { background: linear-gradient(135deg, #30D158 0%, #34C759 100%); }
    .weather-ios { background: linear-gradient(135deg, #64D2FF 0%, #5AC8FA 100%); }
    .reminders-ios { background: linear-gradient(135deg, #FF453A 0%, #FF3B30 100%); }
    .notes-ios { background: linear-gradient(135deg, #FFD60A 0%, #FFCC00 100%); }
    .stocks-ios { background: linear-gradient(135deg, #1C1C1E 0%, #000000 100%); }
    .wallet-ios { background: linear-gradient(135deg, #1C1C1E 0%, #000000 100%); }
    .settings-ios { background: linear-gradient(135deg, #8E8E93 0%, #636366 100%); }
    .health-ios { background: linear-gradient(135deg, #FF453A 0%, #FF2D55 100%); }
    .podcasts-ios { background: linear-gradient(135deg, #BF5AF2 0%, #AF52DE 100%); }
    .appstore-ios { background: linear-gradient(135deg, #0A84FF 0%, #007AFF 100%); }
    .phone-ios { background: linear-gradient(135deg, #34C759 0%, #30D158 100%); }
    .safari-ios { background: linear-gradient(135deg, #007AFF 0%, #0A84FF 100%); }
    .music-ios { background: linear-gradient(135deg, #FF375F 0%, #FF453A 100%); }

    .app-icon span {
      font-size: 11px;
      color: white;
      text-shadow: 0 1px 3px rgba(0,0,0,0.7);
      text-align: center;
      font-weight: 400;
    }

    .ios-dock {
      display: none;
    }

    .device-owner {
      text-align: center;
      color: #666;
      margin-top: 20px;
    }

    .app-header {
      background: #f8f8f8;
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid #e0e0e0;
    }

    .back-btn {
      background: none;
      border: none;
      color: #007aff;
      font-size: 18px;
      cursor: pointer;
      padding: 5px 10px;
    }

    .app-header h2 {
      margin: 0;
      font-size: 17px;
      font-weight: 600;
    }

    .conversations-list, .notes-list, .email-list {
      background: #fff;
    }

    .conversation-item, .note-item, .email-item {
      padding: 12px 16px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      gap: 12px;
      cursor: pointer;
    }

    .conversation-item:active { background: #f0f0f0; }

    .avatar {
      width: 50px;
      height: 50px;
      borderradius: 50%;
      background: #007aff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
    }

    .conversation-info {
      flex: 1;
    }

    .contact-name, .email-from, .note-title {
      font-weight: 600;
      margin-bottom: 4px;
    }

    .last-message, .email-preview, .note-content {
      color: #666;
      font-size: 14px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .messages-container {
      padding: 20px;
      background: #fff;
      height: calc(100% - 60px);
      overflow-y: auto;
    }

    .message-bubble {
      margin-bottom: 15px;
      max-width: 70%;
      padding: 10px 15px;
      border-radius: 18px;
    }

    .message-bubble.incoming {
      background: #e5e5ea;
      color: #000;
      margin-right: auto;
    }

    .message-bubble.outgoing {
      background: #007aff;
      color: #fff;
      margin-left: auto;
    }

    .message-content {
      margin: 5px 0;
    }

    .message-time {
      font-size: 11px;
      opacity: 0.6;
      margin-top: 3px;
    }

    .photos-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2px;
      padding: 2px;
    }

    .photo-item {
      aspect-ratio: 1;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }

    .photo-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .photo-caption {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0,0,0,0.7);
      color: #fff;
      padding: 5px;
      font-size: 11px;
    }

    /* Samsung Galaxy One UI Styles */
    .samsung-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      width: 100vw;
      background: linear-gradient(135deg, #1B4F72 0%, #2E86C1 50%, #5DADE2 100%);
      padding: 0;
      overflow: hidden;
      position: fixed;
      top: 0;
      left: 0;
    }

    .samsung-frame {
      width: 280px;
      height: 560px;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
      border-radius: 36px;
      overflow: hidden;
      box-shadow: 0 0 40px rgba(0, 0, 0, 0.8);
      position: relative;
      border: none;
    }

    .camera-punch {
      position: absolute;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      width: 12px;
      height: 12px;
      background: #0a0a0a;
      border-radius: 50%;
      z-index: 100;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.1);
    }

    .samsung-status-bar {
      background: transparent;
      color: white;
      padding: 28px 20px 8px;
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      z-index: 50;
    }

    .status-left, .status-right {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .status-icon {
      font-size: 11px;
      opacity: 0.9;
    }

    .samsung-screen {
      background: linear-gradient(135deg, #1E3A5F 0%, #1B1464 100%);
      height: calc(100% - 50px - 30px);
      overflow: hidden;
    }

    .samsung-nav-bar {
      background: #000;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .gesture-bar {
      width: 140px;
      height: 4px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
    }

    .samsung-home {
      padding: 20px;
      height: 100%;
      display: flex;
      flex-direction: column;
      background-image: url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop');
      background-size: cover;
      background-position: center;
      position: relative;
    }

    .samsung-home::before {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.3);
      z-index: 0;
    }

    .google-search-bar {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 28px;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      position: relative;
      z-index: 1;
    }

    .search-icon {
      font-size: 18px;
      opacity: 0.6;
    }

    .search-text {
      flex: 1;
      color: #666;
      font-size: 15px;
    }

    .google-lens, .google-voice {
      font-size: 18px;
      opacity: 0.6;
    }

    .samsung-app-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      padding: 0;
      margin-bottom: auto;
      position: relative;
      z-index: 1;
    }

    .samsung-app {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      color: white;
    }

    .samsung-icon {
      width: 64px;
      height: 64px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      margin-bottom: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }

    .messages-samsung { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .gallery-samsung { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
    .email-samsung { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
    .notes-samsung { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
    .phone-samsung { background: linear-gradient(135deg, #00c6ff 0%, #0072ff 100%); }
    .contacts-samsung { background: linear-gradient(135deg, #f857a6 0%, #ff5858 100%); }
    .camera-samsung { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); }
    .settings-samsung { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }

    .samsung-dock {
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(20px);
      border-radius: 24px;
      padding: 12px 20px;
      display: flex;
      justify-content: space-around;
      align-items: center;
      margin: 0 -8px;
      position: relative;
      z-index: 1;
    }

    .dock-app {
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .dock-icon {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }

    .samsung-app span {
      font-size: 12px;
      text-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }

    .samsung-app-view {
      background: white;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .samsung-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .samsung-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
      flex: 1;
      text-align: center;
    }

    .samsung-back, .samsung-menu {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      width: 40px;
      height: 40px;
    }

    .samsung-content {
      flex: 1;
      overflow: hidden;
      max-height: 100%;
    }

    .samsung-conversations {
      padding: 8px 0;
      max-height: calc(100vh - 200px);
      overflow: hidden;
    }

    /* Hide all scrollbars in phone */
    .samsung-screen::-webkit-scrollbar,
    .samsung-content::-webkit-scrollbar,
    .samsung-conversations::-webkit-scrollbar,
    .samsung-chat-messages::-webkit-scrollbar {
      display: none;
    }

    .samsung-screen,
    .samsung-content,
    .samsung-conversations,
    .samsung-chat-messages {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    .samsung-conv-item {
      display: flex;
      padding: 16px 20px;
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
      align-items: center;
    }

    .samsung-conv-item:active { background: #f5f5f5; }

    .samsung-contact-avatar {
      width: 56px;
      height: 56px;
      border-radius: 28px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      margin-right: 16px;
    }

    .samsung-conv-info {
      flex: 1;
      min-width: 0;
    }

    .conv-top {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .conv-top strong { font-size: 16px; }
    .conv-time { font-size: 13px; color: #999; }
    .conv-preview { font-size: 14px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .samsung-chat-messages {
      padding: 20px;
      overflow: hidden;
      max-height: 100%;
    }

    .samsung-msg-received, .samsung-msg-sent {
      display: flex;
      margin-bottom: 12px;
    }

    .samsung-msg-sent { justify-content: flex-end; }

    .samsung-bubble {
      max-width: 75%;
      padding: 12px 16px;
      border-radius: 18px;
    }

    .samsung-msg-received .samsung-bubble {
      background: #E8E8E8;
      color: #000;
      border-bottom-left-radius: 4px;
    }

    .samsung-msg-sent .samsung-bubble {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-bottom-right-radius: 4px;
    }

    .bubble-content { font-size: 15px; line-height: 1.4; margin-bottom: 4px; }
    .bubble-time { font-size: 11px; opacity: 0.7; text-align: right; }

    .samsung-gallery {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2px;
      padding: 2px;
    }

    .gallery-photo {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
    }

    .samsung-email-list { padding: 0; }

    .samsung-email-item {
      padding: 16px 20px;
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
    }

    .samsung-email-item:active { background: #f5f5f5; }

    .email-sender { font-weight: 600; font-size: 15px; margin-bottom: 4px; }
    .email-subject { font-size: 14px; color: #333; margin-bottom: 4px; }
    .email-preview { font-size: 13px; color: #666; }
    .email-time { font-size: 12px; color: #999; }

    .samsung-notes-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      padding: 16px;
    }

    .samsung-note-card {
      background: linear-gradient(135deg, #FFE47A 0%, #FFD93D 100%);
      border-radius: 12px;
      padding: 16px;
      min-height: 140px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .note-title { font-weight: 600; font-size: 15px; margin-bottom: 8px; }
    .note-text { font-size: 13px; color: #555; margin-bottom: 8px; }
    .note-date { font-size: 11px; color: #888; }

    /* Windows 11 Laptop Styles */
    .laptop-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      width: 100vw;
      background: linear-gradient(135deg, #0078D4 0%, #00BCF2 100%);
      padding: 0;
      overflow: hidden;
      position: fixed;
      top: 0;
      left: 0;
    }

    .laptop-screen {
      width: 90vw;
      max-width: 1100px;
      height: 85vh;
      background: #F3F3F3;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }

    .win11-desktop {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #0078D4 0%, #00A6ED 25%, #0066CC 50%, #0050B3 75%, #0078D4 100%);
      background-size: cover;
      background-position: center;
      position: relative;
      display: flex;
      flex-direction: column;
    }

    .win11-desktop-icons {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .win11-desktop-icon {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      width: 80px;
    }

    .win11-icon-img {
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      margin-bottom: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }

    .win11-desktop-icon span {
      font-size: 12px;
      color: white;
      text-shadow: 0 1px 3px rgba(0,0,0,0.8);
    }

    .win11-taskbar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 48px;
      background: rgba(243, 243, 243, 0.8);
      backdrop-filter: blur(30px);
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 12px;
    }

    .win11-taskbar-left {
      flex: 1;
    }

    .win11-taskbar-center {
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(255, 255, 255, 0.4);
      padding: 4px 8px;
      border-radius: 8px;
    }

    .win11-start-btn {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border-radius: 4px;
      font-size: 20px;
      transition: background 0.2s;
    }

    .win11-start-btn:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    .win11-search {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.7);
      border-radius: 20px;
      min-width: 180px;
      cursor: pointer;
      font-size: 13px;
      color: #666;
    }

    .win11-taskbar-icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      cursor: pointer;
      border-radius: 4px;
      transition: background 0.2s;
    }

    .win11-taskbar-icon:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    .win11-system-tray {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(255, 255, 255, 0.4);
      padding: 4px 12px;
      border-radius: 8px;
      font-size: 14px;
    }

    .win11-time {
      font-size: 12px;
    }

    .windows-window {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 80%;
      max-width: 800px;
      height: 70%;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      display: flex;
      flex-direction: column;
    }

    .window-title-bar {
      background: white;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #e0e0e0;
    }

    .window-controls {
      display: flex;
      gap: 12px;
    }

    .window-controls button {
      background: none;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .window-controls button:hover {
      background: #e0e0e0;
    }

    .window-controls button:last-child:hover {
      background: #e81123;
      color: white;
    }

    .window-content {
      flex: 1;
      display: flex;
      overflow: hidden;
    }

    .windows-sidebar {
      width: 300px;
      border-right: 1px solid #e0e0e0;
      overflow-y: auto;
      background: #fafafa;
    }

    .windows-conv {
      padding: 12px;
      border-bottom: 1px solid #e0e0e0;
      cursor: pointer;
      display: flex;
      gap: 12px;
    }

    .windows-conv:hover {
      background: #f0f0f0;
    }

    .win-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #0078D4;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      color: white;
    }

    .win-conv-info strong {
      display: block;
      margin-bottom: 4px;
    }

    .win-conv-info p {
      font-size: 13px;
      color: #666;
      margin: 0;
    }

    .windows-chat-area {
      flex: 1;
      overflow-y: auto;
    }

    .windows-messages {
      padding: 20px;
    }

    .win-msg-in, .win-msg-out {
      margin-bottom: 16px;
      display: flex;
    }

    .win-msg-out {
      justify-content: flex-end;
    }

    .win-bubble {
      max-width: 70%;
      padding: 12px;
      border-radius: 8px;
    }

    .win-msg-in .win-bubble {
      background: #f0f0f0;
    }

    .win-msg-out .win-bubble {
      background: #0078D4;
      color: white;
    }

    .win-sender {
      font-weight: 600;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .win-time {
      font-size: 11px;
      opacity: 0.7;
      margin-top: 4px;
    }

    .window-photo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 8px;
      padding: 16px;
      overflow-y: auto;
    }

    .win-photo {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      border-radius: 4px;
    }

    .windows-email-list {
      padding: 16px;
      overflow-y: auto;
    }

    /* ── New: two-column email layout for Laptop ── */
    .windows-email-layout {
      display: flex;
      height: calc(100% - 40px);
      overflow: hidden;
    }
    .windows-email-sidebar {
      width: 320px;
      border-right: 1px solid #e0e0e0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .win-email-folders {
      border-bottom: 1px solid #e0e0e0;
      padding: 8px 0;
    }
    .win-folder {
      padding: 8px 16px;
      cursor: pointer;
      font-size: 13px;
      color: #444;
    }
    .win-folder:hover { background: #f0f0f0; }
    .win-folder.active-folder { background: #dce9ff; font-weight: 600; color: #0078d4; }
    .win-email-list { overflow-y: auto; flex: 1; }
    .windows-email-body-panel {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      background: #fff;
    }
    .win-email-detail-subject { font-size: 20px; font-weight: 700; margin-bottom: 12px; }
    .win-email-detail-meta { font-size: 13px; color: #555; margin-bottom: 16px; line-height: 1.8; border-bottom: 1px solid #e0e0e0; padding-bottom: 12px; }
    .win-email-detail-body { font-size: 14px; color: #222; white-space: pre-wrap; line-height: 1.7; }
    .win-email-placeholder { color: #999; font-size: 14px; text-align: center; margin-top: 60px; }
    .win-empty-folder { padding: 16px; color: #999; font-size: 13px; }

    .windows-email {
      padding: 12px 16px;
      border-bottom: 1px solid #e0e0e0;
      cursor: pointer;
    }
    .windows-email:hover { background: #f8f8f8; }
    .windows-email.selected-email { background: #dce9ff; }

    .email-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .email-subject { font-weight: 600; margin-bottom: 4px; font-size: 13px; }
    .email-preview { color: #666; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* ── iPhone email folder tabs ── */
    .email-folder-tabs {
      display: flex;
      border-bottom: 1px solid #ddd;
    }
    .email-folder-tabs button {
      flex: 1;
      padding: 10px 4px;
      border: none;
      background: transparent;
      font-size: 12px;
      color: #007aff;
      cursor: pointer;
    }
    .email-folder-tabs button.active { font-weight: 700; border-bottom: 2px solid #007aff; color: #007aff; }
    .email-detail {
      padding: 16px;
      overflow-y: auto;
    }
    .email-detail-subject { font-size: 17px; font-weight: 700; margin-bottom: 8px; }
    .email-detail-meta { font-size: 12px; color: #888; margin-bottom: 12px; display: flex; flex-direction: column; gap: 2px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
    .email-detail-body { font-size: 14px; color: #222; white-space: pre-wrap; line-height: 1.6; }
    .email-empty { padding: 16px; color: #999; font-size: 13px; text-align: center; }

    /* ── Samsung email folder tabs ── */
    .samsung-email-tabs {
      display: flex;
      border-bottom: 1px solid #ddd;
      background: #fff;
    }
    .samsung-email-tabs button {
      flex: 1;
      padding: 12px 4px;
      border: none;
      background: transparent;
      font-size: 13px;
      color: #1a73e8;
      cursor: pointer;
    }
    .samsung-email-tabs button.active-tab { font-weight: 700; border-bottom: 2px solid #1a73e8; }
    .samsung-email-detail { padding: 16px; overflow-y: auto; }
    .samsung-email-detail-meta { font-size: 13px; color: #555; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 10px; line-height: 1.8; }
    .samsung-email-detail-body { font-size: 14px; color: #222; white-space: pre-wrap; line-height: 1.7; }

    .windows-notes {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 16px;
      padding: 16px;
      overflow-y: auto;
    }

    .windows-note {
      background: #FFF4A3;
      padding: 16px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .windows-note h4 {
      margin: 0 0 8px 0;
    }

    .windows-note p {
      margin: 0 0 8px 0;
      font-size: 14px;
    }

    .windows-note small {
      color: #666;
      font-size: 12px;
    }
  `]
})
export class IPhoneSimulatorComponent implements OnInit {
  gameId: number = 0;
  deviceId: number = 0;
  ownerName: string = 'Device';
  currentScreen: string = 'home';
  selectedConversation: Conversation | null = null;
  loading: boolean = true;
  deviceType: string = 'iPhone'; // iPhone, Android, or Laptop

  conversations: Conversation[] = [];
  photos: any[] = [];
  emails: any[] = [];       // legacy flat (kept for backward compat)
  emailInbox: any[] = [];
  emailSent: any[] = [];
  emailDrafts: any[] = [];
  activeEmailFolder: 'inbox' | 'sent' | 'drafts' = 'inbox';
  selectedEmail: any = null;
  notes: any[] = [];

  // Swipe detection properties
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchEndX: number = 0;
  private touchEndY: number = 0;
  private readonly swipeThreshold: number = 50; // minimum distance for swipe

  constructor(
    private route: ActivatedRoute,
    private deviceService: DeviceService
  ) { }

  ngOnInit() {
    const gameIdParam = this.route.snapshot.paramMap.get('gameId');
    const deviceIdParam = this.route.snapshot.paramMap.get('deviceId');

    if (gameIdParam && deviceIdParam) {
      this.gameId = parseInt(gameIdParam);
      this.deviceId = parseInt(deviceIdParam);
      this.loadDeviceData();
    }
  }

  loadDeviceData() {
    this.deviceService.getDeviceWithApps(this.gameId, this.deviceId).subscribe({
      next: (device) => {
        this.ownerName = device.ownerName;
        this.deviceType = device.deviceType || 'iPhone'; // Capture device type

        // Load app data
        device.apps.forEach((app: any) => {
          if (app.appType === 'Messages' && app.appData?.conversations) {
            this.conversations = app.appData.conversations;
          } else if (app.appType === 'Photos' && app.appData?.photos) {
            this.photos = app.appData.photos;
          } else if (app.appType === 'Email') {
            const data = app.appData;
            if (data) {
              this.emailInbox = data.inbox ?? [];
              this.emailSent = data.sent ?? [];
              this.emailDrafts = data.drafts ?? [];
              // Legacy flat emails fallback: redistribute into inbox if no structured folders
              if (this.emailInbox.length === 0 && this.emailSent.length === 0 && (data.emails ?? []).length > 0) {
                this.emailInbox = data.emails;
              }
              // Keep flat merged list for legacy rendering
              this.emails = [...this.emailInbox, ...this.emailSent, ...this.emailDrafts];
            }
          } else if (app.appType === 'Notes' && app.appData?.notes) {
            this.notes = app.appData.notes;
          }
        });

        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading device:', error);
        this.loading = false;
        // Fallback to demo data
        this.loadDemoData();
      }
    });
  }

  loadDemoData() {
    this.ownerName = 'Evidence';
    this.conversations = [
      {
        contact: 'Detective Wilson',
        avatar: '🕵️',
        lastMessage: 'I need to speak with you about the incident',
        time: '2:45 PM',
        messages: [
          { sender: 'Detective Wilson', content: 'Hello, I need to ask you a few questions', timestamp: '2:30 PM', isOutgoing: false },
          { sender: 'Me', content: 'Of course, what do you need to know?', timestamp: '2:32 PM', isOutgoing: true },
          { sender: 'Detective Wilson', content: 'Where were you last night between 8 and 10 PM?', timestamp: '2:35 PM', isOutgoing: false },
          { sender: 'Me', content: 'I was at home watching TV', timestamp: '2:40 PM', isOutgoing: true },
          { sender: 'Detective Wilson', content: 'I need to speak with you about the incident', timestamp: '2:45 PM', isOutgoing: false }
        ]
      },
      {
        contact: 'Sarah Mitchell',
        avatar: '👩',
        lastMessage: 'Did you hear what happened?',
        time: '1:20 PM',
        messages: [
          { sender: 'Sarah Mitchell', content: 'OMG did you hear what happened?', timestamp: '1:15 PM', isOutgoing: false },
          { sender: 'Me', content: 'No, what?', timestamp: '1:18 PM', isOutgoing: true },
          { sender: 'Sarah Mitchell', content: 'Did you hear what happened?', timestamp: '1:20 PM', isOutgoing: false }
        ]
      }
    ];

    this.photos = [
      { url: 'https://via.placeholder.com/300x300/007aff/fff?text=Photo+1', caption: 'Office Party - Oct 15' },
      { url: 'https://via.placeholder.com/300x300/ff2d55/fff?text=Photo+2', caption: 'Evidence Found' },
      { url: 'https://via.placeholder.com/300x300/ffd60a/000?text=Photo+3', caption: 'Last seen location' }
    ];

    this.emails = [
      { from: 'boss@company.com', subject: 'Urgent Meeting Required', preview: 'We need to discuss the recent developments...', time: '10:30 AM' },
      { from: 'unknown@email.com', subject: 'You need to see this', preview: 'The truth about what happened that night...', time: 'Yesterday' }
    ];

    this.notes = [
      { title: 'Things to Remember', content: 'Call lawyer at 3PM. Don\'t forget the meeting with...', time: 'Oct 20' },
      { title: 'Suspicious Activity', content: 'Saw someone lurking near the building around midnight...', time: 'Oct 19' }
    ];
  }

  openApp(appName: string) {
    this.currentScreen = appName;
  }

  goHome() {
    this.currentScreen = 'home';
    this.selectedConversation = null;
  }

  selectConversation(conv: Conversation) {
    this.selectedConversation = conv;
  }

  // Swipe gesture detection methods
  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0].screenX;
    this.touchStartY = event.changedTouches[0].screenY;
  }

  onTouchMove(event: TouchEvent) {
    this.touchEndX = event.changedTouches[0].screenX;
    this.touchEndY = event.changedTouches[0].screenY;
  }

  onTouchEnd() {
    this.handleSwipe();
  }

  // Mouse events for desktop testing
  onMouseDown(event: MouseEvent) {
    this.touchStartX = event.screenX;
    this.touchStartY = event.screenY;
  }

  onMouseMove(event: MouseEvent) {
    if (this.touchStartX !== 0) {
      this.touchEndX = event.screenX;
      this.touchEndY = event.screenY;
    }
  }

  onMouseUp() {
    if (this.touchStartX !== 0) {
      this.handleSwipe();
      this.touchStartX = 0;
      this.touchEndX = 0;
    }
  }

  private handleSwipe() {
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;

    // Check if horizontal swipe is larger than vertical (to distinguish from scroll)
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Swipe right (go back)
      if (deltaX > this.swipeThreshold) {
        if (this.selectedConversation) {
          this.selectedConversation = null;
        } else if (this.currentScreen !== 'home') {
          this.goHome();
        }
      }
      // Swipe left could be used for other navigation if needed
      else if (deltaX < -this.swipeThreshold) {
        // Future: navigate to other screens
      }
    }

    // Reset touch positions
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
  }
}
