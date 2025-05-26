# Create Large Data set


```python
import json
from datetime import datetime
```


```python
def gen_largecsv(filename, num_rows=10000):
    
    print(f"\nCreating large CSV with {num_rows} rows for performance testing...")
    
    base_json = {
        "user": {
            "name": "Test User",
            "age": 30,
            "address": {
                "street": "123 Test St",
                "city": "Test City",
                "state": "TS",
                "coordinates": {"lat": 40.7128, "lng": -74.0060}
            },
            "preferences": {
                "notifications": {"email": True, "sms": False, "push": True},
                "theme": "dark"
            }
        },
        "metadata": {
            "source": "test",
            "version": "1.0.0",
            "tags": ["test", "performance", "benchmark"]
        }
    }
    
    with open(filename, 'w') as f:
        f.write("id,create_dt,attrs\n")
        
        for i in range(1, num_rows + 1):
            # Modify JSON slightly for each row
            json_copy = json.loads(json.dumps(base_json))
            json_copy['user']['name'] = f"User {i}"
            json_copy['user']['age'] = 20 + (i % 50)
            json_copy['metadata']['tags'].append(f"id_{i}")
            
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            json_str = json.dumps(json_copy).replace('"', '""')
            
            f.write(f'{i},{timestamp},"{json_str}"\n')
    
    print(f"Large CSV created: {filename}")
```


```python
 csv10k = 'sample10k.csv'
 gen_largecsv(csv10k, num_rows=10000)
```

    
    Creating large CSV with 10000 rows for performance testing...
    Large CSV created: sample10k.csv



```python

```
