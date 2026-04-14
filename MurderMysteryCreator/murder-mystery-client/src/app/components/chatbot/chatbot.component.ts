import {
    Component,
    Input,
    OnChanges,
    SimpleChanges,
    ViewChild,
    ElementRef,
    AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService, ChatHistoryEntry } from '../../services/chatbot.service';

interface ChatBubble {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

@Component({
    selector: 'app-chatbot',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './chatbot.component.html',
    styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements OnChanges, AfterViewChecked {
    @Input() gameId: number = 0;
    @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLElement>;

    isOpen = false;
    inputMessage = '';
    isLoading = false;
    bubbles: ChatBubble[] = [];

    private shouldScrollToBottom = false;

    constructor(private chatbotService: ChatbotService) { }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['gameId']) {
            this.bubbles = [];
        }
    }

    ngAfterViewChecked() {
        if (this.shouldScrollToBottom) {
            this.scrollToBottom();
            this.shouldScrollToBottom = false;
        }
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        if (this.isOpen && this.bubbles.length === 0) {
            this.addWelcomeBubble();
        }
        if (this.isOpen) {
            this.shouldScrollToBottom = true;
        }
    }

    private addWelcomeBubble() {
        this.bubbles.push({
            role: 'assistant',
            content: '🕵️ Salut, investigator! Sunt asistentul tău misterios. Pune-mi orice întrebare despre joc și îți voi oferi indicii… fără spoilere.',
            timestamp: new Date()
        });
    }

    sendMessage() {
        const text = this.inputMessage.trim();
        if (!text || this.isLoading || !this.gameId) return;

        this.bubbles.push({ role: 'user', content: text, timestamp: new Date() });
        this.inputMessage = '';
        this.isLoading = true;
        this.shouldScrollToBottom = true;

        const history: ChatHistoryEntry[] = this.bubbles
            .slice(0, -1) // exclude the just-added user bubble (already there)
            .map(b => ({ role: b.role, content: b.content }));

        this.chatbotService.sendMessage(this.gameId, {
            message: text,
            conversationHistory: history
        }).subscribe({
            next: (res) => {
                this.bubbles.push({ role: 'assistant', content: res.reply, timestamp: new Date() });
                this.isLoading = false;
                this.shouldScrollToBottom = true;
            },
            error: () => {
                this.bubbles.push({
                    role: 'assistant',
                    content: '⚠️ Umbrele sunt prea dense acum… încearcă din nou.',
                    timestamp: new Date()
                });
                this.isLoading = false;
                this.shouldScrollToBottom = true;
            }
        });
    }

    onKeyDown(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    private scrollToBottom() {
        try {
            const el = this.messagesContainer?.nativeElement;
            if (el) el.scrollTop = el.scrollHeight;
        } catch { }
    }

    formatTime(date: Date): string {
        return date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
    }
}
