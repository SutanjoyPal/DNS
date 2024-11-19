import json
import random
import ipaddress

def generate_dns_records(count=500):
    # Common words to create realistic domain names
    words = ['tech', 'dev', 'info', 'cloud', 'web', 'net', 'sys', 'app', 'data',
             'cyber', 'digital', 'smart', 'ai', 'ml', 'iot', 'edu', 'learn',
             'shop', 'store', 'market', 'pay', 'secure', 'solutions', 'services',
             'consulting', 'media', 'group', 'global', 'india', 'asia', 'online',
             'mobile', 'soft', 'labs', 'research', 'innovation', 'systems',
             'enterprise', 'business', 'corp', 'hub', 'zone', 'point', 'link',
             'connect', 'network', 'host', 'server', 'portal', 'platform']
    
    # Common Indian names for personal domains
    indian_names = ['kumar', 'sharma', 'singh', 'patel', 'reddy', 'gupta',
                   'shah', 'mehta', 'verma', 'joshi', 'nair', 'rao', 'raj',
                   'kapoor', 'chopra', 'malhotra', 'das', 'bose', 'iyer',
                   'krishna', 'pandey', 'mishra', 'arora', 'sinha', 'dubey']
    
    records = []
    used_domains = set()
    
    def generate_domain():
        if random.random() < 0.3:  # 30% chance for personal domain
            name = random.choice(indian_names)
        else:
            name = random.choice(words) + random.choice([''] * 3 + [random.choice(words)])
        return name.lower() + '.edu'
    
    def generate_ipv4():
        # Generate realistic private and public IP addresses
        if random.random() < 0.7:  # 70% chance for public IP
            networks = ['203.0.113.0/24', '198.51.100.0/24', '192.0.2.0/24']
            network = ipaddress.ip_network(random.choice(networks))
            ip = str(network[random.randint(1, 254)])
        else:  # Private IP
            networks = ['192.168.0.0/16', '172.16.0.0/12', '10.0.0.0/8']
            network = ipaddress.ip_network(random.choice(networks))
            ip = str(network[random.randint(1, 65534)])
        return ip
    
    def generate_ipv6():
        # Generate realistic IPv6 addresses
        prefix = '2001:db8:'  # Documentation prefix
        segments = [f'{random.randint(0, 65535):04x}' for _ in range(6)]
        return f'{prefix}:{":".join(segments)}'
    
    record_types = {
        'A': lambda domain: {
            'name': domain,
            'type': 'A',
            'ip': generate_ipv4()
        },
        'AAAA': lambda domain: {
            'name': domain,
            'type': 'AAAA',
            'ip': generate_ipv6()
        },
        'CNAME': lambda domain: {
            'name': f'www.{domain}',
            'type': 'CNAME',
            'target': domain
        },
        'MX': lambda domain: {
            'name': domain,
            'type': 'MX',
            'target': f'mail.{domain}',
            'priority': random.choice([10, 20, 30])
        },
        'NS': lambda domain: {
            'name': domain,
            'type': 'NS',
            'target': f'ns{random.randint(1,3)}.{domain}'
        },
        'TXT': lambda domain: {
            'name': domain,
            'type': 'TXT',
            'text': random.choice([
                f'v=spf1 include:spf.{domain} ~all',
                f'google-site-verification={random.randbytes(16).hex()}',
                f'MS={random.randbytes(16).hex()}'
            ])
        }
    }
    
    while len(records) < count:
        domain = generate_domain()
        if domain in used_domains:
            continue
            
        used_domains.add(domain)
        
        # Determine record type based on weighted probability
        record_type = random.choices(
            list(record_types.keys()),
            weights=[50, 10, 15, 10, 10, 5],  # A, AAAA, CNAME, MX, NS, TXT
            k=1
        )[0]
        
        record = record_types[record_type](domain)
        records.append(record)
        
        # Add associated records for some domains
        if random.random() < 0.3:  # 30% chance for additional records
            if record_type == 'A':
                # Add www subdomain
                records.append({
                    'name': f'www.{domain}',
                    'type': 'A',
                    'ip': record['ip']
                })
                
                # Add mail subdomain
                if random.random() < 0.5:
                    records.append({
                        'name': f'mail.{domain}',
                        'type': 'A',
                        'ip': generate_ipv4()
                    })
    
    # Trim to exact count
    return records[:count]

# Generate records
dns_records = generate_dns_records(500)

# Write to file
with open('generate.json', 'w', encoding='utf-8') as f:
    json.dump(dns_records, f, indent=2, ensure_ascii=False)

print(f"Successfully generated 500 DNS records and saved to generate.json")