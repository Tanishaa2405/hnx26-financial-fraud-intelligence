"""
Feature engineering module for financial transaction fraud detection.
Extracts statistical, behavioral, velocity, and network relationship features.
"""

from datetime import datetime
import math
from collections import defaultdict

HIGH_RISK_CATEGORIES = {
    'cryptocurrency', 'wire transfer', 'gambling', 'gift cards', 'jewelry', 'money transfer'
}

def parse_iso_timestamp(ts_str):
    try:
        # Handle 'Z' or '+00:00'
        cleaned = ts_str.replace('Z', '+00:00')
        return datetime.fromisoformat(cleaned)
    except Exception:
        try:
            return datetime.strptime(ts_str[:19], "%Y-%m-%d %H:%M:%S")
        except Exception:
            return datetime.utcnow()

def compute_features(transactions):
    """
    Computes behavioral, velocity, and relational features for a list of transaction dicts.
    Returns:
        feature_rows: list of dicts with numerical/categorical feature values
        context_data: aggregations used for evidence generation
    """
    if not transactions:
        return [], {}

    # Sort transactions by account and timestamp
    parsed_txns = []
    for t in transactions:
        txn_copy = dict(t)
        txn_copy['amount'] = float(txn_copy.get('amount', 0))
        txn_copy['dt'] = parse_iso_timestamp(str(txn_copy.get('timestamp', '')))
        parsed_txns.append(txn_copy)

    # Sort by timestamp
    parsed_txns.sort(key=lambda x: x['dt'])

    # Build account history aggregations
    account_amounts = defaultdict(list)
    account_devices = defaultdict(set)
    account_locations = defaultdict(set)
    account_txns_by_time = defaultdict(list)
    
    # Device to accounts map (Fraud ring indicator)
    device_to_accounts = defaultdict(set)
    merchant_to_accounts = defaultdict(set)

    for t in parsed_txns:
        acc = str(t['account_id'])
        amt = t['amount']
        dev = str(t.get('device_id', 'unknown'))
        loc = str(t.get('location', 'unknown'))
        merch = str(t.get('merchant', 'unknown'))

        account_amounts[acc].append(amt)
        account_devices[acc].add(dev)
        account_locations[acc].add(loc)
        account_txns_by_time[acc].append(t)
        
        device_to_accounts[dev].add(acc)
        merchant_to_accounts[merch].add(acc)

    # Calculate account statistics (mean, std)
    account_stats = {}
    for acc, amounts in account_amounts.items():
        n = len(amounts)
        mean_amt = sum(amounts) / n
        if n > 1:
            variance = sum((x - mean_amt) ** 2 for x in amounts) / (n - 1)
            std_amt = math.sqrt(variance)
        else:
            std_amt = 0.0
        account_stats[acc] = {
            'count': n,
            'mean': mean_amt,
            'std': std_amt,
            'max': max(amounts),
            'min': min(amounts)
        }

    # Now compute point-in-time features for each transaction
    features = []
    # Keep track of running seen devices/locations per account
    seen_account_devices = defaultdict(set)
    seen_account_locations = defaultdict(set)
    account_last_time = {}

    for t in parsed_txns:
        acc = str(t['account_id'])
        amt = t['amount']
        dev = str(t.get('device_id', 'unknown'))
        loc = str(t.get('location', 'unknown'))
        merch_cat = str(t.get('merchant_category', '')).lower()
        dt = t['dt']

        stats = account_stats[acc]
        mean_amt = stats['mean']
        std_amt = stats['std']

        # Z-score of amount
        zscore = (amt - mean_amt) / (std_amt + 10.0) if std_amt > 0 else (amt - mean_amt) / max(mean_amt, 10.0)
        amount_ratio = amt / max(mean_amt, 1.0)

        # Time delta from previous transaction of same account
        time_diff_sec = 86400.0  # default large
        if acc in account_last_time:
            time_diff_sec = max(0.0, (dt - account_last_time[acc]).total_seconds())
        account_last_time[acc] = dt

        # Velocity bursts: transactions within 300 seconds (5 min)
        recent_txns_5m = [
            ot for ot in account_txns_by_time[acc]
            if 0 <= (dt - ot['dt']).total_seconds() <= 300
        ]
        burst_count_5m = len(recent_txns_5m)

        # Device sharing (fraud ring detection)
        accounts_sharing_device = len(device_to_accounts[dev])

        # Sudden new device or location
        is_new_device = 1 if (seen_account_devices[acc] and dev not in seen_account_devices[acc]) else 0
        is_new_location = 1 if (seen_account_locations[acc] and loc not in seen_account_locations[acc]) else 0
        seen_account_devices[acc].add(dev)
        seen_account_locations[acc].add(loc)

        # Off-hours (night transaction between 1AM and 5AM)
        hour = dt.hour
        is_night = 1 if (1 <= hour <= 5) else 0

        # Category risk
        is_high_risk_cat = 1 if any(hrc in merch_cat for hrc in HIGH_RISK_CATEGORIES) else 0

        feat = {
            'transaction_id': t['transaction_id'],
            'account_id': acc,
            'amount': amt,
            'amount_zscore': round(zscore, 3),
            'amount_ratio': round(amount_ratio, 3),
            'account_mean_amount': round(mean_amt, 2),
            'time_diff_sec': round(time_diff_sec, 1),
            'burst_count_5m': burst_count_5m,
            'shared_device_accounts': accounts_sharing_device,
            'is_shared_device': 1 if accounts_sharing_device > 1 else 0,
            'is_new_device': is_new_device,
            'is_new_location': is_new_location,
            'is_night': is_night,
            'is_high_risk_cat': is_high_risk_cat,
        }
        features.append(feat)

    context = {
        'account_stats': account_stats,
        'device_to_accounts': {k: list(v) for k, v in device_to_accounts.items()},
        'merchant_to_accounts': {k: list(v) for k, v in merchant_to_accounts.items()},
    }

    return features, context
