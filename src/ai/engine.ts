// AI Agent Engine — Phase 4. Menghubungkan agent dengan LLM (Gemini) dan
// task management: penugasan otomatis + chat dengan agent.
// LLM hanya dipanggil atas aksi pengguna (tombol / kirim chat). Bila LLM
// gagal (key salah, kuota habis, jaringan), engine jatuh ke aturan lokal
// dan mengembalikan live=false supaya UI menampilkannya secara jujur.

import type { Agent, AgentStatus } from '../types/agent';
import type { Task } from '../types/task';
import { doingCount, isBlocked, pickBestAgentRule } from '../simulation/taskLogic';
import type { LlmClient } from './llm';

export interface ChatResult {
  text: string;
  /** True bila teks berasal dari model sungguhan. */
  live: boolean;
}

export interface AssignResult {
  agentId: string | null;
  reason: string;
  live: boolean;
}

export class AgentEngine {
  private readonly llm: LlmClient;

  constructor(llm: LlmClient) {
    this.llm = llm;
  }

  get mode(): 'live' | 'simulation' {
    return this.llm.mode;
  }

  get providerName(): string {
    return this.llm.name;
  }

  /** Chat dengan satu agent. history = pesan sebelumnya (user/agent). */
  async chat(
    agent: Agent,
    status: AgentStatus,
    location: string,
    tasks: Task[],
    userText: string,
    history: { role: 'user' | 'agent'; text: string }[],
  ): Promise<ChatResult> {
    const myTasks = tasks
      .filter((t) => t.assigneeId === agent.id && t.status !== 'done')
      .map((t) => `- ${t.title} (${t.status === 'doing' ? 'dikerjakan' : 'antre'})`)
      .join('\n');
    const system =
      `Kamu ${agent.name}, ${agent.role} di kota virtual AI Agent Living World. ` +
      `Statusmu saat ini: ${status} di ${location}. ` +
      (myTasks ? `Tugasmu saat ini:\n${myTasks}\n` : 'Kamu sedang tidak memegang tugas.\n') +
      'Jawab singkat dalam Bahasa Indonesia, maksimal 3 kalimat, dengan nada ramah dan profesional sesuai peranmu.';
    const messages = [
      { role: 'system' as const, content: system },
      ...history.map((h) => ({
        role: h.role === 'agent' ? ('assistant' as const) : ('user' as const),
        content: h.text,
      })),
      { role: 'user' as const, content: userText },
    ];
    try {
      const text = await this.llm.complete(messages);
      return { text, live: this.llm.mode === 'live' };
    } catch {
      return {
        text: `SIMULASI: sebagai ${agent.role}, saya mencatat "${userText.slice(0, 80)}". (Panggilan LLM gagal — periksa API key / kuota.)`,
        live: false,
      };
    }
  }

  /** Pilih agent terbaik untuk satu tugas (LLM dulu, aturan bila gagal). */
  async pickAgentForTask(task: Task, agents: Agent[], tasks: Task[]): Promise<AssignResult> {
    const rulePick = pickBestAgentRule(task, agents, tasks);
    const ruleAgent = agents.find((a) => a.id === rulePick);
    const ruleReason = ruleAgent
      ? `${ruleAgent.name} (${ruleAgent.role}) — peran cocok, beban ${doingCount(ruleAgent.id, tasks)} tugas berjalan.`
      : 'Tidak ada agent yang tersedia.';
    if (this.llm.mode !== 'live') {
      return { agentId: rulePick, reason: `${ruleReason} (penugasan aturan — simulasi)`, live: false };
    }
    const roster = agents
      .map(
        (a) =>
          `- ${a.id}: ${a.name}, ${a.role}, ${doingCount(a.id, tasks)} tugas berjalan`,
      )
      .join('\n');
    const prompt =
      `Tugas: "${task.title}" — ${task.description || 'tanpa deskripsi'} (prioritas ${task.priority}).\n` +
      `Daftar agent:\n${roster}\n` +
      'Pilih SATU agent yang paling cocok berdasarkan peran dan beban kerja. ' +
      'Balas HANYA dengan JSON persis seperti ini, tanpa teks lain: {"agentId": "<id>", "reason": "<alasan singkat>"}';
    try {
      const raw = await this.llm.complete([{ role: 'user', content: prompt }]);
      const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
      const parsed = JSON.parse(json) as { agentId?: string; reason?: string };
      const picked = agents.find((a) => a.id === parsed.agentId);
      if (!picked) throw new Error('LLM memilih id yang tidak dikenal.');
      return {
        agentId: picked.id,
        reason: parsed.reason || `${picked.name} dipilih model.`,
        live: true,
      };
    } catch {
      return { agentId: rulePick, reason: `${ruleReason} (LLM gagal, fallback aturan)`, live: false };
    }
  }

  /** Apakah tugas ini terblokir dependensi? (helper untuk UI) */
  isTaskBlocked(task: Task, tasks: Task[]): boolean {
    return isBlocked(task, tasks);
  }
}
