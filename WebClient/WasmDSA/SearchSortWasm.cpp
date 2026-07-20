#include <emscripten/bind.h>
#include <string>
#include <vector>
#include <algorithm>
#include <iostream>

using namespace emscripten;

// Simple Contact struct for Wasm
struct WasmContact {
    std::string phone;
    std::string displayName;
    std::string category;
    bool isOnline;
};

class SearchSortModule {
private:
    std::vector<WasmContact> m_contacts;

    // Helper for case-insensitive string operations
    static std::string toLower(std::string s) {
        std::transform(s.begin(), s.end(), s.begin(), ::tolower);
        return s;
    }

public:
    SearchSortModule() {
        std::cout << "[Wasm C++] SearchSortModule initialized!" << std::endl;
    }

    // Load contacts into C++ memory
    void loadContacts(const std::vector<WasmContact>& contacts) {
        m_contacts = contacts;
        std::cout << "[Wasm C++] Loaded " << m_contacts.size() << " contacts into memory." << std::endl;
    }

    // O(n) Linear Search through all fields
    std::vector<WasmContact> search(const std::string& query) {
        std::vector<WasmContact> results;
        if (query.empty()) return m_contacts;
        
        std::string lowerQuery = toLower(query);
        for (const auto& c : m_contacts) {
            if (toLower(c.displayName).find(lowerQuery) != std::string::npos ||
                toLower(c.phone).find(lowerQuery) != std::string::npos ||
                toLower(c.category).find(lowerQuery) != std::string::npos) {
                results.push_back(c);
            }
        }
        return results;
    }

    // O(n log n) Sort
    std::vector<WasmContact> sortAlphabetically() {
        std::vector<WasmContact> sorted = m_contacts;
        std::sort(sorted.begin(), sorted.end(), [](const WasmContact& a, const WasmContact& b) {
            return toLower(a.displayName) < toLower(b.displayName);
        });
        return sorted;
    }
};

// Emscripten Bindings to expose C++ to JavaScript
EMSCRIPTEN_BINDINGS(connecthub_dsa) {
    // Expose the struct
    value_object<WasmContact>("WasmContact")
        .field("phone", &WasmContact::phone)
        .field("displayName", &WasmContact::displayName)
        .field("category", &WasmContact::category)
        .field("isOnline", &WasmContact::isOnline);
        
    // Expose std::vector<WasmContact> so JS can pass arrays
    register_vector<WasmContact>("VectorContact");

    // Expose the main module class
    class_<SearchSortModule>("SearchSortModule")
        .constructor<>()
        .function("loadContacts", &SearchSortModule::loadContacts)
        .function("search", &SearchSortModule::search)
        .function("sortAlphabetically", &SearchSortModule::sortAlphabetically);
}
