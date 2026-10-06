#!/usr/bin/env python3
"""
HNX26 Financial Fraud Detection Engine
Anomaly detection pipeline combining statistical profiling, Isolation Forest,
fraud ring graph analysis, and deterministic evidence generation.
"""

import sys
import json
import csv
import io
import math
from datetime import datetime
from collections import defaultdict

# Import local feature engineering
try:
    from feature_engineering import compute_features
except ImportError:
    from python.feature_engineering import compute_features

REQUIRED_COLUMNS = [
    'transaction_id',
    'account_id',
    'amount',
    'timestamp',
    'merchant',
    'merchant_category',
    'device_id',
    'location',
    'payment_channel'
]

def validate_and_clean_data(records):
    """
    Validates required columns and cleans data types.
    Raises ValueError with missing column names if invalid.
    """
    if not records:
        raise ValueError("Transaction dataset is empty.")

    first_row = records[0]
    missing_cols = [col for col in REQUIRED_COLUMNS if col not in first_row]
    if missing_cols:
        raise ValueError(f"Missing required columns in CSV/data: {', '.join(missing_cols)}")

    cleaned = []
    for idx, r in enumerate(records):
        try:
            amt = float(r.get('amount', 0))
        except (ValueError, TypeError):
            amt = 0.0

        txn = {
            'transaction_id': str(r.get('transaction_id', f'TXN_{idx}')).strip(),
            'account_id': str(r.get('account_id', 'ACC_UNKNOWN')).strip(),
            'amount': amt,
            'timestamp': str(r.get('timestamp', '')).strip(),
            'merchant': str(r.get('merchant', 'Unknown Merchant')).strip(),
            'merchant_category': str(r.get('merchant_category', 'General')).strip(),
            'device_id': str(r.get('device_id', 'DEV_UNKNOWN')).strip(),
            'location': str(r.get('location', 'Unknown Location')).strip(),
            'payment_channel': str(r.get('payment_channel', 'other')).strip(),
        }
        cleaned.append(txn)
    return cleaned

def run_isolation_forest_or_surrogate(feature_rows):
    """
    Runs scikit-learn Isolation Forest if available,
    otherwise uses a pure-Python multivariate isolation & distance-based anomaly detector.
    Returns anomaly scores normalized between 0.0 (normal) and 1.0 (anomalous).
    """
    n_samples = len(feature_rows)
    if n_samples == 0:
        return []

    # Features to consider for ML anomaly scoring
    feature_keys = [
        'amount_zscore',
        'amount_ratio',
        'burst_count_5m',
        'shared_device_accounts',
        'is_new_device',
        'is_new_location',
        'is_night',
        'is_high_risk_cat'
    ]

    # Convert to numeric matrix
    X = []
    for row in feature_rows:
        vec = [float(row.get(k, 0)) for k in feature_keys]
        X.append(vec)

    # Try sklearn IsolationForest
    use_sklearn = False
    try:
        from sklearn.ensemble import IsolationForest
        import numpy as np
        use_sklearn = True
    except ImportError:
        use_sklearn = False

    if use_sklearn and n_samples >= 5:
        try:
            X_np = np.array(X)
            clf = IsolationForest(
                n_estimators=100,
                contamination=0.15,
                random_state=42
            )
            clf.fit(X_np)
            # decision_function gives negative for anomalies, positive for inliers
            raw_scores = clf.decision_function(X_np)
            # Invert and normalize to [0, 1]
            min_s, max_s = float(np.min(raw_scores)), float(np.max(raw_scores))
            span = max_s - min_s if max_s > min_s else 1.0
            anomaly_scores = [1.0 - ((s - min_s) / span) for s in raw_scores]
            return anomaly_scores
        except Exception:
            pass

    # High-fidelity Pure Python Anomaly Estimator (Isolation Forest surrogate)
    # Computes multi-attribute normalized z-deviation and heuristic anomaly depth
    anomaly_scores = []
    
    # Compute column means and standard deviations
    num_cols = len(feature_keys)
    means = [0.0] * num_cols
    stds = [1.0] * num_cols

    for j in range(num_cols):
        vals = [X[i][j] for i in range(n_samples)]
        m = sum(vals) / n_samples
        means[j] = m
        var = sum((v - m) ** 2 for v in vals) / max(n_samples - 1, 1)
        stds[j] = math.sqrt(var) if var > 0.0001 else 1.0

    for i in range(n_samples):
        # Weighted anomaly contribution
        weights = [2.0, 1.8, 2.2, 2.5, 1.2, 1.2, 1.0, 1.5]
        score_sum = 0.0
        weight_sum = sum(weights)

        for j in range(num_cols):
            val = X[i][j]
            z = abs((val - means[j]) / stds[j])
            # Cap z to avoid infinite skew
            capped_z = min(z, 5.0)
            score_sum += capped_z * weights[j]

        norm_score = score_sum / (weight_sum * 3.0)  # roughly 0.0 to 1.0
        anomaly_scores.append(min(max(norm_score, 0.0), 1.0))

    return anomaly_scores

def calculate_risk_scores_and_evidence(transactions, features, anomaly_scores, context):
    """
    Computes final deterministic risk scores (0-100) and produces explainable evidence.
    """
    scored_transactions = []
    account_stats = context['account_stats']
    device_to_accounts = context['device_to_accounts']

    # Detect rapid velocity bursts across the whole dataset
    # Group by account and check time delta between consecutive transactions
    time_sorted = sorted(transactions, key=lambda x: str(x.get('timestamp', '')))
    rapid_counts = defaultdict(int)
    for i in range(1, len(time_sorted)):
        prev = time_sorted[i-1]
        curr = time_sorted[i]
        if prev['account_id'] == curr['account_id']:
            try:
                t1 = datetime.fromisoformat(prev['timestamp'].replace('Z', '+00:00'))
                t2 = datetime.fromisoformat(curr['timestamp'].replace('Z', '+00:00'))
                diff_sec = abs((t2 - t1).total_seconds())
                if diff_sec <= 60:
                    rapid_counts[curr['transaction_id']] += 1
                    rapid_counts[prev['transaction_id']] += 1
            except Exception:
                pass

    for i, txn in enumerate(transactions):
        feat = features[i]
        ml_score = anomaly_scores[i] if i < len(anomaly_scores) else 0.0

        reasons = []
        anomaly_flags = []
        rule_penalty = 0

        amt = txn['amount']
        acc = txn['account_id']
        dev = txn['device_id']
        merch = txn['merchant']
        cat = txn['merchant_category'].lower()
        shared_accs = device_to_accounts.get(dev, [])
        num_shared = len(shared_accs)
        acc_stat = account_stats.get(acc, {'mean': amt, 'count': 1})
        mean_amt = acc_stat['mean']

        # Rule 1: Multi-account device sharing (Fraud ring signal)
        if num_shared >= 3:
            rule_penalty += 38
            reasons.append(f"Device '{dev}' is shared across {num_shared} separate accounts ({', '.join(shared_accs[:3])}{'...' if num_shared > 3 else ''}), indicating potential fraud ring or coordinated botnet.")
            anomaly_flags.append("SHARED_DEVICE_RING")
        elif num_shared == 2:
            rule_penalty += 20
            reasons.append(f"Device '{dev}' is shared with another distinct account ({', '.join([a for a in shared_accs if a != acc])}).")
            anomaly_flags.append("SHARED_DEVICE_PAIR")

        # Rule 2: Amount spike vs Account baseline
        if mean_amt > 0:
            ratio = amt / mean_amt
            if ratio >= 8.0 and amt > 500:
                rule_penalty += 35
                reasons.append(f"Transaction amount (${amt:,.2f}) is {ratio:.1f}x higher than this account's historical average (${mean_amt:,.2f}).")
                anomaly_flags.append("EXTREME_AMOUNT_SPIKE")
            elif ratio >= 3.5 and amt > 250:
                rule_penalty += 22
                reasons.append(f"Transaction amount (${amt:,.2f}) is {ratio:.1f}x above typical account expenditure (${mean_amt:,.2f}).")
                anomaly_flags.append("UNUSUAL_AMOUNT")

        # Rule 3: Velocity bursts / rapid transactions
        if feat['burst_count_5m'] >= 4:
            rule_penalty += 30
            reasons.append(f"High-frequency burst: {feat['burst_count_5m']} transactions initiated within a 5-minute window.")
            anomaly_flags.append("HIGH_VELOCITY_BURST")
        elif feat['burst_count_5m'] >= 2 and feat['time_diff_sec'] < 90:
            rule_penalty += 18
            reasons.append(f"Rapid succession: Previous transaction occurred only {int(feat['time_diff_sec'])} seconds ago.")
            anomaly_flags.append("RAPID_TRANSACTION")

        # Rule 4: Card testing pattern (repeated micro/small transactions)
        if rapid_counts.get(txn['transaction_id'], 0) >= 2 and amt < 30.0:
            rule_penalty += 25
            reasons.append(f"Repetitive small-dollar authorization pattern (${amt:.2f}) within seconds (characteristic of automated card testing).")
            anomaly_flags.append("CARD_TESTING_PATTERN")

        # Rule 5: High-risk merchant category + off-hours
        if feat['is_high_risk_cat']:
            if feat['is_night']:
                rule_penalty += 22
                reasons.append(f"High-risk category '{txn['merchant_category']}' transacted during off-peak hours (between 01:00 and 05:00 UTC).")
                anomaly_flags.append("OFF_HOURS_HIGH_RISK")
            else:
                rule_penalty += 12
                reasons.append(f"Merchant category '{txn['merchant_category']}' carries heightened regulatory and chargeback risk.")
                anomaly_flags.append("HIGH_RISK_CATEGORY")

        # Rule 6: Unfamiliar device or geographical location switch
        if feat['is_new_location'] and feat['is_new_device']:
            rule_penalty += 15
            reasons.append(f"Simultaneous new device '{dev}' and new geographic location '{txn['location']}' for account.")
            anomaly_flags.append("NEW_DEVICE_AND_LOCATION")
        elif feat['is_new_location']:
            rule_penalty += 8
            reasons.append(f"Transaction origin '{txn['location']}' differs from previously established account territory.")
            anomaly_flags.append("LOCATION_ANOMALY")

        # Combine ML anomaly score + rule penalties
        # ML score scaled to 0-35 points, rules provide up to 65 points
        ml_component = ml_score * 35.0
        raw_combined = ml_component + rule_penalty

        # If no specific anomalies were flagged and it's a typical transaction
        if not reasons:
            reasons.append("Transaction patterns match normal baseline behavior (amount, device, and timing within expected thresholds).")
            anomaly_flags.append("NORMAL_PATTERN")
            risk_score = int(min(max(round(raw_combined * 0.4), 5), 25))
        else:
            risk_score = int(min(max(round(raw_combined), 10), 99))

        # Determine risk level
        if risk_score >= 80:
            risk_level = "Critical Risk"
            classification = "Suspicious"
            status = "Flagged"
            recommended_action = "Escalate for manual review and consider immediate account temporary freeze"
        elif risk_score >= 60:
            risk_level = "High Risk"
            classification = "Suspicious"
            status = "Under Review"
            recommended_action = "Review transaction evidence and verify identity with account holder"
        elif risk_score >= 30:
            risk_level = "Medium Risk"
            classification = "Normal"
            status = "Monitored"
            recommended_action = "Temporarily monitor account for follow-up anomalous activity"
        else:
            risk_level = "Low Risk"
            classification = "Normal"
            status = "Approved"
            recommended_action = "No action required - transaction within standard profile"

        scored_transactions.append({
            **txn,
            'risk_score': risk_score,
            'risk_level': risk_level,
            'classification': classification,
            'status': status,
            'recommended_action': recommended_action,
            'reasons': reasons,
            'anomaly_flags': anomaly_flags,
            'ml_anomaly_score': round(ml_score, 3),
            'engineered_features': feat
        })

    return scored_transactions

def build_accounts_summary(scored_transactions, device_to_accounts):
    """
    Summarizes metrics per account: risk score, transaction count, values, devices, merchants, linked accounts.
    """
    account_groups = defaultdict(list)
    for t in scored_transactions:
        account_groups[t['account_id']].append(t)

    accounts_list = []
    for acc_id, txns in account_groups.items():
        total_val = sum(t['amount'] for t in txns)
        count = len(txns)
        avg_val = total_val / count if count > 0 else 0
        max_txn_risk = max(t['risk_score'] for t in txns)
        avg_txn_risk = sum(t['risk_score'] for t in txns) / count
        
        # Account risk score blends maximum individual risk and average risk
        acc_risk_score = int(min(round((max_txn_risk * 0.7) + (avg_txn_risk * 0.3)), 100))

        suspicious_txns = [t for t in txns if t['risk_score'] >= 60]
        devices = sorted(list({t['device_id'] for t in txns}))
        merchants = sorted(list({t['merchant'] for t in txns}))
        locations = sorted(list({t['location'] for t in txns}))

        # Find linked accounts via shared devices
        related_accounts = set()
        for dev in devices:
            sharing = device_to_accounts.get(dev, [])
            for other_acc in sharing:
                if other_acc != acc_id:
                    related_accounts.add(other_acc)

        if acc_risk_score >= 80:
            risk_level = "Critical"
        elif acc_risk_score >= 60:
            risk_level = "High"
        elif acc_risk_score >= 30:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        accounts_list.append({
            'account_id': acc_id,
            'transaction_count': count,
            'total_value': round(total_val, 2),
            'average_value': round(avg_val, 2),
            'risk_score': acc_risk_score,
            'risk_level': risk_level,
            'suspicious_transaction_count': len(suspicious_txns),
            'devices_used': devices,
            'merchants_used': merchants,
            'locations_used': locations,
            'related_accounts': sorted(list(related_accounts))
        })

    # Sort descending by risk score
    accounts_list.sort(key=lambda x: x['risk_score'], reverse=True)
    return accounts_list

def build_fraud_network(scored_transactions, device_to_accounts):
    """
    Constructs a graph representation (nodes & links) connecting Accounts, Devices, Merchants, and Locations.
    Identifies multi-account device sharing clusters (Fraud Rings).
    """
    nodes = {}
    edges = []
    edge_set = set()

    def add_node(node_id, label, node_type, risk_score=0, meta=None):
        if node_id not in nodes:
            nodes[node_id] = {
                'id': node_id,
                'label': label,
                'type': node_type,
                'risk_score': risk_score,
                'meta': meta or {}
            }
        else:
            # Update max risk
            nodes[node_id]['risk_score'] = max(nodes[node_id]['risk_score'], risk_score)

    def add_edge(source, target, relationship, weight=1, is_suspicious=False):
        edge_key = tuple(sorted([source, target])) + (relationship,)
        if edge_key not in edge_set:
            edge_set.add(edge_key)
            edges.append({
                'source': source,
                'target': target,
                'relationship': relationship,
                'weight': weight,
                'is_suspicious': is_suspicious
            })

    # Find shared devices
    shared_devices = {dev: accs for dev, accs in device_to_accounts.items() if len(accs) > 1}

    # Add entity nodes and links
    for t in scored_transactions:
        acc_id = t['account_id']
        dev_id = t['device_id']
        merch = t['merchant']
        loc = t['location']
        t_risk = t['risk_score']

        is_dev_shared = dev_id in shared_devices

        add_node(acc_id, acc_id, 'account', risk_score=t_risk)
        add_node(dev_id, f"Dev: {dev_id}", 'device', risk_score=85 if is_dev_shared else 20, meta={'shared_count': len(device_to_accounts.get(dev_id, []))})
        add_node(merch, merch, 'merchant', risk_score=min(t_risk, 70), meta={'category': t['merchant_category']})
        add_node(loc, loc, 'location', risk_score=min(t_risk, 60))

        add_edge(acc_id, dev_id, 'USES_DEVICE', is_suspicious=is_dev_shared)
        add_edge(acc_id, merch, 'TRANSACTED_AT', is_suspicious=(t_risk >= 60))
        add_edge(acc_id, loc, 'LOCATED_IN', is_suspicious=(t_risk >= 70))

    # Identify fraud rings
    rings = []
    ring_idx = 1
    for dev, accs in shared_devices.items():
        if len(accs) >= 2:
            # Find common merchants among these accounts
            merch_overlap = defaultdict(int)
            for t in scored_transactions:
                if t['account_id'] in accs:
                    merch_overlap[t['merchant']] += 1

            rings.append({
                'ring_id': f"RING_{ring_idx}",
                'shared_device': dev,
                'account_count': len(accs),
                'accounts': sorted(list(accs)),
                'common_merchants': [m for m, c in merch_overlap.items() if c >= 2],
                'description': f"Coordinated cluster: {len(accs)} accounts share device '{dev}'"
            })
            ring_idx += 1

    return {
        'nodes': list(nodes.values()),
        'edges': edges,
        'detected_rings': rings
    }

def analyze_dataset(records):
    """
    Main analysis pipeline orchestrating data validation, feature engineering,
    ML anomaly detection, scoring, account aggregation, and relationship graphing.
    """
    cleaned_txns = validate_and_clean_data(records)
    features, context = compute_features(cleaned_txns)
    anomaly_scores = run_isolation_forest_or_surrogate(features)
    scored_txns = calculate_risk_scores_and_evidence(cleaned_txns, features, anomaly_scores, context)
    accounts = build_accounts_summary(scored_txns, context['device_to_accounts'])
    network = build_fraud_network(scored_txns, context['device_to_accounts'])

    # Summary metrics
    total_txns = len(scored_txns)
    suspicious_txns = [t for t in scored_txns if t['risk_score'] >= 60]
    critical_alerts = [t for t in scored_txns if t['risk_score'] >= 80]
    high_risk_accounts = [a for a in accounts if a['risk_score'] >= 60]
    avg_risk = sum(t['risk_score'] for t in scored_txns) / total_txns if total_txns > 0 else 0

    alerts = []
    for t in sorted(suspicious_txns, key=lambda x: x['risk_score'], reverse=True):
        alerts.append({
            'alert_id': f"ALT_{t['transaction_id']}",
            'transaction_id': t['transaction_id'],
            'account_id': t['account_id'],
            'amount': t['amount'],
            'merchant': t['merchant'],
            'device_id': t['device_id'],
            'location': t['location'],
            'timestamp': t['timestamp'],
            'risk_score': t['risk_score'],
            'risk_level': t['risk_level'],
            'reasons': t['reasons'],
            'anomaly_flags': t['anomaly_flags'],
            'recommended_action': t['recommended_action']
        })

    # Risk distribution breakdown
    risk_distribution = {
        'low': len([t for t in scored_txns if t['risk_score'] < 30]),
        'medium': len([t for t in scored_txns if 30 <= t['risk_score'] < 60]),
        'high': len([t for t in scored_txns if 60 <= t['risk_score'] < 80]),
        'critical': len([t for t in scored_txns if t['risk_score'] >= 80]),
    }

    return {
        'summary': {
            'total_transactions': total_txns,
            'suspicious_transactions': len(suspicious_txns),
            'high_risk_accounts': len(high_risk_accounts),
            'critical_alerts': len(critical_alerts),
            'average_risk_score': round(avg_risk, 1),
            'risk_distribution': risk_distribution,
            'detected_rings_count': len(network['detected_rings'])
        },
        'transactions': scored_txns,
        'alerts': alerts,
        'accounts': accounts,
        'network': network
    }

def main():
    """
    CLI entry point: reads JSON or CSV from stdin or file path arg.
    Outputs structured JSON to stdout.
    """
    try:
        raw_input_text = ""
        if len(sys.argv) > 1 and sys.argv[1] not in ('-', '--stdin'):
            file_path = sys.argv[1]
            with open(file_path, 'r', encoding='utf-8') as f:
                raw_input_text = f.read()
        else:
            raw_input_text = sys.stdin.read()

        if not raw_input_text.strip():
            raise ValueError("No input data provided to fraud engine.")

        # Try parsing as JSON first
        records = None
        try:
            parsed_json = json.loads(raw_input_text)
            if isinstance(parsed_json, list):
                records = parsed_json
            elif isinstance(parsed_json, dict) and 'transactions' in parsed_json:
                records = parsed_json['transactions']
        except json.JSONDecodeError:
            pass

        # If not JSON, parse as CSV
        if records is None:
            f = io.StringIO(raw_input_text.strip())
            reader = csv.DictReader(f)
            records = list(reader)

        result = analyze_dataset(records)
        print(json.dumps({'success': True, 'data': result}))
        sys.exit(0)

    except Exception as e:
        error_res = {
            'success': False,
            'error': str(e),
            'type': type(e).__name__
        }
        print(json.dumps(error_res), file=sys.stderr)
        # Also print to stdout for easy pipe consumption
        print(json.dumps(error_res))
        sys.exit(1)

if __name__ == '__main__':
    main()
