/**
 * Realistic synthetic financial transaction generator.
 * Produces normal baseline users, high-value legitimate purchases,
 * and high-severity intentional fraud rings, card-testing attacks, and velocity bursts.
 */

export interface RawTransaction {
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

export function generateRealisticDemoTransactions(): RawTransaction[] {
  const transactions: RawTransaction[] = [];
  const baseTime = new Date('2026-10-04T10:00:00Z').getTime();

  // 1. Normal legitimate account: ACC_LEGAL_1 (Coffee, grocery, salary, rent)
  const legal1Txns = [
    { amt: 5.75, merch: 'Starbucks', cat: 'Dining', hoursAgo: 72, dev: 'DEV_IPHONE_ALICE', loc: 'Seattle WA', chan: 'mobile_app' },
    { amt: 84.20, merch: 'Safeway Supermarket', cat: 'Groceries', hoursAgo: 50, dev: 'DEV_IPHONE_ALICE', loc: 'Seattle WA', chan: 'in_store' },
    { amt: 22.50, merch: 'Chipotle', cat: 'Dining', hoursAgo: 30, dev: 'DEV_IPHONE_ALICE', loc: 'Seattle WA', chan: 'mobile_app' },
    { amt: 2350.00, merch: 'Apex Property Management', cat: 'Rent/Housing', hoursAgo: 24, dev: 'DEV_MACBOOK_ALICE', loc: 'Seattle WA', chan: 'web_portal' }, // Legitimate high-value housing
    { amt: 45.10, merch: 'Shell Gas Station', cat: 'Automotive', hoursAgo: 8, dev: 'DEV_IPHONE_ALICE', loc: 'Seattle WA', chan: 'in_store' },
    { amt: 12.30, merch: 'Trader Joe\'s', cat: 'Groceries', hoursAgo: 3, dev: 'DEV_IPHONE_ALICE', loc: 'Seattle WA', chan: 'in_store' },
  ];
  legal1Txns.forEach((t, i) => {
    transactions.push({
      transaction_id: `TXN_LEG_${100 + i}`,
      account_id: 'ACC_ALICE_101',
      amount: t.amt,
      timestamp: new Date(baseTime - t.hoursAgo * 3600000).toISOString(),
      merchant: t.merch,
      merchant_category: t.cat,
      device_id: t.dev,
      location: t.loc,
      payment_channel: t.chan,
    });
  });

  // 2. Normal legitimate account 2: ACC_BOB_202 (Tech worker, occasional high-value electronics)
  const legal2Txns = [
    { amt: 18.00, merch: 'Blue Bottle Coffee', cat: 'Dining', hoursAgo: 60, dev: 'DEV_PIXEL_BOB', loc: 'San Francisco CA', chan: 'in_store' },
    { amt: 154.00, merch: 'Whole Foods Market', cat: 'Groceries', hoursAgo: 42, dev: 'DEV_PIXEL_BOB', loc: 'San Francisco CA', chan: 'in_store' },
    { amt: 1899.00, merch: 'Apple Store Union Square', cat: 'Electronics', hoursAgo: 20, dev: 'DEV_PIXEL_BOB', loc: 'San Francisco CA', chan: 'in_store' }, // High-value legitimate purchase
    { amt: 35.80, merch: 'Uber Ride', cat: 'Transportation', hoursAgo: 12, dev: 'DEV_PIXEL_BOB', loc: 'San Francisco CA', chan: 'mobile_app' },
  ];
  legal2Txns.forEach((t, i) => {
    transactions.push({
      transaction_id: `TXN_LEG_${200 + i}`,
      account_id: 'ACC_BOB_202',
      amount: t.amt,
      timestamp: new Date(baseTime - t.hoursAgo * 3600000).toISOString(),
      merchant: t.merch,
      merchant_category: t.cat,
      device_id: t.dev,
      location: t.loc,
      payment_channel: t.chan,
    });
  });

  // 3. Normal legitimate account 3: ACC_CLARA_303
  const legal3Txns = [
    { amt: 65.00, merch: 'Target Stores', cat: 'Retail', hoursAgo: 48, dev: 'DEV_SAMSUNG_CLARA', loc: 'Chicago IL', chan: 'in_store' },
    { amt: 42.10, merch: 'Walgreens Pharmacy', cat: 'Health', hoursAgo: 26, dev: 'DEV_SAMSUNG_CLARA', loc: 'Chicago IL', chan: 'in_store' },
    { amt: 110.00, merch: 'Costco Wholesale', cat: 'Groceries', hoursAgo: 6, dev: 'DEV_SAMSUNG_CLARA', loc: 'Chicago IL', chan: 'in_store' },
  ];
  legal3Txns.forEach((t, i) => {
    transactions.push({
      transaction_id: `TXN_LEG_${300 + i}`,
      account_id: 'ACC_CLARA_303',
      amount: t.amt,
      timestamp: new Date(baseTime - t.hoursAgo * 3600000).toISOString(),
      merchant: t.merch,
      merchant_category: t.cat,
      device_id: t.dev,
      location: t.loc,
      payment_channel: t.chan,
    });
  });

  // 4. FRAUD RING 1: Coordinated Device Sharing Ring (DEV_BOT_SYNDICATE_99)
  // 5 accounts all transacting via the EXACT same device at luxury merchant within minutes
  const ringAccounts = ['ACC_MULE_501', 'ACC_MULE_502', 'ACC_MULE_503', 'ACC_MULE_504', 'ACC_MULE_505'];
  ringAccounts.forEach((accId, idx) => {
    // Normal small transaction first to establish baseline
    transactions.push({
      transaction_id: `TXN_BASE_${accId}`,
      account_id: accId,
      amount: 25.00 + idx * 3,
      timestamp: new Date(baseTime - 3600000 * 30).toISOString(),
      merchant: 'Local Corner Mart',
      merchant_category: 'Retail',
      device_id: `DEV_ORIGINAL_${idx}`,
      location: 'Miami FL',
      payment_channel: 'in_store',
    });

    // High risk coordinated purchase on shared bot device
    transactions.push({
      transaction_id: `TXN_RING_${idx + 1}`,
      account_id: accId,
      amount: 4850.00 + (idx * 45),
      timestamp: new Date(baseTime - 1800000 + (idx * 90000)).toISOString(), // minutes apart
      merchant: 'Prestige Jewelers & Bullion',
      merchant_category: 'Jewelry',
      device_id: 'DEV_BOT_SYNDICATE_99',
      location: 'Miami FL',
      payment_channel: 'web_portal',
    });
  });

  // 5. ACCOUNT TAKEOVER / SUDDEN ANOMALY SPIKE: ACC_VICTIM_707
  // Normal historical user whose account gets breached from abroad at night
  transactions.push({
    transaction_id: 'TXN_ATO_001',
    account_id: 'ACC_VICTIM_707',
    amount: 35.00,
    timestamp: new Date(baseTime - 3600000 * 50).toISOString(),
    merchant: 'Kroger Groceries',
    merchant_category: 'Groceries',
    device_id: 'DEV_IPHONE_707',
    location: 'Denver CO',
    payment_channel: 'in_store',
  });
  transactions.push({
    transaction_id: 'TXN_ATO_002',
    account_id: 'ACC_VICTIM_707',
    amount: 19.50,
    timestamp: new Date(baseTime - 3600000 * 35).toISOString(),
    merchant: 'Panera Bread',
    merchant_category: 'Dining',
    device_id: 'DEV_IPHONE_707',
    location: 'Denver CO',
    payment_channel: 'in_store',
  });
  transactions.push({
    transaction_id: 'TXN_ATO_003',
    account_id: 'ACC_VICTIM_707',
    amount: 9940.00, // Massive spike (avg $27 -> $9940)
    timestamp: new Date(baseTime - 3600000 * 6 + 180000).toISOString(), // 3:30 AM night off-hours
    merchant: 'Fast-Pay Crypto Vault',
    merchant_category: 'Cryptocurrency',
    device_id: 'DEV_TOR_PROXY_99',
    location: 'Lagos Nigeria',
    payment_channel: 'web_portal',
  });
  transactions.push({
    transaction_id: 'TXN_ATO_004',
    account_id: 'ACC_VICTIM_707',
    amount: 9850.00, // Immediate second drain
    timestamp: new Date(baseTime - 3600000 * 6 + 320000).toISOString(),
    merchant: 'Global Swift Remittance',
    merchant_category: 'Wire Transfer',
    device_id: 'DEV_TOR_PROXY_99',
    location: 'Lagos Nigeria',
    payment_channel: 'web_portal',
  });

  // 6. CARD TESTING SCRIPT / MICRO-CHARGE VELOCITY ATTACK: ACC_STOLEN_808
  // 6 rapid identical authorization attempts in under 2 minutes
  const testBurstStart = baseTime - 3600000 * 4;
  for (let step = 0; step < 6; step++) {
    transactions.push({
      transaction_id: `TXN_TEST_${step + 1}`,
      account_id: 'ACC_STOLEN_808',
      amount: 9.99,
      timestamp: new Date(testBurstStart + step * 18000).toISOString(), // 18 seconds apart
      merchant: 'Digital Voucher Merchant',
      merchant_category: 'Gift Cards',
      device_id: 'DEV_AUTOMATION_CLI_1',
      location: 'Bucharest Romania',
      payment_channel: 'web_portal',
    });
  }

  // 7. EMULATOR FRAUD RING: Two accounts sharing DEV_ANDROID_EMU_404
  const emuAccounts = ['ACC_EMU_901', 'ACC_EMU_902'];
  emuAccounts.forEach((acc, idx) => {
    transactions.push({
      transaction_id: `TXN_EMU_${idx + 1}`,
      account_id: acc,
      amount: 7800.00 + idx * 250,
      timestamp: new Date(baseTime - 3600000 * 2 + idx * 300000).toISOString(),
      merchant: 'Offshore Golden Casino',
      merchant_category: 'Gambling',
      device_id: 'DEV_ANDROID_EMU_404',
      location: 'Curacao',
      payment_channel: 'web_portal',
    });
  });

  return transactions;
}
