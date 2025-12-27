// Minimal JS/TS SDK for REVERSO API (HMAC-ready)
import { createHmac, createHash, randomUUID } from 'crypto';

export interface ReversoClientOptions {
  apiKey: string;
  signingSecret: string;
  baseUrl?: string;
  fetcher?: typeof fetch;
}

function buildSignature(
  secret: string,
  timestamp: number,
  nonce: string,
  method: string,
  path: string,
  bodyString: string
): string {
  const bodyHash = createHash('sha256').update(bodyString).digest('hex');
  const payload = `${timestamp}.${nonce}.${method}.${path}.${bodyHash}`;
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export class ReversoClient {
  private apiKey: string;
  private secret: string;
  private baseUrl: string;
  private fetcher: typeof fetch;

  constructor(opts: ReversoClientOptions) {
    this.apiKey = opts.apiKey;
    this.secret = opts.signingSecret;
    this.baseUrl = opts.baseUrl || 'https://api.reverso.finance/api/v1';
    this.fetcher = opts.fetcher || fetch;
  }

  private async request(path: string, method: string, body?: any) {
    const ts = Date.now();
    const nonce = randomUUID();
    const bodyString = body ? JSON.stringify(body) : '';
    const fullPath = `/api/v1${path}`;
    const signature = buildSignature(this.secret, ts, nonce, method.toUpperCase(), fullPath, bodyString);

    const res = await this.fetcher(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'x-reverso-timestamp': ts.toString(),
        'x-reverso-nonce': nonce,
        'x-reverso-signature': signature
      },
      body: bodyString || undefined
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || res.statusText);
    }
    return res.json();
  }

  createTransfer(body: any) {
    return this.request('/transfers', 'POST', body);
  }

  confirmTransfer(id: string, txHash: string, from: string) {
    return this.request(`/transfers/${id}/confirm`, 'POST', { txHash, from });
  }

  cancelTransfer(id: string) {
    return this.request(`/transfers/${id}/cancel`, 'POST');
  }

  getTransfer(id: string) {
    return this.request(`/transfers/${id}`, 'GET');
  }

  listTransfers(params?: { status?: string; chainId?: number; limit?: number; offset?: number }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.append('status', params.status);
    if (params?.chainId) qs.append('chainId', params.chainId.toString());
    if (params?.limit) qs.append('limit', params.limit.toString());
    if (params?.offset) qs.append('offset', params.offset.toString());
    const query = qs.toString();
    return this.request(`/transfers${query ? `?${query}` : ''}`, 'GET');
  }

  checkout(body: any) {
    return this.request('/usecases/checkout', 'POST', body);
  }

  payroll(body: any) {
    return this.request('/usecases/payroll', 'POST', body);
  }

  escrow(body: any) {
    return this.request('/usecases/escrow', 'POST', body);
  }
}
