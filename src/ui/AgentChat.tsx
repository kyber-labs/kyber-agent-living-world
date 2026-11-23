// Chat dengan agent — Phase 4. Balasan berasal dari engine: model Gemini
// bila API key terpasang (lencana "Gemini live"), atau jawaban aturan bila
// belum (lencana "Simulasi lokal" + penjelasan). Tidak pernah ada balasan
// yang diklaim sebagai AI bila sebenarnya simulasi.

import { useEffect, useRef, useState } from 'react';
import type { AgentEngine } from '../ai/engine';
import type { Agent, AgentStatus } from '../types/agent';
import type { Task } from '../types/task';

interface Props {
  agent: Agent;
  liveState: { status: AgentStatus; location: string };
  tasks: Task[];
  engine: AgentEngine;
  onClose: () => void;
}

interface ChatMsg {
  role: 'user' | 'agent';
  text: string;
  live: boolean;
}

export function AgentChat({ agent, liveState, tasks, engine, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const live = engine.mode === 'live';

  // Perbaikan 6.1: gulir ke balasan terbaru SETELAH daftar pesan dirender.
  // Sebelumnya scrollTo dipanggil langsung setelah setMessages — DOM belum
  // diperbarui sehingga tingginya masih tinggi lama dan balasan panjang
  // terpotong di bawah lipatan (temuan live 6.0).
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, sending]);

  async function send(): Promise<void> {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { role: 'user', text, live: false }]);
    const result = await engine.chat(agent, liveState.status, liveState.location, tasks, text, history);
    setMessages((prev) => [...prev, { role: 'agent', text: result.text, live: result.live }]);
    setSending(false);
  }

  return (
    <section className="chat-panel" aria-label={`Chat dengan ${agent.name}`}>
      <div className="chat-header">
        <div>
          <strong style={{ color: agent.color }}>{agent.name}</strong>
          <span className="muted"> · {agent.role}</span>
        </div>
        <div className="chat-badges">
          <span className={`engine-badge ${live ? 'live' : 'sim'}`}>
            {live ? `Gemini live (${engine.providerName})` : 'Simulasi lokal'}
          </span>
          <button type="button" onClick={onClose} aria-label="Tutup chat">✕</button>
        </div>
      </div>
      {!live && (
        <p className="chat-note">
          Balasan simulasi — pasang <code>VITE_GEMINI_API_KEY</code> untuk jawaban AI sungguhan.
        </p>
      )}
      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 && (
          <p className="muted">Tanya {agent.name} tentang tugasnya, statusnya, atau apa pun.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <span className="chat-who">{m.role === 'user' ? 'Anda' : agent.name}</span>
            <p>{m.text}</p>
            {m.role === 'agent' && !m.live && <small className="muted">simulasi</small>}
          </div>
        ))}
        {sending && <p className="muted">{agent.name} sedang mengetik…</p>}
      </div>
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Tulis pesan untuk ${agent.name}…`}
          aria-label="Pesan chat"
        />
        <button type="submit" className="primary" disabled={sending || !input.trim()}>
          Kirim
        </button>
      </form>
    </section>
  );
}
