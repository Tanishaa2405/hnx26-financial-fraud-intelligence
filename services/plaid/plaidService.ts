/**
 * Plaid Integration Service Layer (Sandbox Ready)
 * 
 * Provides an isolated service architecture for connecting Plaid Sandbox accounts,
 * generating Link tokens, exchanging public tokens, and normalizing Plaid transactions
 * into the HNX26 standard fraud evaluation schema.
 */

export interface PlaidConfig {
  clientId?: string;
  secret?: string;
  env?: 'sandbox' | 'development' | 'production';
  isConfigured: boolean;
}

export interface NormalizedPlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  timestamp: string;
  merchant: string;
  merchant_category: string;
  device_id: string;
  location: string;
  payment_channel: string;
}

export class PlaidService {
  private config: PlaidConfig;

  constructor() {
    const clientId = process.env.PLAID_CLIENT_ID;
    const secret = process.env.PLAID_SECRET;
    const env = (process.env.PLAID_ENV as 'sandbox' | 'development' | 'production') || 'sandbox';

    this.config = {
      clientId,
      secret,
      env,
      isConfigured: Boolean(clientId && secret),
    };
  }

  /**
   * Returns current configuration status without exposing secret keys.
   */
  public getStatus(): { isConfigured: boolean; environment: string; statusMessage: string } {
    if (!this.config.isConfigured) {
      return {
        isConfigured: false,
        environment: this.config.env || 'sandbox',
        statusMessage: 'Plaid Sandbox credentials not configured in environment. The platform is operating in native CSV & synthetic demo mode.',
      };
    }
    return {
      isConfigured: true,
      environment: this.config.env || 'sandbox',
      statusMessage: 'Plaid Sandbox credentials detected. Live bank sandbox linking is enabled.',
    };
  }

  /**
   * Creates a link token for Plaid Link frontend initiation.
   * If credentials are not configured, returns a mock token for sandbox UI simulation.
   */
  public async createLinkToken(userId: string): Promise<{ linkToken: string; simulated: boolean }> {
    if (!this.config.isConfigured) {
      return {
        linkToken: `link-sandbox-${userId}-simulated-${Date.now()}`,
        simulated: true,
      };
    }

    try {
      // In production/full sandbox with official SDK or direct REST API:
      const response = await fetch(`https://${this.config.env}.plaid.com/link/token/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.config.clientId,
          secret: this.config.secret,
          client_name: 'HNX26 Fraud Intelligence',
          country_codes: ['US'],
          language: 'en',
          user: { client_user_id: userId },
          products: ['transactions'],
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`Plaid API error: ${JSON.stringify(errData)}`);
      }

      const data = await response.json();
      return { linkToken: data.link_token, simulated: false };
    } catch (err: any) {
      console.warn('Plaid createLinkToken failed, falling back to simulated sandbox token:', err.message);
      return {
        linkToken: `link-sandbox-${userId}-fallback-${Date.now()}`,
        simulated: true,
      };
    }
  }

  /**
   * Exchanges public token received from Plaid Link for access token.
   */
  public async exchangePublicToken(publicToken: string): Promise<{ accessToken: string; itemId: string; simulated: boolean }> {
    if (!this.config.isConfigured) {
      return {
        accessToken: `access-sandbox-${Date.now()}`,
        itemId: `item-sandbox-${Date.now()}`,
        simulated: true,
      };
    }

    const response = await fetch(`https://${this.config.env}.plaid.com/item/public_token/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.config.clientId,
        secret: this.config.secret,
        public_token: publicToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Plaid token exchange error (${response.status})`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      itemId: data.item_id,
      simulated: false,
    };
  }

  /**
   * Syncs and normalizes transactions from Plaid into HNX26 standard format.
   */
  public async fetchAndNormalizeTransactions(accessToken: string): Promise<NormalizedPlaidTransaction[]> {
    // Return sample Plaid sandbox stream if simulated
    if (!this.config.isConfigured || accessToken.startsWith('access-sandbox-')) {
      return this.generateSandboxSampleStream();
    }

    const response = await fetch(`https://${this.config.env}.plaid.com/transactions/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.config.clientId,
        secret: this.config.secret,
        access_token: accessToken,
        count: 50,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to sync transactions from Plaid (${response.status})`);
    }

    const data = await response.json();
    const plaidAdded = data.added || [];

    return plaidAdded.map((t: any, idx: number) => ({
      transaction_id: t.transaction_id || `PLD_${idx}`,
      account_id: t.account_id || 'ACC_PLAID_1',
      amount: Math.abs(t.amount || 0),
      timestamp: t.datetime || t.date || new Date().toISOString(),
      merchant: t.merchant_name || t.name || 'Plaid Merchant',
      merchant_category: (t.category && t.category[0]) || 'General',
      device_id: 'DEV_PLAID_MOBILE',
      location: (t.location && t.location.city) ? `${t.location.city} ${t.location.region || ''}`.trim() : 'Digital Transaction',
      payment_channel: t.payment_channel || 'online',
    }));
  }

  /**
   * Generates realistic simulated Plaid Sandbox transactions for immediate test drive
   */
  public generateSandboxSampleStream(): NormalizedPlaidTransaction[] {
    const now = new Date();
    return [
      {
        transaction_id: 'PLD_SBX_101',
        account_id: 'ACC_PLAID_CHEX',
        amount: 84.50,
        timestamp: new Date(now.getTime() - 3600000 * 2).toISOString(),
        merchant: 'Uber BV',
        merchant_category: 'Transportation',
        device_id: 'DEV_IPHONE_PLAID',
        location: 'San Francisco CA',
        payment_channel: 'in_store',
      },
      {
        transaction_id: 'PLD_SBX_102',
        account_id: 'ACC_PLAID_CHEX',
        amount: 3200.00,
        timestamp: new Date(now.getTime() - 3600000 * 24).toISOString(),
        merchant: 'Avalon Bay Communities',
        merchant_category: 'Rent/Housing',
        device_id: 'DEV_MACBOOK_PLAID',
        location: 'San Francisco CA',
        payment_channel: 'online',
      },
      {
        transaction_id: 'PLD_SBX_103',
        account_id: 'ACC_PLAID_CHEX',
        amount: 7420.00,
        timestamp: new Date(now.getTime() - 1800000).toISOString(),
        merchant: 'Binance US Crypto',
        merchant_category: 'Cryptocurrency',
        device_id: 'DEV_UNKNOWN_EXTERNAL',
        location: 'Lagos Nigeria',
        payment_channel: 'other',
      },
    ];
  }
}

export const plaidService = new PlaidService();
