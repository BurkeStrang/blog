#pragma once
#include <chrono>
#include <deque>
#include <optional>
#include <set>
#include <string>
#include <unordered_map>
#include <variant>

enum class DataType { String, Hash, List, Set };

using StringVal = std::string;
using HashVal   = std::unordered_map<std::string, std::string>;
using ListVal   = std::deque<std::string>;
using SetVal    = std::set<std::string>;
using StoreVal  = std::variant<StringVal, HashVal, ListVal, SetVal>;

struct Entry {
    StoreVal value;
    DataType type;
    std::optional<std::chrono::steady_clock::time_point> expires_at;

    bool expired() const {
        if (!expires_at) return false;
        return std::chrono::steady_clock::now() >= *expires_at;
    }
};
