import { universalFetch, getBackendBaseUrl } from '../../api/universalbackendapi';
import { getStoredJwtToken } from '../auth-page/authService';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export async function askFodcoAi(
  item: any,
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<string> {
  const jwt = await getStoredJwtToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (jwt) {
    headers['Authorization'] = `Bearer ${jwt}`;
  }

  const response = await universalFetch('/ai/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({ item, message, history }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  if (!data.success || !data.reply) {
    throw new Error(data.message || 'No response from Fodco AI');
  }

  return data.reply;
}

export async function explainFodcoAi(item: any): Promise<string> {
  const jwt = await getStoredJwtToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (jwt) {
    headers['Authorization'] = `Bearer ${jwt}`;
  }

  const response = await universalFetch('/ai/explain', {
    method: 'POST',
    headers,
    body: JSON.stringify({ item }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  if (!data.success || !data.explanation) {
    throw new Error(data.message || 'No explanation returned');
  }

  return data.explanation;
}
