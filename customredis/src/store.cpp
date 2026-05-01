#include "store.h"
#include <algorithm>
#include <chrono>
#include <stdexcept>

using namespace std::chrono;

// ─── helpers ──────────────────────────────────────────────────────────────────

Entry* Store::get_entry(const std::string& key) {
    auto it = data_.find(key);
    if (it == data_.end()) return nullptr;
    if (it->second.expired()) {
        data_.erase(it);
        return nullptr;
    }
    return &it->second;
}

static void type_error(DataType got, DataType want) {
    if (got != want)
        throw std::runtime_error("WRONGTYPE Operation against a key holding the wrong kind of value");
}

HashVal* Store::require_hash(const std::string& key) {
    auto it = data_.find(key);
    if (it == data_.end()) {
        data_[key] = Entry{HashVal{}, DataType::Hash, {}};
        return &std::get<HashVal>(data_[key].value);
    }
    if (it->second.expired()) {
        it->second = Entry{HashVal{}, DataType::Hash, {}};
        return &std::get<HashVal>(it->second.value);
    }
    type_error(it->second.type, DataType::Hash);
    return &std::get<HashVal>(it->second.value);
}

ListVal* Store::require_list(const std::string& key) {
    auto it = data_.find(key);
    if (it == data_.end()) {
        data_[key] = Entry{ListVal{}, DataType::List, {}};
        return &std::get<ListVal>(data_[key].value);
    }
    if (it->second.expired()) {
        it->second = Entry{ListVal{}, DataType::List, {}};
        return &std::get<ListVal>(it->second.value);
    }
    type_error(it->second.type, DataType::List);
    return &std::get<ListVal>(it->second.value);
}

SetVal* Store::require_set(const std::string& key) {
    auto it = data_.find(key);
    if (it == data_.end()) {
        data_[key] = Entry{SetVal{}, DataType::Set, {}};
        return &std::get<SetVal>(data_[key].value);
    }
    if (it->second.expired()) {
        it->second = Entry{SetVal{}, DataType::Set, {}};
        return &std::get<SetVal>(it->second.value);
    }
    type_error(it->second.type, DataType::Set);
    return &std::get<SetVal>(it->second.value);
}

bool Store::glob_match(const std::string& pat, const std::string& str) {
    size_t pi = 0, si = 0, star_pi = std::string::npos, star_si = 0;
    while (si < str.size()) {
        if (pi < pat.size() && (pat[pi] == '?' || pat[pi] == str[si])) {
            ++pi; ++si;
        } else if (pi < pat.size() && pat[pi] == '*') {
            star_pi = pi++;
            star_si = si;
        } else if (star_pi != std::string::npos) {
            pi = star_pi + 1;
            si = ++star_si;
        } else {
            return false;
        }
    }
    while (pi < pat.size() && pat[pi] == '*') ++pi;
    return pi == pat.size();
}

// ─── string ───────────────────────────────────────────────────────────────────

void Store::set(const std::string& key, const std::string& val, std::optional<int> ttl) {
    std::lock_guard lock(mu_);
    Entry e;
    e.value = val;
    e.type  = DataType::String;
    if (ttl) e.expires_at = steady_clock::now() + seconds(*ttl);
    data_[key] = std::move(e);
}

std::optional<std::string> Store::get(const std::string& key) {
    std::lock_guard lock(mu_);
    auto* e = get_entry(key);
    if (!e) return {};
    type_error(e->type, DataType::String);
    return std::get<StringVal>(e->value);
}

// ─── generic ──────────────────────────────────────────────────────────────────

int Store::del(const std::vector<std::string>& keys) {
    std::lock_guard lock(mu_);
    int count = 0;
    for (auto& k : keys) count += (int)data_.erase(k);
    return count;
}

bool Store::exists(const std::string& key) {
    std::lock_guard lock(mu_);
    auto* e = get_entry(key);
    return e != nullptr;
}

std::optional<DataType> Store::type(const std::string& key) {
    std::lock_guard lock(mu_);
    auto* e = get_entry(key);
    if (!e) return {};
    return e->type;
}

bool Store::expire(const std::string& key, int seconds_val) {
    std::lock_guard lock(mu_);
    auto* e = get_entry(key);
    if (!e) return false;
    e->expires_at = steady_clock::now() + seconds(seconds_val);
    return true;
}

int Store::ttl(const std::string& key) {
    std::lock_guard lock(mu_);
    auto* e = get_entry(key);
    if (!e) return -2;
    if (!e->expires_at) return -1;
    auto remaining = duration_cast<seconds>(*e->expires_at - steady_clock::now()).count();
    return remaining < 0 ? -2 : (int)remaining;
}

std::vector<std::string> Store::keys(const std::string& pattern) {
    std::lock_guard lock(mu_);
    std::vector<std::string> result;
    for (auto& [k, e] : data_) {
        if (!e.expired() && glob_match(pattern, k))
            result.push_back(k);
    }
    return result;
}

void Store::flushdb() {
    std::lock_guard lock(mu_);
    data_.clear();
}

// ─── hash ─────────────────────────────────────────────────────────────────────

int Store::hset(const std::string& key, const std::vector<std::pair<std::string, std::string>>& fields) {
    std::lock_guard lock(mu_);
    auto* h = require_hash(key);
    int added = 0;
    for (auto& [f, v] : fields) {
        added += (int)!h->count(f);
        (*h)[f] = v;
    }
    return added;
}

std::optional<std::string> Store::hget(const std::string& key, const std::string& field) {
    std::lock_guard lock(mu_);
    auto* e = get_entry(key);
    if (!e) return {};
    type_error(e->type, DataType::Hash);
    auto& h = std::get<HashVal>(e->value);
    auto it = h.find(field);
    if (it == h.end()) return {};
    return it->second;
}

std::vector<std::optional<std::string>> Store::hmget(const std::string& key, const std::vector<std::string>& fields) {
    std::lock_guard lock(mu_);
    std::vector<std::optional<std::string>> result;
    auto* e = get_entry(key);
    if (!e) {
        result.resize(fields.size());
        return result;
    }
    type_error(e->type, DataType::Hash);
    auto& h = std::get<HashVal>(e->value);
    for (auto& f : fields) {
        auto it = h.find(f);
        result.push_back(it != h.end() ? std::optional<std::string>{it->second} : std::nullopt);
    }
    return result;
}

std::vector<std::string> Store::hgetall(const std::string& key) {
    std::lock_guard lock(mu_);
    std::vector<std::string> result;
    auto* e = get_entry(key);
    if (!e) return result;
    type_error(e->type, DataType::Hash);
    for (auto& [f, v] : std::get<HashVal>(e->value)) {
        result.push_back(f);
        result.push_back(v);
    }
    return result;
}

int Store::hdel(const std::string& key, const std::vector<std::string>& fields) {
    std::lock_guard lock(mu_);
    auto* e = get_entry(key);
    if (!e) return 0;
    type_error(e->type, DataType::Hash);
    auto& h = std::get<HashVal>(e->value);
    int count = 0;
    for (auto& f : fields) count += (int)h.erase(f);
    return count;
}

bool Store::hexists(const std::string& key, const std::string& field) {
    std::lock_guard lock(mu_);
    auto* e = get_entry(key);
    if (!e) return false;
    type_error(e->type, DataType::Hash);
    return std::get<HashVal>(e->value).count(field) > 0;
}

std::vector<std::string> Store::hkeys(const std::string& key) {
    std::lock_guard lock(mu_);
    std::vector<std::string> result;
    auto* e = get_entry(key);
    if (!e) return result;
    type_error(e->type, DataType::Hash);
    for (auto& [f, _] : std::get<HashVal>(e->value)) result.push_back(f);
    return result;
}

std::vector<std::string> Store::hvals(const std::string& key) {
    std::lock_guard lock(mu_);
    std::vector<std::string> result;
    auto* e = get_entry(key);
    if (!e) return result;
    type_error(e->type, DataType::Hash);
    for (auto& [_, v] : std::get<HashVal>(e->value)) result.push_back(v);
    return result;
}

int Store::hlen(const std::string& key) {
    std::lock_guard lock(mu_);
    auto* e = get_entry(key);
    if (!e) return 0;
    type_error(e->type, DataType::Hash);
    return (int)std::get<HashVal>(e->value).size();
}

// ─── list ─────────────────────────────────────────────────────────────────────

int Store::lpush(const std::string& key, const std::vector<std::string>& vals) {
    std::lock_guard lock(mu_);
    auto* l = require_list(key);
    for (auto& v : vals) l->push_front(v);
    return (int)l->size();
}

int Store::rpush(const std::string& key, const std::vector<std::string>& vals) {
    std::lock_guard lock(mu_);
    auto* l = require_list(key);
    for (auto& v : vals) l->push_back(v);
    return (int)l->size();
}

std::optional<std::string> Store::lpop(const std::string& key) {
    std::lock_guard lock(mu_);
    auto* e = get_entry(key);
    if (!e) return {};
    type_error(e->type, DataType::List);
    auto& l = std::get<ListVal>(e->value);
    if (l.empty()) return {};
    auto val = l.front();
    l.pop_front();
    if (l.empty()) data_.erase(key);
    return val;
}

std::optional<std::string> Store::rpop(const std::string& key) {
    std::lock_guard lock(mu_);
    auto* e = get_entry(key);
    if (!e) return {};
    type_error(e->type, DataType::List);
    auto& l = std::get<ListVal>(e->value);
    if (l.empty()) return {};
    auto val = l.back();
    l.pop_back();
    if (l.empty()) data_.erase(key);
    return val;
}

std::vector<std::string> Store::lrange(const std::string& key, int start, int stop) {
    std::lock_guard lock(mu_);
    std::vector<std::string> result;
    auto* e = get_entry(key);
    if (!e) return result;
    type_error(e->type, DataType::List);
    auto& l = std::get<ListVal>(e->value);
    int len = (int)l.size();
    if (start < 0) start = std::max(0, len + start);
    if (stop  < 0) stop  = len + stop;
    stop = std::min(stop, len - 1);
    for (int i = start; i <= stop; ++i) result.push_back(l[i]);
    return result;
}

int Store::llen(const std::string& key) {
    std::lock_guard lock(mu_);
    auto* e = get_entry(key);
    if (!e) return 0;
    type_error(e->type, DataType::List);
    return (int)std::get<ListVal>(e->value).size();
}

// ─── set ──────────────────────────────────────────────────────────────────────

int Store::sadd(const std::string& key, const std::vector<std::string>& members) {
    std::lock_guard lock(mu_);
    auto* s = require_set(key);
    int count = 0;
    for (auto& m : members) count += (int)s->insert(m).second;
    return count;
}

int Store::srem(const std::string& key, const std::vector<std::string>& members) {
    std::lock_guard lock(mu_);
    auto* e = get_entry(key);
    if (!e) return 0;
    type_error(e->type, DataType::Set);
    auto& s = std::get<SetVal>(e->value);
    int count = 0;
    for (auto& m : members) count += (int)s.erase(m);
    if (s.empty()) data_.erase(key);
    return count;
}

std::vector<std::string> Store::smembers(const std::string& key) {
    std::lock_guard lock(mu_);
    std::vector<std::string> result;
    auto* e = get_entry(key);
    if (!e) return result;
    type_error(e->type, DataType::Set);
    for (auto& m : std::get<SetVal>(e->value)) result.push_back(m);
    return result;
}

int Store::scard(const std::string& key) {
    std::lock_guard lock(mu_);
    auto* e = get_entry(key);
    if (!e) return 0;
    type_error(e->type, DataType::Set);
    return (int)std::get<SetVal>(e->value).size();
}

bool Store::sismember(const std::string& key, const std::string& member) {
    std::lock_guard lock(mu_);
    auto* e = get_entry(key);
    if (!e) return false;
    type_error(e->type, DataType::Set);
    return std::get<SetVal>(e->value).count(member) > 0;
}
