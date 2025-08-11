# DuckDB SQL Worksheet

A web-based SQL worksheet application powered by DuckDB WASM with automatic fallback to a local SQL engine.

## Features

- **DuckDB WASM Integration**: Full SQL capabilities with WebAssembly-powered DuckDB
- **Intelligent Fallback**: Automatic fallback to SimpleSQL when WASM unavailable
- **SQL Editor**: Multi-line SQL query editor with keyboard shortcuts
- **Results Display**: Formatted table output for query results
- **Error Handling**: Clear, informative error messages
- **Keyboard Shortcuts**: Ctrl+Enter to execute queries
- **Resource Management**: Automatic cleanup of WASM connections

## SQL Engine Support

### DuckDB WASM (Primary Engine)
When successfully loaded, provides full DuckDB capabilities:

- **All Standard SQL**: Complete SQL-92 support with extensions
- **Advanced Analytics**: Window functions, complex aggregations
- **Data Import**: CSV, JSON, Parquet file processing
- **Complex Types**: Arrays, structs, nested data
- **Functions**: 400+ built-in functions
- **Performance**: Optimized columnar processing

### SimpleSQL (Fallback Engine)
Lightweight fallback for basic operations:

- **CREATE TABLE**: Define tables with typed columns
- **INSERT INTO**: Add single or multiple rows of data
- **SELECT**: Query data with column selection and WHERE filtering
- **DROP TABLE**: Remove tables from memory
- **WHERE clauses**: Basic comparisons (`=`, `>`, `<`, `>=`, `<=`, `!=`)

## Setup

1. **Start the development server**:
   ```bash
   npm run dev
   ```
   Or using Python:
   ```bash
   python3 -m http.server 8000
   ```

2. **Open in browser**:
   Navigate to `http://localhost:8000`

## Usage

1. Enter your SQL queries in the left panel
2. Click "Execute Query" or press Ctrl+Enter
3. View results in the right panel

## Example Queries

### Basic Operations (Both Engines)
```sql
-- Create a table
CREATE TABLE users (id INTEGER, name VARCHAR, age INTEGER);

-- Insert data (single or multiple rows)
INSERT INTO users VALUES 
  (1, 'John', 25), 
  (2, 'Jane', 30), 
  (3, 'Bob', 35);

-- Query data
SELECT * FROM users WHERE age > 25;
SELECT name, age FROM users WHERE age <= 30;

-- Drop table
DROP TABLE users;
```

### Advanced DuckDB Features (DuckDB WASM Only)
```sql
-- Window functions
SELECT name, age, 
       RANK() OVER (ORDER BY age DESC) as age_rank
FROM users;

-- JSON processing
SELECT json_extract(data, '$.name') as name 
FROM json_table;

-- Array operations
SELECT unnest(['apple', 'banana', 'cherry']) as fruits;

-- Aggregate functions
SELECT AVG(age) as avg_age, 
       MEDIAN(age) as median_age,
       STDDEV(age) as age_stddev 
FROM users;
```

### Engine Status Detection
The application automatically detects which engine is running:
- **"Ready - DuckDB WASM initialized"**: Full DuckDB capabilities available
- **"Ready - Using SimpleSQL fallback"**: Basic SQL operations only

## Architecture

### DuckDB WASM Engine (Primary)
- **Library**: `@duckdb/duckdb-wasm` via jsDelivr CDN
- **Worker-based**: Runs in Web Worker for non-blocking execution  
- **Bundle Loading**: Automatic detection and loading of optimized bundles
- **Connection Management**: Persistent connections with proper cleanup
- **Full SQL Support**: Complete DuckDB feature set

### SimpleSQL Engine (Fallback)
- **File**: `app.js` (SimpleSQL class)
- **Storage**: In-memory tables using JavaScript Map
- **Parsing**: Regex-based SQL parsing for basic operations
- **No Dependencies**: Completely self-contained fallback
- **Lightweight**: Minimal footprint for basic SQL operations

### Engine Selection Logic
1. **Primary**: Attempts DuckDB WASM initialization
2. **Fallback**: Automatically switches to SimpleSQL on WASM failure
3. **Transparent**: User interface adapts to available engine
4. **Status Display**: Clear indication of active engine

## Development

### Git Workflow
```bash
# DuckDB WASM integration branch
git checkout duckdb-wasm-integration

# Previous branch for SELECT validation improvements  
git checkout remove-select-validation

# View commit history
git log --oneline
```

### File Structure
```
├── index.html          # Main UI interface
├── app.js              # SQL engine and query execution
├── package.json        # Dependencies and scripts
├── README.md           # This file
└── .git/               # Git repository
```

## Troubleshooting

### CORS Issues
- Always use the development server (`npm run dev`)
- Don't open HTML files directly in browser
- Required for DuckDB WASM bundle loading from jsDelivr CDN

### DuckDB WASM Initialization
- **Success**: Shows "Ready - DuckDB WASM initialized" 
- **Fallback**: Shows "Ready - Using SimpleSQL fallback"
- Common fallback causes: Browser compatibility, network issues, CORS

### Query Limitations by Engine
- **DuckDB WASM**: Full SQL support, all features available
- **SimpleSQL Fallback**: Basic operations only, clear error messages for unsupported features
- Status bar shows which engine is active

## Browser Compatibility

### DuckDB WASM Requirements
- Modern browsers with WebAssembly support
- SharedArrayBuffer support (for threading)
- Chrome 68+, Firefox 79+, Safari 15.2+, Edge 79+

### SimpleSQL Fallback
- Any browser with JavaScript ES6+ support
- No WebAssembly required
- Works offline without external dependencies

## Performance

- **DuckDB WASM**: Optimized columnar processing, handles large datasets
- **SimpleSQL**: Fast for small datasets, in-memory operations
- Automatic engine selection ensures best available performance

## Contributing

The project uses a clean git workflow:
1. Feature branches for major changes
2. Descriptive commit messages  
3. Full DuckDB WASM integration with automatic fallback