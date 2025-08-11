# DuckDB WASM Integration - Issues and Solutions

## Overview
This document summarizes the challenges encountered while integrating DuckDB WASM into a browser application and the solutions that ultimately worked.

## Final Working Architecture

```
Browser Application
├── Apache Arrow (script tag)
├── Import Map (dependency resolution)
├── DuckDB WASM (ES module → window.duckdb)
├── Proxy Worker (Blob URL)
│   └── importScripts(CDN Worker)
│       └── CDN WASM files
└── App Logic (uses window.duckdb)
```

## Issues Encountered and Solutions

### 1. ES Module Resolution
**Issue**: `Failed to resolve module specifier '@duckdb/duckdb-wasm'`

**Root Cause**: Browsers cannot resolve npm package names without explicit configuration.

**Failed Attempts**:
- Direct imports: `import('@duckdb/duckdb-wasm')`
- Relative path imports without dependency mapping

**Solution**: Added import map for all dependencies
```html
<script type="importmap">
{
  "imports": {
    "apache-arrow": "./node_modules/apache-arrow/Arrow.mjs",
    "flatbuffers": "./node_modules/flatbuffers/mjs/flatbuffers.js",
    "tslib": "./node_modules/tslib/tslib.es6.js"
  }
}
</script>
```

### 2. Dependency Chain Resolution
**Issue**: Multiple "Failed to resolve module specifier" errors for transitive dependencies.

**Dependencies Discovered**:
```
DuckDB WASM
    ↓ imports
Apache Arrow  
    ↓ imports
├── FlatBuffers
└── TSLib
```

**Solution**: Mapped entire dependency chain in import map with correct file paths.

### 3. CommonJS vs ES Module Conflicts
**Issue**: `Uncaught ReferenceError: exports is not defined`

**Root Cause**: Loading Apache Arrow's CommonJS `.js` file in browser environment.

**Failed Approach**: 
```html
<script src="./node_modules/apache-arrow/Arrow.js"></script> <!-- CommonJS -->
```

**Solution**: Use ES module version only through import map:
```json
"apache-arrow": "./node_modules/apache-arrow/Arrow.mjs"
```

### 4. Cross-Origin Worker Security Error
**Issue**: `SecurityError: Script at 'https://cdn.jsdelivr.net/...' cannot be accessed from origin 'http://localhost:8080'`

**Root Cause**: DuckDB trying to create workers from CDN URLs, blocked by same-origin policy.

**Failed Attempts**:
- Using local worker files (MIME type issues)
- Using CDN workers directly (CORS blocked)
- Hybrid approaches (dependency resolution issues)

**Final Solution**: Proxy worker pattern
```javascript
// Create local proxy worker that imports CDN worker
const workerScript = `importScripts('${bundle.mainWorker}');`;
const blob = new Blob([workerScript], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(blob);
const worker = new Worker(workerUrl);
```

### 5. WASM MIME Type Issues
**Issue**: `Failed to execute 'compile' on 'WebAssembly': Incorrect response MIME type`

**Root Cause**: Local server not serving WASM files with proper `application/wasm` MIME type.

**Failed Attempts**:
- Custom Python server with MIME type handling
- Various header configurations
- Local WASM file serving

**Solution**: Use CDN WASM files which have guaranteed correct MIME types:
```javascript
const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles(); // CDN URLs
const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
```

### 6. Module Loading Timing Issues
**Issue**: App initialization failing because modules loaded after DOM ready event.

**Root Cause**: Dynamic script loading after `DOMContentLoaded` event already fired.

**Failed Approach**:
```javascript
document.addEventListener('DOMContentLoaded', initApp); // Never fires
```

**Solution**: Check DOM state and initialize appropriately:
```javascript
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp(); // DOM already ready
}
```

### 7. Global Object Assignment Timing
**Issue**: `window.duckdb` undefined when app tries to use it.

**Solution**: ES module assigns to global and triggers app loading:
```javascript
import * as duckdbWasm from './node_modules/@duckdb/duckdb-wasm/dist/duckdb-browser.mjs';
window.duckdb = duckdbWasm;

// Load app after DuckDB is available
const script = document.createElement('script');
script.src = 'app.js';
document.body.appendChild(script);
```

## Final Working Implementation

### HTML Structure
```html
<script type="importmap">
{
  "imports": {
    "apache-arrow": "./node_modules/apache-arrow/Arrow.mjs",
    "flatbuffers": "./node_modules/flatbuffers/mjs/flatbuffers.js", 
    "tslib": "./node_modules/tslib/tslib.es6.js"
  }
}
</script>
<script type="module">
  import * as duckdbWasm from './node_modules/@duckdb/duckdb-wasm/dist/duckdb-browser.mjs';
  window.duckdb = duckdbWasm;
  
  // Load app after DuckDB is ready
  const script = document.createElement('script');
  script.src = 'app.js';
  document.body.appendChild(script);
</script>
```

### App Initialization
```javascript
// Use CDN bundles for reliability
const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

// Create proxy worker to avoid CORS
const workerScript = `importScripts('${bundle.mainWorker}');`;
const blob = new Blob([workerScript], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(blob);
const worker = new Worker(workerUrl);

// Initialize DuckDB
const logger = new duckdb.ConsoleLogger();
const db = new duckdb.AsyncDuckDB(logger, worker);
await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
```

## Key Learnings

1. **ES Module Complexity**: Modern libraries have complex dependency chains requiring explicit mapping
2. **CORS Restrictions**: Cross-origin workers are heavily restricted, requiring creative workarounds  
3. **MIME Type Importance**: WASM requires exact `application/wasm` MIME type for compilation
4. **Timing is Critical**: Module loading, DOM ready, and app initialization must be carefully sequenced
5. **Hybrid Approaches Work**: Combining local modules with CDN resources can solve multiple issues
6. **Proxy Pattern**: Blob URLs can create same-origin workers that import cross-origin scripts

## Files Modified

- `index.html` - Added import map and ES module loading
- `debug.html` - Test page with same fixes
- `app.js` - Updated to use global DuckDB object and proxy worker
- `server.py` - Custom HTTP server (ultimately not needed for final solution)

## Result

✅ **DuckDB WASM loads successfully**  
✅ **All dependencies resolve properly**  
✅ **Workers function without CORS issues**  
✅ **WASM compiles with correct MIME types**  
✅ **Full DuckDB functionality available**  
✅ **Fallback still works if needed**  

The application now successfully loads DuckDB WASM and provides full SQL capabilities including advanced features like JSON processing, array operations, and complex aggregations.