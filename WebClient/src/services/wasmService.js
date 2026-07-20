// WebClient/src/services/wasmService.js

let wasmModule = null;
let dsaInstance = null;

/**
 * Initialize the WebAssembly module.
 * We load SearchSortWasm.js which will automatically fetch SearchSortWasm.wasm
 */
export const initWasm = async () => {
    if (dsaInstance) return dsaInstance;

    return new Promise((resolve, reject) => {
        // Create a script tag to load the emscripten generated JS wrapper
        const script = document.createElement('script');
        script.src = '/wasm/SearchSortWasm.js';
        
        script.onload = () => {
            // The Emscripten wrapper exposes a global Module factory function (if configured correctly)
            // or automatically initializes. We will compile it with -s MODULARIZE=1 -s EXPORT_NAME="createWasmModule"
            if (window.createWasmModule) {
                window.createWasmModule().then((Module) => {
                    wasmModule = Module;
                    
                    // Instantiate the C++ class
                    dsaInstance = new Module.SearchSortModule();
                    resolve(dsaInstance);
                }).catch(reject);
            } else {
                reject(new Error("Wasm module factory 'createWasmModule' not found."));
            }
        };
        
        script.onerror = () => {
            reject(new Error("Failed to load Wasm JS wrapper."));
        };

        document.body.appendChild(script);
    });
};

/**
 * Get the initialized DSA instance.
 */
export const getDsaInstance = () => {
    if (!dsaInstance) throw new Error("Wasm DSA module not initialized yet!");
    return dsaInstance;
};

/**
 * Helper to convert JavaScript array of contacts to C++ VectorContact
 */
export const jsArrayToWasmVector = (jsArray) => {
    const wasmVector = new wasmModule.VectorContact();
    jsArray.forEach(contact => {
        const wasmContact = {
            phone: contact.phone || "",
            displayName: contact.displayName || contact.fullName || "",
            category: contact.category || "Other",
            isOnline: contact.isOnline || false
        };
        wasmVector.push_back(wasmContact);
    });
    return wasmVector;
};

/**
 * Helper to convert C++ VectorContact to JavaScript array
 */
export const wasmVectorToJsArray = (wasmVector) => {
    const jsArray = [];
    for (let i = 0; i < wasmVector.size(); i++) {
        jsArray.push(wasmVector.get(i));
    }
    return jsArray;
};
